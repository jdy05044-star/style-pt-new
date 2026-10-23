import type {
  BinaryMask,
  BodyDetection,
  Keypoints,
  LandmarkPx,
  Level,
  LevelId,
  LevelOverrides,
  Pt,
  QualityIssue,
  WidthSpan,
} from "../types";
import { LEVEL_IDS } from "../types";
import { FACE, POSE } from "./landmarkIndex";
import { firstGapInColumn, firstYInColumn, lowestY, runAt, subtract } from "../mask/mask";

const VIS = 0.5;

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function visible(lm: LandmarkPx[] | null, i: number, min = VIS): LandmarkPx | undefined {
  const p = lm?.[i];
  return p && p.visibility >= min ? p : undefined;
}

function missing(id: LevelId, note: string): Level {
  return { id, y: null, source: "missing", confidence: 0, note };
}

function auto(id: LevelId, y: number, confidence: number, note?: string): Level {
  return { id, y, source: "auto", confidence, note };
}

/**
 * 포즈 랜드마크 + 실루엣 마스크로 측정 기준선과 폭을 산출합니다.
 * - 자동 검출이 불가능하면 추측하지 않고 source:"missing" 으로 둡니다.
 * - overrides 로 사용자가 드래그한 값을 반영합니다(source:"manual").
 */
export function computeKeypoints(
  det: BodyDetection,
  W: number,
  H: number,
  overrides: LevelOverrides = {},
): Keypoints {
  const pose = det.pose;
  const warnings: QualityIssue[] = [];
  const person = det.personMask;
  const body: BinaryMask | null = person ? subtract(person, det.hairMask) : null;

  const sL = visible(pose, POSE.leftShoulder);
  const sR = visible(pose, POSE.rightShoulder);
  const hL = visible(pose, POSE.leftHip);
  const hR = visible(pose, POSE.rightHip);
  const kL = visible(pose, POSE.leftKnee);
  const kR = visible(pose, POSE.rightKnee);
  const aL = visible(pose, POSE.leftAnkle);
  const aR = visible(pose, POSE.rightAnkle);
  const nose = visible(pose, POSE.nose);

  const shoulderMid = sL && sR ? mid(sL, sR) : undefined;
  const hipMid = hL && hR ? mid(hL, hR) : undefined;

  const midlineAt = (y: number): number => {
    if (shoulderMid && hipMid) {
      if (y <= shoulderMid.y) return nose && y < shoulderMid.y ? lerpX(nose, shoulderMid, y) : shoulderMid.x;
      if (y >= hipMid.y) return hipMid.x;
      return lerpX(shoulderMid, hipMid, y);
    }
    return shoulderMid?.x ?? hipMid?.x ?? nose?.x ?? W / 2;
  };

  const faceLm = det.face?.landmarks;
  const face = faceLm
    ? {
        left: faceLm[FACE.rightCheek], // 화면 왼쪽
        right: faceLm[FACE.leftCheek], // 화면 오른쪽
        top: faceLm[FACE.top],
        chin: faceLm[FACE.chin],
      }
    : undefined;

  // ── 자동 기준선 ──────────────────────────────────────────────
  const levels = {} as Record<LevelId, Level>;

  // 머리 꼭대기: 코 주변 열에서 사람 마스크가 처음 시작되는 y (머리카락 볼륨 포함)
  if (person && nose) {
    const eyeL = visible(pose, POSE.leftEye);
    const eyeR = visible(pose, POSE.rightEye);
    const half = eyeL && eyeR ? Math.abs(eyeL.x - eyeR.x) * 0.6 : W * 0.01;
    let top: number | null = null;
    for (let dx = -half; dx <= half; dx += Math.max(1, half / 6)) {
      const y = firstYInColumn(person, nose.x + dx, 0, nose.y, W, H);
      if (y !== null && (top === null || y < top)) top = y;
    }
    if (top === null) levels.headTop = missing("headTop", "머리 윤곽을 찾지 못했습니다.");
    else if (top <= H * 0.005)
      levels.headTop = auto("headTop", top, 0.2, "머리 윗부분이 사진 밖으로 잘렸을 수 있습니다.");
    else levels.headTop = auto("headTop", top, 0.75, "머리카락 볼륨이 포함된 높이입니다.");
  } else {
    levels.headTop = missing("headTop", person ? "얼굴(코)이 인식되지 않았습니다." : "실루엣 마스크가 없습니다.");
  }

  // 턱끝: 얼굴 랜드마크 152
  levels.chin = face
    ? auto("chin", face.chin.y, det.face?.fromCrop ? 0.75 : 0.85)
    : missing("chin", "전신 사진에서 얼굴 랜드마크를 찾지 못했습니다. 턱선을 직접 지정해 주세요.");

  // 어깨선: 어깨 관절 중심 높이
  levels.shoulder =
    sL && sR
      ? auto("shoulder", (sL.y + sR.y) / 2, Math.min(sL.visibility, sR.visibility))
      : missing("shoulder", "양쪽 어깨가 모두 인식되지 않았습니다.");

  // 엉덩이 관절(대퇴골두 근처) – 내부 계산용
  const hipJointY = hL && hR ? (hL.y + hR.y) / 2 : null;
  const S = levels.shoulder.y;

  // 가랑이점: 골반 중심 아래로 내려가며 다리 사이 틈이 처음 생기는 지점
  const kneeY = kL && kR ? (kL.y + kR.y) / 2 : null;
  if (person && hipMid && kneeY !== null) {
    const y = firstGapInColumn(person, hipMid.x, hipMid.y, kneeY, W, H, W * 0.003);
    levels.crotch =
      y !== null
        ? auto("crotch", y, 0.6, "옷의 주름·밑위에 따라 실제보다 낮게 잡힐 수 있습니다.")
        : missing("crotch", "다리 사이 간격이 보이지 않습니다(치마·붙인 다리). 직접 지정해 주세요.");
  } else {
    levels.crotch = missing("crotch", "골반·무릎 인식이 부족합니다.");
  }

  // 허리선: 어깨~엉덩이관절 사이에서 몸통 폭이 가장 좁은 높이
  if (body && S !== null && hipJointY !== null) {
    const seg = hipJointY - S;
    const r = scanWidths(body, midlineAt, S + seg * 0.3, hipJointY - seg * 0.05, W, H);
    levels.waist = r.min
      ? auto("waist", r.min.y, 0.6, "옷 실루엣 기준의 '가장 좁은 높이'입니다. 실제 허리선과 다르면 조정해 주세요.")
      : missing("waist", "몸통 윤곽을 찾지 못했습니다.");
  } else {
    levels.waist = missing("waist", "어깨·골반 또는 실루엣 마스크가 없습니다.");
  }

  // 골반(힙)선: 엉덩이관절 주변~가랑이 위에서 폭이 가장 넓은 높이
  if (body && S !== null && hipJointY !== null) {
    const seg = hipJointY - S;
    const end = levels.crotch.y !== null ? levels.crotch.y - H * 0.003 : hipJointY + seg * 0.3;
    const r = scanWidths(body, midlineAt, hipJointY - seg * 0.2, end, W, H);
    levels.hip = r.max
      ? auto("hip", r.max.y, 0.6)
      : missing("hip", "골반 윤곽을 찾지 못했습니다.");
  } else {
    levels.hip = missing("hip", "골반 또는 실루엣 마스크가 없습니다.");
  }

  // 바닥(발바닥): 발 랜드마크 최하단과 마스크 최하단 비교
  const footYs = [POSE.leftHeel, POSE.rightHeel, POSE.leftFootIndex, POSE.rightFootIndex, POSE.leftAnkle, POSE.rightAnkle]
    .map((i) => visible(pose, i))
    .filter(Boolean) as LandmarkPx[];
  if (footYs.length >= 2) {
    let floor = Math.max(...footYs.map((p) => p.y));
    if (person && aL && aR) {
      const span = Math.abs(aL.x - aR.x);
      const mY = lowestY(person, W, H, Math.min(aL.x, aR.x) - span, Math.max(aL.x, aR.x) + span);
      if (mY !== null && mY >= floor && mY - floor < H * 0.05) floor = mY;
    }
    levels.floor =
      floor >= H * 0.995
        ? auto("floor", floor, 0.25, "발끝이 사진 아래로 잘렸을 수 있습니다.")
        : auto("floor", floor, 0.8, "신발·양말 두께가 포함될 수 있습니다.");
  } else {
    levels.floor = missing("floor", "발이 인식되지 않았습니다.");
  }

  // 목 밑(목-어깨 경계): 턱 아래에서 폭이 가장 좁은 곳 이후 급격히 넓어지는 지점
  levels.neckBase = missing("neckBase", "목 경계를 찾지 못했습니다. 직접 지정해 주세요.");
  if (body && levels.chin.y !== null && S !== null && S > levels.chin.y) {
    const c = levels.chin.y;
    let minW = Infinity;
    let minY = c;
    const step = Math.max(1, (S - c) / 60);
    for (let y = c + step; y < S; y += step) {
      const run = runAt(body, midlineAt(y), y, W, H);
      if (!run) continue;
      const w = run.right - run.left;
      if (w < minW) {
        minW = w;
        minY = y;
      }
    }
    if (Number.isFinite(minW)) {
      for (let y = minY; y < S; y += step) {
        const run = runAt(body, midlineAt(y), y, W, H);
        if (run && run.right - run.left > minW * 1.6) {
          levels.neckBase = auto(
            "neckBase",
            y,
            0.45,
            "목과 승모근이 만나는 윤곽 변곡점입니다. 옷깃·머리카락에 따라 오차가 큽니다.",
          );
          break;
        }
      }
    }
  }

  // ── 사용자 보정 반영 ─────────────────────────────────────────
  for (const id of LEVEL_IDS) {
    const v = overrides[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      levels[id] = { id, y: clamp(v, 0, H), source: "manual", confidence: 1 };
    }
  }

  // ── 폭 측정 ────────────────────────────────────────────────
  const widths: Keypoints["widths"] = {};
  if (body) {
    const at = (y: number | null): WidthSpan | undefined => {
      if (y === null) return undefined;
      const run = runAt(body, midlineAt(y), y, W, H, W * 0.01);
      return run ? { left: run.left, right: run.right, y } : undefined;
    };
    widths.shoulder = at(levels.shoulder.y);
    widths.waist = at(levels.waist.y);
    widths.hip = at(levels.hip.y);
    if (levels.chin.y !== null && levels.neckBase.y !== null && levels.neckBase.y > levels.chin.y) {
      widths.neck = at(levels.chin.y + (levels.neckBase.y - levels.chin.y) * 0.5);
    }
  }

  // 팔이 몸통에 붙어 폭이 부풀려졌는지 검사
  const armPts = [POSE.leftElbow, POSE.rightElbow, POSE.leftWrist, POSE.rightWrist]
    .map((i) => visible(pose, i))
    .filter(Boolean) as LandmarkPx[];
  for (const key of ["waist", "hip"] as const) {
    const span = widths[key];
    if (!span) continue;
    const tol = H * 0.04;
    const touching = armPts.some(
      (p) => Math.abs(p.y - span.y) < tol && p.x > span.left - W * 0.005 && p.x < span.right + W * 0.005,
    );
    if (touching) {
      warnings.push({
        code: `armsTouching_${key}`,
        level: "warn",
        retake: true,
        message: `${key === "waist" ? "허리" : "골반"} 높이에서 팔이 몸통에 붙어 있어 폭이 실제보다 넓게 잡혔을 수 있습니다. 팔을 30° 정도 벌려 다시 촬영해 주세요.`,
      });
      if (levels[key].source === "auto") levels[key] = { ...levels[key], confidence: Math.min(levels[key].confidence, 0.3) };
    }
  }

  // ── 어깨 경사: 목 옆 ~ 어깨 끝 사이의 윗윤곽 두 점 ─────────────
  let shoulderSlope: Keypoints["shoulderSlope"];
  if (body && widths.neck && widths.shoulder && levels.shoulder.y !== null) {
    const top = levels.chin.y ?? levels.shoulder.y - (widths.shoulder.right - widths.shoulder.left) * 0.5;
    const bottom = levels.shoulder.y + (widths.shoulder.right - widths.shoulder.left) * 0.1;
    const side = (neckEdge: number, shEdge: number): [Pt, Pt] | undefined => {
      const xIn = neckEdge + (shEdge - neckEdge) * 0.2;
      const xOut = neckEdge + (shEdge - neckEdge) * 0.75;
      const yIn = firstYInColumn(body, xIn, top, bottom, W, H);
      const yOut = firstYInColumn(body, xOut, top, bottom, W, H);
      return yIn !== null && yOut !== null ? [{ x: xIn, y: yIn }, { x: xOut, y: yOut }] : undefined;
    };
    shoulderSlope = {
      L: side(widths.neck.left, widths.shoulder.left),
      R: side(widths.neck.right, widths.shoulder.right),
    };
  }

  const p = (lm?: LandmarkPx): Pt | undefined => (lm ? { x: lm.x, y: lm.y } : undefined);

  return {
    levels,
    widths,
    midlineAt,
    joints: {
      shoulderL: p(sL),
      shoulderR: p(sR),
      hipL: p(hL),
      hipR: p(hR),
      kneeL: p(kL),
      kneeR: p(kR),
      ankleL: p(aL),
      ankleR: p(aR),
    },
    face,
    shoulderSlope,
    warnings,
  };
}

function lerpX(a: Pt, b: Pt, y: number): number {
  if (b.y === a.y) return a.x;
  const t = (y - a.y) / (b.y - a.y);
  return a.x + (b.x - a.x) * Math.max(0, Math.min(1, t));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function scanWidths(
  mask: BinaryMask,
  midlineAt: (y: number) => number,
  y0: number,
  y1: number,
  W: number,
  H: number,
): { min?: WidthSpan; max?: WidthSpan } {
  let min: WidthSpan | undefined;
  let max: WidthSpan | undefined;
  if (y1 <= y0) return {};
  const step = Math.max(1, (y1 - y0) / 80);
  for (let y = y0; y <= y1; y += step) {
    const run = runAt(mask, midlineAt(y), y, W, H, W * 0.01);
    if (!run) continue;
    const span = { left: run.left, right: run.right, y };
    const w = run.right - run.left;
    if (!min || w < min.right - min.left) min = span;
    if (!max || w > max.right - max.left) max = span;
  }
  return { min, max };
}
