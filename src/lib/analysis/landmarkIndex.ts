// MediaPipe Pose Landmarker (33점) 인덱스
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
// 주의: MediaPipe 의 left/right 는 "촬영된 사람" 기준입니다(화면상 오른쪽이 사람의 왼쪽).
export const POSE = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

/** 전신 정면 분석에 반드시 필요한 랜드마크 */
export const REQUIRED_FRONT_BODY = [
  POSE.nose,
  POSE.leftShoulder,
  POSE.rightShoulder,
  POSE.leftHip,
  POSE.rightHip,
  POSE.leftKnee,
  POSE.rightKnee,
  POSE.leftAnkle,
  POSE.rightAnkle,
] as const;

/** 시각화용 골격 연결선 */
export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32],
];

// MediaPipe Face Landmarker (478점) 중 사용하는 인덱스
export const FACE = {
  top: 10, // 얼굴 메시 최상단(이마 위쪽, 실제 헤어라인과 다를 수 있음)
  chin: 152,
  leftCheek: 454, // 사람 기준 왼쪽 얼굴 윤곽(광대 높이)
  rightCheek: 234,
  noseTip: 1,
  leftEyeOuter: 263,
  rightEyeOuter: 33,
  // 이마/턱 너비 계산용(4단계 얼굴형 분석에서 사용)
  foreheadLeft: 251,
  foreheadRight: 21,
  jawLeft: 365,
  jawRight: 136,
} as const;

/** 얼굴 윤곽선(face oval) 순서 – 오버레이용 */
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
