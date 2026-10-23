import type { PhotoKind } from "./types";

export interface GuideInfo {
  kind: PhotoKind;
  title: string;
  required: boolean;
  usedFor: string;
  checklist: string[];
  avoid: string[];
}

export const GUIDES: Record<PhotoKind, GuideInfo> = {
  frontBody: {
    kind: "frontBody",
    title: "정면 전신",
    required: true,
    usedFor: "등신·상하체·어깨:골반·허리 비율, 어깨 경사, 좌우 비대칭",
    checklist: [
      "카메라를 배꼽~허리 높이에 수평으로 두고 2.5~3m 떨어져 촬영 (거치대·타이머 권장)",
      "머리끝부터 발끝까지 화면 높이의 70~90%가 되게",
      "몸에 붙는 옷(레깅스·반팔 티 등), 맨발 또는 얇은 양말",
      "팔은 몸에서 30° 정도 벌리고, 다리는 주먹 하나 간격",
      "긴 머리는 묶어서 목과 어깨선이 보이게",
      "정면을 보고 체중을 양발에 고르게",
      "몸과 대비되는 단색 벽 앞, 정면에서 빛이 오게",
    ],
    avoid: ["광각(0.5×) 렌즈·셀카 거울샷", "위에서 내려찍기", "두꺼운 아우터·치마", "짝다리, 한쪽 어깨 내리기"],
  },
  sideBody: {
    kind: "sideBody",
    title: "측면 전신",
    required: true,
    usedFor: "상체 입체감, 목·머리 정렬 (4단계 골격 분석)",
    checklist: [
      "정면 촬영과 같은 거리·높이에서 90° 옆으로 돌아서기",
      "양쪽 어깨가 겹쳐 보이게, 팔은 자연스럽게 내리기",
      "시선은 정면(먼 곳) 수평으로",
      "머리는 묶어 귀·목 뒤가 보이게",
    ],
    avoid: ["몸을 비스듬히(45°) 돌리기", "배에 힘주거나 등을 과하게 펴기"],
  },
  frontFace: {
    kind: "frontFace",
    title: "정면 얼굴",
    required: true,
    usedFor: "얼굴형(세로/가로, 이마·광대·턱 너비), 하관 비율",
    checklist: [
      "카메라를 눈높이에 두고 50cm 이상 떨어져 촬영 (가까울수록 코·볼이 커 보임)",
      "앞머리를 넘겨 이마·헤어라인·턱선이 모두 보이게",
      "무표정, 입 다물고 정면 응시",
      "얼굴이 화면 너비의 40~60%가 되도록 2× 줌 사용 권장",
    ],
    avoid: ["턱을 들거나 숙이기", "안경·마스크·모자", "강한 그림자(측광)"],
  },
  sideFace: {
    kind: "sideFace",
    title: "측면 얼굴 · 목 (선택)",
    required: false,
    usedFor: "목 길이·목-어깨 연결, 머리 전방 위치 보조 확인",
    checklist: [
      "귀 높이에 카메라, 90° 옆모습",
      "귀·턱선·목·어깨 윗부분까지 한 화면에",
      "머리카락을 귀 뒤로 넘기기",
    ],
    avoid: ["목을 빼거나 움츠리기", "목폴라·높은 깃의 옷"],
  },
};
