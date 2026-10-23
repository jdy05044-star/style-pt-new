// ───────────────────────────── 공통 타입 ─────────────────────────────
// 모든 좌표는 "처리용 이미지"의 픽셀 좌표입니다(원본을 긴 변 1280px 이하로 축소한 캔버스 기준).

export type PhotoKind = "frontBody" | "sideBody" | "frontFace" | "sideFace";

export const PHOTO_KINDS: PhotoKind[] = ["frontBody", "sideBody", "frontFace", "sideFace"];

export interface Pt {
  x: number;
  y: number;
}

/** MediaPipe 랜드마크를 픽셀 좌표로 바꾼 것 */
export interface LandmarkPx extends Pt {
  z: number;
  visibility: number; // 0~1, 얼굴 랜드마크는 1로 채움
}

/** 0/1 이진 마스크 (행 우선) */
export interface BinaryMask {
  width: number;
  height: number;
  data: Uint8Array;
}

export type IssueLevel = "error" | "warn" | "info";

export interface QualityIssue {
  code: string;
  level: IssueLevel;
  message: string;
  /** true 이면 재촬영 권장 */
  retake: boolean;
}

export interface FaceDetection {
  landmarks: LandmarkPx[]; // 478점
  /** 전신 사진에서 얼굴만 잘라 검출한 경우 true */
  fromCrop: boolean;
}

export interface BodyDetection {
  pose: LandmarkPx[] | null; // 33점
  worldPose: { x: number; y: number; z: number }[] | null; // 미터 단위(엉덩이 중심 원점)
  personMask: BinaryMask | null; // Pose 세그멘테이션
  hairMask: BinaryMask | null; // Image Segmenter(multiclass) hair 클래스
  face: FaceDetection | null; // 전신 사진 속 얼굴
}

export interface PhotoAnalysis {
  kind: PhotoKind;
  width: number;
  height: number;
  /** 처리용 캔버스에서 만든 dataURL (메모리에만 존재, 저장/전송하지 않음) */
  imageUrl: string;
  body: BodyDetection | null;
  face: FaceDetection | null;
  issues: QualityIssue[];
  processedAt: number;
}

// ───────────────────────────── 측정 기준선 ─────────────────────────────

/** 사용자가 드래그로 보정할 수 있는 수평 기준선 */
export type LevelId =
  | "headTop"
  | "chin"
  | "neckBase"
  | "shoulder"
  | "waist"
  | "hip"
  | "crotch"
  | "floor";

export const LEVEL_IDS: LevelId[] = [
  "headTop",
  "chin",
  "neckBase",
  "shoulder",
  "waist",
  "hip",
  "crotch",
  "floor",
];

export type PointSource = "auto" | "manual" | "missing";

export interface Level {
  id: LevelId;
  y: number | null;
  source: PointSource;
  confidence: number; // 0~1
  /** 자동 검출 실패/저신뢰 사유 */
  note?: string;
}

export interface WidthSpan {
  left: number;
  right: number;
  y: number;
}

export interface Keypoints {
  levels: Record<LevelId, Level>;
  /** 기준선 높이에서 실루엣 마스크로 측정한 좌우 경계 */
  widths: Partial<Record<"neck" | "shoulder" | "waist" | "hip", WidthSpan>>;
  /** 높이별 몸 중심선 x */
  midlineAt: (y: number) => number;
  joints: {
    shoulderL?: Pt;
    shoulderR?: Pt;
    hipL?: Pt;
    hipR?: Pt;
    kneeL?: Pt;
    kneeR?: Pt;
    ankleL?: Pt;
    ankleR?: Pt;
  };
  face?: { left: Pt; right: Pt; top: Pt; chin: Pt };
  /** 어깨 상단 윤곽선 샘플(경사 계산용) */
  shoulderSlope?: { L?: [Pt, Pt]; R?: [Pt, Pt] };
  warnings: QualityIssue[];
}

export type LevelOverrides = Partial<Record<LevelId, number>>;

// ───────────────────────────── 측정 결과 ─────────────────────────────

export type MetricStatus = "ok" | "low" | "unavailable";

export type MetricId =
  | "headToBody"
  | "upperLower"
  | "torsoLeg"
  | "shoulderHip"
  | "waistHip"
  | "waistHeight"
  | "thighCalf"
  | "shoulderSlope"
  | "faceShoulder"
  | "faceNeck"
  | "asymmetry";

export interface Metric {
  id: MetricId;
  index: number; // 요청서 번호(1~11)
  label: string;
  /** 대표 수치(정렬/그래프용). 측정 불가면 null */
  value: number | null;
  /** 화면 표시 문자열 예: "1 : 7.24" */
  display: string;
  /** 비율 막대 그래프용 구성(합이 1이 아니어도 됨) */
  parts?: { label: string; value: number }[];
  status: MetricStatus;
  /** 측정 정의(어디서 어디까지 쟀는지) */
  definition: string;
  /** 저신뢰/불가 사유 */
  reasons: string[];
  /** 사용된 기준선 (화면 강조용) */
  uses: (LevelId | "joints" | "face")[];
}

export interface PostureFlag {
  code: string;
  message: string;
  value?: number;
}

export interface BodyMetricsResult {
  metrics: Metric[];
  postureFlags: PostureFlag[];
}
