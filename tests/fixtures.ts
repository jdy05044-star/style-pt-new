import type { BinaryMask, BodyDetection, LandmarkPx } from "../src/lib/types";
import { POSE } from "../src/lib/analysis/landmarkIndex";

/**
 * 합성 테스트 인체(W=400, H=1000).
 * 알려진 치수로 그린 실루엣이므로 측정값을 정확히 검증할 수 있습니다.
 *  머리 100~220 (반폭 40) · 목 220~250 (반폭 18) · 어깨 250~300 (반폭 80, 250~260 경사)
 *  몸통 300~560: 허리 420 에서 반폭 50, 골반 520 에서 반폭 75
 *  다리 560~980: 각 다리 x=[130,195], [205,270] → 가랑이 틈 x=200 은 560 부터
 */
export const W = 400;
export const H = 1000;

export function makeMask(opts: { armsTouching?: boolean; legsTogether?: boolean } = {}): BinaryMask {
  const data = new Uint8Array(W * H);
  const fill = (y: number, x0: number, x1: number) => {
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, Math.round(x1)); x++) data[y * W + x] = 1;
  };
  const cx = 200;
  for (let y = 100; y < 980; y++) {
    if (y < 220) {
      const t = (y - 160) / 60;
      // 턱 아래쪽은 목 실루엣(반폭 18)이 이어져 보이는 것을 재현
      let hw = 40 * Math.sqrt(Math.max(0, 1 - t * t));
      if (y > 160) hw = Math.max(hw, 18);
      fill(y, cx - hw, cx + hw);
    } else if (y < 250) fill(y, cx - 18, cx + 18);
    else if (y < 300) {
      // 목 옆에서 어깨 끝으로 내려가는 경사: y=250 에서 반폭 18 → y=270 에서 반폭 80
      const hw = y < 270 ? 18 + ((y - 250) / 20) * 62 : 80;
      fill(y, cx - hw, cx + hw);
    } else if (y < 560) {
      let hw: number;
      if (y <= 420) hw = 80 - ((y - 300) / 120) * 30; // 80 → 50
      else if (y <= 520) hw = 50 + ((y - 420) / 100) * 25; // 50 → 75
      else hw = 75;
      fill(y, cx - hw, cx + hw);
      if (opts.armsTouching && y > 320 && y < 560) {
        fill(y, cx - hw - 20, cx - hw);
        fill(y, cx + hw, cx + hw + 20);
      }
    } else {
      if (opts.legsTogether) fill(y, 130, 270);
      else {
        fill(y, 130, 195);
        fill(y, 205, 270);
      }
    }
  }
  return { width: W, height: H, data };
}

export function makePose(over: Partial<Record<number, Partial<LandmarkPx>>> = {}): LandmarkPx[] {
  const lm: LandmarkPx[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  const set = (i: number, x: number, y: number, z = 0) => (lm[i] = { x, y, z, visibility: 0.99 });
  set(POSE.nose, 200, 170);
  set(POSE.leftEye, 215, 155);
  set(POSE.rightEye, 185, 155);
  set(POSE.leftEar, 238, 160);
  set(POSE.rightEar, 162, 160);
  // 화면 오른쪽 = 사람의 왼쪽
  set(POSE.leftShoulder, 260, 280);
  set(POSE.rightShoulder, 140, 280);
  set(POSE.leftElbow, 320, 420);
  set(POSE.rightElbow, 80, 420);
  set(POSE.leftWrist, 340, 560);
  set(POSE.rightWrist, 60, 560);
  set(POSE.leftHip, 240, 540);
  set(POSE.rightHip, 160, 540);
  set(POSE.leftKnee, 238, 760);
  set(POSE.rightKnee, 162, 760);
  set(POSE.leftAnkle, 236, 960);
  set(POSE.rightAnkle, 164, 960);
  set(POSE.leftHeel, 236, 975);
  set(POSE.rightHeel, 164, 975);
  set(POSE.leftFootIndex, 245, 978);
  set(POSE.rightFootIndex, 155, 978);
  for (const [k, v] of Object.entries(over)) lm[Number(k)] = { ...lm[Number(k)], ...v };
  return lm;
}

/** 478점 얼굴 – 사용하는 인덱스만 의미 있는 값 */
export function makeFace(): LandmarkPx[] {
  const lm: LandmarkPx[] = Array.from({ length: 478 }, () => ({ x: 200, y: 160, z: 0, visibility: 1 }));
  const s = (i: number, x: number, y: number) => (lm[i] = { x, y, z: 0, visibility: 1 });
  s(10, 200, 112); // 얼굴 메시 상단
  s(152, 200, 218); // 턱
  s(454, 236, 165);
  s(234, 164, 165);
  s(1, 200, 180);
  s(263, 222, 152);
  s(33, 178, 152);
  s(251, 228, 125);
  s(21, 172, 125);
  s(365, 222, 205);
  s(136, 178, 205);
  return lm;
}

export function makeDetection(opts: Parameters<typeof makeMask>[0] & { noFace?: boolean } = {}): BodyDetection {
  return {
    pose: makePose(),
    worldPose: null,
    personMask: makeMask(opts),
    hairMask: null,
    face: opts.noFace ? null : { landmarks: makeFace(), fromCrop: true },
  };
}
