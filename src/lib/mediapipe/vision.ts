"use client";
// MediaPipe Tasks Vision 로더 – 브라우저에서만 동적 import 합니다(SSR 안전).
// API: https://ai.google.dev/edge/api/mediapipe/js/tasks-vision
import type {
  FaceLandmarker,
  ImageSegmenter,
  PoseLandmarker,
  FilesetResolver as FilesetResolverT,
} from "@mediapipe/tasks-vision";

const MODELS = {
  pose:
    process.env.NEXT_PUBLIC_POSE_MODEL ??
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
  face:
    process.env.NEXT_PUBLIC_FACE_MODEL ??
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  segmenter:
    process.env.NEXT_PUBLIC_SEGMENTER_MODEL ??
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
};

/** postinstall 스크립트가 node_modules 의 wasm 을 여기에 복사합니다 */
const WASM_BASE = "/mediapipe/wasm";

type Fileset = Awaited<ReturnType<typeof FilesetResolverT.forVisionTasks>>;

let filesetP: Promise<Fileset> | null = null;
let poseP: Promise<PoseLandmarker> | null = null;
let faceP: Promise<FaceLandmarker> | null = null;
let segP: Promise<ImageSegmenter> | null = null;

async function lib() {
  return import("@mediapipe/tasks-vision");
}

function fileset() {
  filesetP ??= lib().then((m) => m.FilesetResolver.forVisionTasks(WASM_BASE));
  return filesetP;
}

/** GPU 위임이 실패하는 기기(일부 iOS/구형 안드로이드)는 CPU 로 재시도 */
async function withDelegate<T>(create: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await create("GPU");
  } catch (e) {
    console.warn("[mediapipe] GPU delegate 실패 → CPU 재시도", e);
    return create("CPU");
  }
}

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  poseP ??= (async () => {
    const [{ PoseLandmarker }, fs] = await Promise.all([lib(), fileset()]);
    return withDelegate((delegate) =>
      PoseLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: MODELS.pose, delegate },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        outputSegmentationMasks: true,
      }),
    );
  })().catch((e) => {
    poseP = null;
    throw e;
  });
  return poseP;
}

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  faceP ??= (async () => {
    const [{ FaceLandmarker }, fs] = await Promise.all([lib(), fileset()]);
    return withDelegate((delegate) =>
      FaceLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: MODELS.face, delegate },
        runningMode: "IMAGE",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      }),
    );
  })().catch((e) => {
    faceP = null;
    throw e;
  });
  return faceP;
}

/** selfie_multiclass: 0 배경, 1 머리카락, 2 몸 피부, 3 얼굴 피부, 4 옷, 5 기타(액세서리) */
export const SEG_CLASS = { background: 0, hair: 1, bodySkin: 2, faceSkin: 3, clothes: 4, others: 5 } as const;

export function getImageSegmenter(): Promise<ImageSegmenter> {
  segP ??= (async () => {
    const [{ ImageSegmenter }, fs] = await Promise.all([lib(), fileset()]);
    return withDelegate((delegate) =>
      ImageSegmenter.createFromOptions(fs, {
        baseOptions: { modelAssetPath: MODELS.segmenter, delegate },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      }),
    );
  })().catch((e) => {
    segP = null;
    throw e;
  });
  return segP;
}
