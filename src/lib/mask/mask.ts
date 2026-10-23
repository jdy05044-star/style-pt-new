import type { BinaryMask } from "../types";

/** float 신뢰도 배열 → 이진 마스크 */
export function maskFromFloat(
  values: Float32Array | number[],
  width: number,
  height: number,
  threshold = 0.5,
): BinaryMask {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = values[i] >= threshold ? 1 : 0;
  return { width, height, data };
}

/** 카테고리 마스크에서 특정 클래스만 추출 */
export function maskFromCategory(
  categories: Uint8Array,
  width: number,
  height: number,
  classes: number[],
): BinaryMask {
  const set = new Set(classes);
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = set.has(categories[i]) ? 1 : 0;
  return { width, height, data };
}

/** 마스크 해상도가 이미지와 다를 수 있으므로 이미지 좌표로 조회 */
export function sample(mask: BinaryMask, x: number, y: number, imgW: number, imgH: number): number {
  const mx = Math.floor((x / imgW) * mask.width);
  const my = Math.floor((y / imgH) * mask.height);
  if (mx < 0 || my < 0 || mx >= mask.width || my >= mask.height) return 0;
  return mask.data[my * mask.width + mx];
}

/** a AND NOT b (예: 사람 마스크에서 머리카락 제외) */
export function subtract(a: BinaryMask, b: BinaryMask | null): BinaryMask {
  if (!b) return a;
  const data = new Uint8Array(a.width * a.height);
  for (let y = 0; y < a.height; y++) {
    const by = Math.min(b.height - 1, Math.floor((y / a.height) * b.height));
    for (let x = 0; x < a.width; x++) {
      const bx = Math.min(b.width - 1, Math.floor((x / a.width) * b.width));
      const i = y * a.width + x;
      data[i] = a.data[i] && !b.data[by * b.width + bx] ? 1 : 0;
    }
  }
  return { width: a.width, height: a.height, data };
}

export interface Run {
  left: number;
  right: number;
}

/**
 * 이미지 좌표 (x, y) 를 포함하는 가로 방향 연속 구간(이미지 좌표).
 * x 가 마스크 밖이면 ±searchPx 안에서 가장 가까운 마스크 픽셀을 시작점으로 씁니다.
 * 팔이 몸통과 떨어져 있으면 몸통만, 붙어 있으면 팔까지 포함됩니다.
 */
export function runAt(
  mask: BinaryMask,
  x: number,
  y: number,
  imgW: number,
  imgH: number,
  searchPx = 4,
): Run | null {
  const sx = imgW / mask.width;
  const my = Math.floor((y / imgH) * mask.height);
  if (my < 0 || my >= mask.height) return null;
  const row = my * mask.width;
  let mx = Math.floor(x / sx);
  const searchM = Math.max(1, Math.round(searchPx / sx));
  if (mx < 0 || mx >= mask.width || !mask.data[row + mx]) {
    let found = -1;
    for (let d = 1; d <= searchM && found < 0; d++) {
      if (mx - d >= 0 && mx - d < mask.width && mask.data[row + mx - d]) found = mx - d;
      else if (mx + d >= 0 && mx + d < mask.width && mask.data[row + mx + d]) found = mx + d;
    }
    if (found < 0) return null;
    mx = found;
  }
  let l = mx;
  let r = mx;
  while (l - 1 >= 0 && mask.data[row + l - 1]) l--;
  while (r + 1 < mask.width && mask.data[row + r + 1]) r++;
  return { left: l * sx, right: (r + 1) * sx };
}

/** 열 x 에서 위→아래로 처음 나타나는 마스크 y (yFrom~yTo 범위) */
export function firstYInColumn(
  mask: BinaryMask,
  x: number,
  yFrom: number,
  yTo: number,
  imgW: number,
  imgH: number,
): number | null {
  const mx = Math.floor((x / imgW) * mask.width);
  if (mx < 0 || mx >= mask.width) return null;
  const sy = imgH / mask.height;
  const m0 = Math.max(0, Math.floor(yFrom / sy));
  const m1 = Math.min(mask.height - 1, Math.ceil(yTo / sy));
  for (let my = m0; my <= m1; my++) if (mask.data[my * mask.width + mx]) return my * sy;
  return null;
}

/** 열 x 에서 아래로 내려가며 마스크가 처음 끊기는 y (yFrom 부터) */
export function firstGapInColumn(
  mask: BinaryMask,
  x: number,
  yFrom: number,
  yTo: number,
  imgW: number,
  imgH: number,
  halfBandPx = 2,
): number | null {
  const sx = imgW / mask.width;
  const sy = imgH / mask.height;
  const mxC = Math.floor(x / sx);
  const band = Math.max(0, Math.round(halfBandPx / sx));
  const m0 = Math.max(0, Math.floor(yFrom / sy));
  const m1 = Math.min(mask.height - 1, Math.ceil(yTo / sy));
  let sawBody = false;
  for (let my = m0; my <= m1; my++) {
    let any = false;
    for (let dx = -band; dx <= band; dx++) {
      const mx = mxC + dx;
      if (mx >= 0 && mx < mask.width && mask.data[my * mask.width + mx]) any = true;
    }
    if (any) sawBody = true;
    else if (sawBody) return my * sy;
  }
  return null;
}

/** 마스크 전체의 최하단 y (이미지 좌표) – x 범위 제한 가능 */
export function lowestY(
  mask: BinaryMask,
  imgW: number,
  imgH: number,
  xFrom = 0,
  xTo = imgW,
): number | null {
  const sx = imgW / mask.width;
  const sy = imgH / mask.height;
  const a = Math.max(0, Math.floor(xFrom / sx));
  const b = Math.min(mask.width - 1, Math.ceil(xTo / sx));
  for (let my = mask.height - 1; my >= 0; my--) {
    for (let mx = a; mx <= b; mx++) if (mask.data[my * mask.width + mx]) return (my + 1) * sy;
  }
  return null;
}

/** 마스크 픽셀 비율 */
export function coverage(mask: BinaryMask): number {
  let n = 0;
  for (let i = 0; i < mask.data.length; i++) n += mask.data[i];
  return n / mask.data.length;
}
