"use client";

export const MAX_SIDE = 1280;

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  originalShortSide: number;
  dataUrl: string;
}

/**
 * 파일 → 처리용 캔버스(긴 변 1280px 이하).
 * createImageBitmap 의 imageOrientation:"from-image" 로 EXIF 회전을 반영합니다.
 * 파일은 메모리에서만 읽고 어디에도 업로드하지 않습니다.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이미지를 열 수 없습니다. HEIC 등 브라우저가 지원하지 않는 형식이면 JPG/PNG 로 변환해 주세요.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
  ctx.drawImage(bmp, 0, 0, width, height);
  const originalShortSide = Math.min(bmp.width, bmp.height);
  bmp.close();
  return { canvas, width, height, originalShortSide, dataUrl: canvas.toDataURL("image/jpeg", 0.9) };
}

/** 품질 검사용 축소 그레이 픽셀 */
export function downscaledRGBA(src: HTMLCanvasElement, maxSide = 256) {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * s));
  const h = Math.max(1, Math.round(src.height * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
}
