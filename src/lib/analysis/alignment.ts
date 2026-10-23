import type { LandmarkPx, Metric } from "../types";
import { POSE } from "./landmarkIndex";

const ok = (p?: LandmarkPx) => !!p && p.visibility >= 0.5;

/** 정면: 코가 어깨 중심에서 좌우로 벗어난 정도(어깨 관절 폭 대비 %) */
export function frontHeadOffset(pose: LandmarkPx[] | null): Metric {
  const base = {
    id: "asymmetry" as const,
    index: 0,
    label: "머리-어깨 좌우 정렬 (정면)",
    definition: "코의 x 위치와 양 어깨 관절 중점의 x 차이 ÷ 어깨 관절 간 거리",
    uses: ["joints" as const],
  };
  const n = pose?.[POSE.nose];
  const l = pose?.[POSE.leftShoulder];
  const r = pose?.[POSE.rightShoulder];
  if (!ok(n) || !ok(l) || !ok(r)) {
    return { ...base, value: null, display: "측정 불가", status: "unavailable", reasons: ["코 또는 어깨가 인식되지 않았습니다."] };
  }
  const mid = (l!.x + r!.x) / 2;
  const w = Math.abs(l!.x - r!.x);
  const pct = ((n!.x - mid) / w) * 100;
  // 화면 오른쪽(+) = 본인의 왼쪽
  const dir = Math.abs(pct) < 2 ? "중앙" : pct > 0 ? "본인 기준 왼쪽" : "본인 기준 오른쪽";
  return {
    ...base,
    value: Math.round(Math.abs(pct) * 10) / 10,
    display: Math.abs(pct) < 2 ? "중앙 정렬 (±2% 이내)" : `${dir}으로 ${Math.abs(pct).toFixed(1)}%`,
    status: "ok",
    reasons: ["고개 돌림·기울임이 있으면 값이 커집니다. 자세 교정 판단용이 아닌 촬영 정렬 참고값입니다."],
  };
}

/** 측면: 귀가 어깨보다 앞으로 나온 정도(몸통 길이 대비 %) */
export function sideHeadForward(pose: LandmarkPx[] | null): Metric {
  const base = {
    id: "asymmetry" as const,
    index: 0,
    label: "머리-어깨 앞뒤 정렬 (측면)",
    definition: "귀와 어깨 관절의 수평 거리 ÷ 어깨~골반 관절 수직 길이 (얼굴 방향 기준 앞쪽이 +)",
    uses: ["joints" as const],
  };
  if (!pose) return { ...base, value: null, display: "측면 사진 없음", status: "unavailable", reasons: ["측면 전신 사진을 추가하면 측정됩니다."] };
  const pick = (a: number, b: number) => (pose[a].visibility >= pose[b].visibility ? pose[a] : pose[b]);
  const ear = pick(POSE.leftEar, POSE.rightEar);
  const sh = pick(POSE.leftShoulder, POSE.rightShoulder);
  const hip = pick(POSE.leftHip, POSE.rightHip);
  const nose = pose[POSE.nose];
  if (!ok(ear) || !ok(sh) || !ok(hip) || !ok(nose)) {
    return { ...base, value: null, display: "측정 불가", status: "unavailable", reasons: ["귀·어깨·골반·코 중 일부가 인식되지 않았습니다."] };
  }
  const dir = Math.sign(nose.x - ear.x) || 1;
  const torso = Math.abs(hip.y - sh.y);
  if (torso < 1) return { ...base, value: null, display: "측정 불가", status: "unavailable", reasons: ["몸통 길이를 계산할 수 없습니다."] };
  const pct = (((ear.x - sh.x) * dir) / torso) * 100;
  return {
    ...base,
    value: Math.round(pct * 10) / 10,
    display: pct >= 0 ? `귀가 어깨보다 ${pct.toFixed(1)}% 앞` : `귀가 어깨보다 ${Math.abs(pct).toFixed(1)}% 뒤`,
    status: "low",
    reasons: [
      "랜드마크의 귀·어깨는 관절 중심 추정값이라 실제 체표면 위치와 다릅니다.",
      "시선 높이·촬영 순간의 자세에 따라 크게 달라집니다. 스타일링 참고용입니다.",
    ],
  };
}
