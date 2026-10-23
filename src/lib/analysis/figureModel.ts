import type { Keypoints, LevelId } from "../types";

/** 일러스트용 정규화 비율(전신 높이 = 1). measured=false 면 기본값으로 그린 부분 */
export interface FigureModel {
  y: Record<LevelId | "knee", number>;
  half: { head: number; neck: number; shoulder: number; waist: number; hip: number };
  measured: Record<string, boolean>;
}

/** 측정값이 없을 때 쓰는 중립적인 기본 비율(약 7.5등신). 수치로 표시하지 않고 그림에만 사용 */
export const DEFAULT_FIGURE: FigureModel = {
  y: { headTop: 0, chin: 0.133, neckBase: 0.172, shoulder: 0.19, waist: 0.385, hip: 0.5, crotch: 0.515, knee: 0.73, floor: 1 },
  half: { head: 0.054, neck: 0.027, shoulder: 0.112, waist: 0.074, hip: 0.104 },
  measured: {},
};

export function figureFromKeypoints(kp: Keypoints | null): FigureModel {
  if (!kp) return DEFAULT_FIGURE;
  const top = kp.levels.headTop.y;
  const floor = kp.levels.floor.y;
  if (top === null || floor === null || floor - top <= 0) return DEFAULT_FIGURE;
  const Ht = floor - top;
  const f = structuredCloneSafe(DEFAULT_FIGURE);
  const norm = (v: number) => (v - top) / Ht;
  for (const id of Object.keys(kp.levels) as LevelId[]) {
    const v = kp.levels[id].y;
    if (v !== null) {
      f.y[id] = norm(v);
      f.measured[id] = true;
    }
  }
  const { kneeL, kneeR } = kp.joints;
  if (kneeL && kneeR) {
    f.y.knee = norm((kneeL.y + kneeR.y) / 2);
    f.measured.knee = true;
  }
  for (const k of ["neck", "shoulder", "waist", "hip"] as const) {
    const s = kp.widths[k];
    if (s) {
      f.half[k] = (s.right - s.left) / 2 / Ht;
      f.measured[`w_${k}`] = true;
    }
  }
  if (kp.face) {
    f.half.head = Math.abs(kp.face.right.x - kp.face.left.x) / 2 / Ht;
    f.measured.w_head = true;
  }
  // 순서가 꼬인 수동 입력이 있어도 그림이 깨지지 않도록 단조 증가 보정
  const order: (LevelId | "knee")[] = ["headTop", "chin", "neckBase", "shoulder", "waist", "hip", "crotch", "knee", "floor"];
  for (let i = 1; i < order.length; i++) {
    if (f.y[order[i]] <= f.y[order[i - 1]]) f.y[order[i]] = f.y[order[i - 1]] + 0.005;
  }
  return f;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Catmull-Rom → 3차 베지어 경로 */
export function smoothPath(points: [number, number][], closed = false): string {
  if (points.length < 2) return "";
  const p = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  let d = `M${p[1][0].toFixed(2)},${p[1][1].toFixed(2)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return closed ? d + " Z" : d;
}
