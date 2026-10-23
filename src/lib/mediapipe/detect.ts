"use client";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { BinaryMask, BodyDetection, FaceDetection, LandmarkPx, PhotoAnalysis, PhotoKind, QualityIssue } from "../types";
import { getFaceLandmarker, getImageSegmenter, getPoseLandmarker, SEG_CLASS } from "./vision";
import { maskFromCategory, maskFromFloat } from "../mask/mask";
import { POSE } from "../analysis/landmarkIndex";
import { downscaledRGBA, prepareImage } from "../image/loadImage";
import { assessImageQuality, toGray } from "../image/quality";
import { assessFrontBody, assessFrontFace, assessSideBody } from "../analysis/detectionQuality";

const toPx = (lms: NormalizedLandmark[], W: number, H: number, ox = 0, oy = 0, cw = W, ch = H): LandmarkPx[] =>
  lms.map((p) => ({
    x: ox + p.x * cw,
    y: oy + p.y * ch,
    z: p.z,
    visibility: typeof p.visibility === "number" && p.visibility > 0 ? p.visibility : 1,
  }));

async function detectBody(canvas: HTMLCanvasElement, withHair: boolean, withFace: boolean): Promise<BodyDetection> {
  const W = canvas.width;
  const H = canvas.height;
  const pose = await getPoseLandmarker();
  const res = pose.detect(canvas);
  let personMask: BinaryMask | null = null;
  try {
    const m = res.segmentationMasks?.[0];
    if (m) personMask = maskFromFloat(m.getAsFloat32Array(), m.width, m.height, 0.5);
  } finally {
    // GPU 메모리 해제
    (res as unknown as { close?: () => void }).close?.();
  }
  const lm = res.landmarks?.[0];
  const world = res.worldLandmarks?.[0];
  const det: BodyDetection = {
    pose: lm ? toPx(lm, W, H) : null,
    worldPose: world ? world.map((p) => ({ x: p.x, y: p.y, z: p.z })) : null,
    personMask,
    hairMask: null,
    face: null,
  };
  if (!det.pose) return det;

  if (withHair) {
    try {
      const seg = await getImageSegmenter();
      const r = seg.segment(canvas);
      const cm = r.categoryMask;
      if (cm) det.hairMask = maskFromCategory(cm.getAsUint8Array(), cm.width, cm.height, [SEG_CLASS.hair]);
      r.close();
    } catch (e) {
      console.warn("[segmenter] 머리카락 분리 실패 – 머리카락 제외 없이 진행", e);
    }
  }

  if (withFace) det.face = await detectFaceInBody(canvas, det.pose);
  return det;
}

/** 전신 사진 속 얼굴은 작아서 바로 검출이 잘 안 되므로 머리 부분만 잘라 확대 후 검출 */
async function detectFaceInBody(canvas: HTMLCanvasElement, pose: LandmarkPx[]): Promise<FaceDetection | null> {
  const nose = pose[POSE.nose];
  const eL = pose[POSE.leftEar];
  const eR = pose[POSE.rightEar];
  if (!nose || nose.visibility < 0.5) return null;
  const earDist = eL && eR ? Math.abs(eL.x - eR.x) : canvas.width * 0.06;
  const size = Math.max(earDist * 3.2, 48);
  const x0 = Math.max(0, nose.x - size / 2);
  const y0 = Math.max(0, nose.y - size * 0.55);
  const cw = Math.min(canvas.width - x0, size);
  const ch = Math.min(canvas.height - y0, size);
  const target = 384;
  const k = target / Math.max(cw, ch);
  const crop = document.createElement("canvas");
  crop.width = Math.round(cw * k);
  crop.height = Math.round(ch * k);
  crop.getContext("2d")!.drawImage(canvas, x0, y0, cw, ch, 0, 0, crop.width, crop.height);
  const face = await getFaceLandmarker();
  const r = face.detect(crop);
  const lm = r.faceLandmarks?.[0];
  if (!lm) return null;
  return { landmarks: toPx(lm, canvas.width, canvas.height, x0, y0, cw, ch), fromCrop: true };
}

async function detectFace(canvas: HTMLCanvasElement): Promise<FaceDetection | null> {
  const face = await getFaceLandmarker();
  const r = face.detect(canvas);
  const lm = r.faceLandmarks?.[0];
  return lm ? { landmarks: toPx(lm, canvas.width, canvas.height), fromCrop: false } : null;
}

/** 사진 1장 분석: 품질 검사 → 랜드마크 추출 → 검출 품질 검사 */
export async function analyzePhoto(kind: PhotoKind, file: File): Promise<PhotoAnalysis> {
  const img = await prepareImage(file);
  const small = downscaledRGBA(img.canvas);
  const issues: QualityIssue[] = assessImageQuality({
    width: img.width,
    height: img.height,
    gray: toGray(small.data, small.width, small.height),
    grayW: small.width,
    grayH: small.height,
    originalShortSide: img.originalShortSide,
  });

  let body: BodyDetection | null = null;
  let face: FaceDetection | null = null;

  switch (kind) {
    case "frontBody":
      body = await detectBody(img.canvas, true, true);
      issues.push(...assessFrontBody(body, img.width, img.height));
      break;
    case "sideBody":
      body = await detectBody(img.canvas, false, false);
      issues.push(...assessSideBody(body, img.width, img.height));
      break;
    case "frontFace":
      face = await detectFace(img.canvas);
      issues.push(...assessFrontFace(face, img.width, img.height));
      break;
    case "sideFace":
      face = await detectFace(img.canvas);
      body = await detectBody(img.canvas, false, false);
      if (!face && !body.pose)
        issues.push({ code: "noFaceSide", level: "warn", retake: true, message: "옆얼굴과 목을 인식하지 못했습니다. 귀·턱선·어깨가 보이도록 다시 촬영해 주세요." });
      break;
  }

  return {
    kind,
    width: img.width,
    height: img.height,
    imageUrl: img.dataUrl,
    body,
    face,
    issues,
    processedAt: Date.now(),
  };
}
