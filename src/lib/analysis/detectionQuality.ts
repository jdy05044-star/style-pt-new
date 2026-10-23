import type { BodyDetection, FaceDetection, LandmarkPx, QualityIssue } from "../types";
import { FACE, POSE, REQUIRED_FRONT_BODY } from "./landmarkIndex";
import { coverage } from "../mask/mask";

const NAME: Record<number, string> = {
  [POSE.nose]: "얼굴",
  [POSE.leftShoulder]: "왼쪽 어깨",
  [POSE.rightShoulder]: "오른쪽 어깨",
  [POSE.leftHip]: "왼쪽 골반",
  [POSE.rightHip]: "오른쪽 골반",
  [POSE.leftKnee]: "왼쪽 무릎",
  [POSE.rightKnee]: "오른쪽 무릎",
  [POSE.leftAnkle]: "왼쪽 발목",
  [POSE.rightAnkle]: "오른쪽 발목",
};

/** 전신 정면 사진 검출 품질 */
export function assessFrontBody(det: BodyDetection, W: number, H: number): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!det.pose) {
    return [
      {
        code: "noPerson",
        level: "error",
        retake: true,
        message: "사람을 인식하지 못했습니다. 전신이 모두 나오도록, 단순한 배경에서 다시 촬영해 주세요.",
      },
    ];
  }
  const lost = REQUIRED_FRONT_BODY.filter((i) => (det.pose![i]?.visibility ?? 0) < 0.5);
  if (lost.length) {
    issues.push({
      code: "landmarksHidden",
      level: "error",
      retake: true,
      message: `${lost.map((i) => NAME[i]).join(", ")} 부위가 가려졌거나 사진 밖에 있습니다. 해당 부위가 포함된 비율은 '측정 불가'로 표시됩니다.`,
    });
  }
  const ys = det.pose.filter((p) => p.visibility >= 0.5).map((p) => p.y);
  if (ys.length) {
    const span = Math.max(...ys) - Math.min(...ys);
    if (span < H * 0.45)
      issues.push({
        code: "tooFar",
        level: "warn",
        retake: true,
        message: "몸이 화면에서 너무 작습니다. 전신이 화면 높이의 70~90%를 차지하도록 가까이서 촬영해 주세요.",
      });
  }
  if (!det.personMask || coverage(det.personMask) < 0.02) {
    issues.push({
      code: "noMask",
      level: "warn",
      retake: false,
      message: "실루엣 분리에 실패해 어깨·허리·골반 '폭' 측정이 제한됩니다. 몸과 대비되는 단색 배경을 권장합니다.",
    });
  }
  const sL = det.pose[POSE.leftShoulder];
  const sR = det.pose[POSE.rightShoulder];
  const hL = det.pose[POSE.leftHip];
  if (sL && sR && hL) {
    const torso = Math.abs(hL.y - sL.y);
    if (Math.abs(sL.x - sR.x) < torso * 0.35)
      issues.push({
        code: "notFrontal",
        level: "error",
        retake: true,
        message: "정면 사진이 아닌 것 같습니다(어깨 폭이 매우 좁게 보임). 카메라를 정면으로 바라보고 다시 촬영해 주세요.",
      });
  }
  if (!det.face) {
    issues.push({
      code: "noFaceInBody",
      level: "info",
      retake: false,
      message: "전신 사진에서 얼굴 랜드마크를 찾지 못해 턱선을 직접 지정해야 등신·얼굴 비율을 계산할 수 있습니다.",
    });
  }
  return issues;
}

/** 측면 전신 사진 */
export function assessSideBody(det: BodyDetection, _W: number, H: number): QualityIssue[] {
  if (!det.pose) {
    return [{ code: "noPerson", level: "error", retake: true, message: "사람을 인식하지 못했습니다. 옆모습 전신이 나오게 다시 촬영해 주세요." }];
  }
  const issues: QualityIssue[] = [];
  const p = det.pose;
  const sL = p[POSE.leftShoulder];
  const sR = p[POSE.rightShoulder];
  const hip = p[POSE.leftHip].visibility > p[POSE.rightHip].visibility ? p[POSE.leftHip] : p[POSE.rightHip];
  if (sL && sR && hip) {
    const torso = Math.abs(hip.y - (sL.y + sR.y) / 2);
    if (Math.abs(sL.x - sR.x) > torso * 0.45)
      issues.push({
        code: "notSide",
        level: "warn",
        retake: true,
        message: "몸이 완전히 옆을 향하지 않았습니다. 어깨가 겹쳐 보이도록 90° 돌아서 촬영해 주세요.",
      });
  }
  const ys = p.filter((q) => q.visibility >= 0.5).map((q) => q.y);
  if (ys.length && Math.max(...ys) - Math.min(...ys) < H * 0.45)
    issues.push({ code: "tooFar", level: "warn", retake: true, message: "몸이 너무 작게 찍혔습니다. 조금 더 가까이서 촬영해 주세요." });
  return issues;
}

/** 정면 얼굴 사진 */
export function assessFrontFace(face: FaceDetection | null, W: number, _H: number): QualityIssue[] {
  if (!face) {
    return [
      {
        code: "noFace",
        level: "error",
        retake: true,
        message: "얼굴을 인식하지 못했습니다. 앞머리를 넘기고 정면을 바라본 상태로 다시 촬영해 주세요.",
      },
    ];
  }
  const issues: QualityIssue[] = [];
  const lm = face.landmarks;
  const l = lm[FACE.rightCheek];
  const r = lm[FACE.leftCheek];
  const n = lm[FACE.noseTip];
  const fw = Math.abs(r.x - l.x);
  if (fw < W * 0.25)
    issues.push({ code: "faceSmall", level: "warn", retake: true, message: "얼굴이 작게 찍혔습니다. 얼굴이 화면 너비의 40% 이상이 되도록 가까이 촬영해 주세요." });
  const yaw = yawRatio(l, r, n);
  if (Math.abs(yaw) > 0.15)
    issues.push({ code: "faceYaw", level: "warn", retake: true, message: "얼굴이 옆으로 돌아가 있습니다. 코가 얼굴 중앙에 오도록 정면을 바라봐 주세요." });
  const eL = lm[FACE.leftEyeOuter];
  const eR = lm[FACE.rightEyeOuter];
  const roll = Math.abs((Math.atan2(eL.y - eR.y, eL.x - eR.x) * 180) / Math.PI);
  if (Math.min(roll, 180 - roll) > 5)
    issues.push({ code: "faceRoll", level: "warn", retake: false, message: "고개가 옆으로 기울어 있습니다. 가능하면 수평을 맞춰 주세요." });
  return issues;
}

/** -1(오른쪽으로 돎) ~ 1(왼쪽으로 돎), 0 = 정면 */
export function yawRatio(leftEdge: LandmarkPx, rightEdge: LandmarkPx, nose: LandmarkPx): number {
  const dl = nose.x - leftEdge.x;
  const dr = rightEdge.x - nose.x;
  return (dl - dr) / Math.max(1e-6, dl + dr);
}
