import type { QualityIssue } from "../types";

/** RGBA → 그레이스케일(0~255) */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Float32Array {
  const g = new Float32Array(width * height);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) {
    g[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return g;
}

export function meanBrightness(gray: Float32Array): number {
  let s = 0;
  for (let i = 0; i < gray.length; i++) s += gray[i];
  return gray.length ? s / gray.length : 0;
}

/** 과다·과소 노출 픽셀 비율 */
export function clippedRatio(gray: Float32Array): { dark: number; bright: number } {
  let d = 0;
  let b = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < 15) d++;
    else if (gray[i] > 245) b++;
  }
  return { dark: d / gray.length, bright: b / gray.length };
}

/** 라플라시안 분산 – 값이 작을수록 흐림(초점 불량/흔들림) */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/** 경험적 기준값 – 256px 축소 그레이 이미지 기준. 절대 기준이 아닌 재촬영 안내용 */
export const QUALITY_THRESHOLDS = {
  minShortSide: 480,
  darkMean: 55,
  brightMean: 225,
  clippedMax: 0.35,
  blurVar: 35,
};

export function assessImageQuality(params: {
  width: number;
  height: number;
  gray: Float32Array; // 축소본
  grayW: number;
  grayH: number;
  originalShortSide: number;
}): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const t = QUALITY_THRESHOLDS;
  if (params.originalShortSide < t.minShortSide) {
    issues.push({
      code: "lowResolution",
      level: "warn",
      retake: true,
      message: `해상도가 낮습니다(짧은 변 ${params.originalShortSide}px). 짧은 변 ${t.minShortSide}px 이상으로 촬영해 주세요.`,
    });
  }
  const mean = meanBrightness(params.gray);
  const clip = clippedRatio(params.gray);
  if (mean < t.darkMean || clip.dark > t.clippedMax) {
    issues.push({
      code: "tooDark",
      level: "warn",
      retake: true,
      message: "사진이 어둡습니다. 정면에서 빛이 들어오는 밝은 곳에서 다시 촬영해 주세요.",
    });
  } else if (mean > t.brightMean || clip.bright > t.clippedMax) {
    issues.push({
      code: "tooBright",
      level: "warn",
      retake: true,
      message: "빛이 과하게 들어와 윤곽이 날아갔습니다. 역광·직사광을 피해 주세요.",
    });
  }
  const lv = laplacianVariance(params.gray, params.grayW, params.grayH);
  if (lv < t.blurVar) {
    issues.push({
      code: "blurry",
      level: "warn",
      retake: true,
      message: "사진이 흐리거나 흔들렸습니다. 타이머·거치대를 사용해 초점을 맞춰 주세요.",
    });
  }
  return issues;
}
