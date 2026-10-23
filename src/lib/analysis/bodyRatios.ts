import type {
  BodyMetricsResult,
  Keypoints,
  LandmarkPx,
  LevelId,
  Metric,
  MetricId,
  Pt,
  PostureFlag,
} from "../types";
import { POSE } from "./landmarkIndex";

/**
 * 사진 기준선/랜드마크 → 11개 신체 비율.
 * 모든 값은 "같은 사진 안의 픽셀 길이끼리의 비율"이며 실제 cm 치수가 아닙니다.
 * 계산에 필요한 점이 하나라도 없으면 값을 만들지 않고 unavailable 로 반환합니다.
 */
export function computeBodyMetrics(
  kp: Keypoints,
  pose: LandmarkPx[] | null,
  worldPose: { x: number; y: number; z: number }[] | null,
): BodyMetricsResult {
  const L = kp.levels;
  const y = (id: LevelId) => L[id].y;
  const conf = (...ids: LevelId[]) => Math.min(...ids.map((id) => L[id].confidence));
  const missingOf = (...ids: LevelId[]) => ids.filter((id) => L[id].y === null);
  const notesOf = (...ids: LevelId[]) =>
    ids.map((id) => L[id]).filter((l) => l.source === "auto" && l.confidence < 0.5 && l.note).map((l) => `${LEVEL_LABEL[l.id]}: ${l.note}`);

  const width = (k: keyof Keypoints["widths"]) => {
    const s = kp.widths[k];
    return s ? s.right - s.left : null;
  };

  const postureFlags = detectPostureFlags(pose, worldPose, kp);
  const metrics: Metric[] = [];

  const unavailable = (id: MetricId, reasons: string[]): Metric => ({
    ...META[id],
    id,
    value: null,
    display: "측정 불가",
    status: "unavailable",
    reasons,
  });

  const needLevels = (id: MetricId, ids: LevelId[]): Metric | null => {
    const miss = missingOf(...ids);
    return miss.length
      ? unavailable(id, miss.map((m) => `${LEVEL_LABEL[m]} 기준선 없음 — ${L[m].note ?? "직접 지정해 주세요."}`))
      : null;
  };

  const statusFrom = (c: number, extraReasons: string[] = []) =>
    c < 0.5 || extraReasons.length ? ("low" as const) : ("ok" as const);

  // 1. 등신
  {
    const ids: LevelId[] = ["headTop", "chin", "floor"];
    const m = needLevels("headToBody", ids);
    if (m) metrics.push(m);
    else {
      const head = y("chin")! - y("headTop")!;
      const total = y("floor")! - y("headTop")!;
      if (head <= 0 || total <= 0) metrics.push(unavailable("headToBody", ["기준선 순서가 올바르지 않습니다(머리끝 < 턱 < 바닥)."]));
      else {
        const v = total / head;
        const reasons = notesOf(...ids);
        if (v < 5 || v > 9.5) reasons.push("일반적인 범위(5~9.5등신)를 벗어났습니다. 머리끝·턱·바닥 기준선을 확인해 주세요.");
        metrics.push({
          ...META.headToBody,
          value: round(v, 2),
          display: `1 : ${v.toFixed(1)}`,
          parts: [
            { label: "머리", value: head },
            { label: "나머지", value: total - head },
          ],
          status: statusFrom(conf(...ids), reasons),
          reasons,
        });
      }
    }
  }

  // 2. 상체 : 하체 (허리선 기준)
  {
    const ids: LevelId[] = ["headTop", "waist", "floor"];
    const m = needLevels("upperLower", ids);
    if (m) metrics.push(m);
    else {
      const up = y("waist")! - y("headTop")!;
      const lo = y("floor")! - y("waist")!;
      const t = up + lo;
      if (up <= 0 || lo <= 0) metrics.push(unavailable("upperLower", ["허리선 위치가 올바르지 않습니다."]));
      else {
        const reasons = notesOf(...ids);
        const pu = (up / t) * 100;
        metrics.push({
          ...META.upperLower,
          value: round(pu, 1),
          display: `${pu.toFixed(0)} : ${(100 - pu).toFixed(0)}`,
          parts: [
            { label: "상체", value: up },
            { label: "하체", value: lo },
          ],
          status: statusFrom(conf(...ids), reasons),
          reasons,
        });
      }
    }
  }

  // 3. 몸통 : 다리 (어깨선~가랑이 / 가랑이~바닥)
  {
    const ids: LevelId[] = ["shoulder", "crotch", "floor"];
    const m = needLevels("torsoLeg", ids);
    if (m) metrics.push(m);
    else {
      const torso = y("crotch")! - y("shoulder")!;
      const leg = y("floor")! - y("crotch")!;
      if (torso <= 0 || leg <= 0) metrics.push(unavailable("torsoLeg", ["가랑이점 위치가 올바르지 않습니다."]));
      else {
        const reasons = notesOf(...ids);
        const pt = (torso / (torso + leg)) * 100;
        metrics.push({
          ...META.torsoLeg,
          value: round(leg / torso, 2),
          display: `${pt.toFixed(0)} : ${(100 - pt).toFixed(0)}`,
          parts: [
            { label: "몸통", value: torso },
            { label: "다리", value: leg },
          ],
          status: statusFrom(conf(...ids), reasons),
          reasons,
        });
      }
    }
  }

  // 4. 어깨너비 : 골반너비
  {
    const sw = width("shoulder");
    const hw = width("hip");
    const miss = [...missingOf("shoulder", "hip")];
    if (miss.length || sw === null || hw === null || hw <= 0) {
      metrics.push(
        unavailable("shoulderHip", [
          ...miss.map((m) => `${LEVEL_LABEL[m]} 기준선 없음`),
          ...(sw === null || hw === null ? ["실루엣에서 폭을 측정하지 못했습니다."] : []),
        ]),
      );
    } else {
      const reasons = [...notesOf("shoulder", "hip"), ...armReasons(kp, "hip")];
      const v = sw / hw;
      metrics.push({
        ...META.shoulderHip,
        value: round(v, 2),
        display: `${v.toFixed(2)} : 1`,
        parts: [
          { label: "어깨", value: sw },
          { label: "골반", value: hw },
        ],
        status: statusFrom(conf("shoulder", "hip"), reasons),
        reasons,
      });
    }
  }

  // 5. 허리너비 : 골반너비
  {
    const ww = width("waist");
    const hw = width("hip");
    const miss = missingOf("waist", "hip");
    if (miss.length || ww === null || hw === null || hw <= 0) {
      metrics.push(
        unavailable("waistHip", [
          ...miss.map((m) => `${LEVEL_LABEL[m]} 기준선 없음`),
          ...(ww === null || hw === null ? ["실루엣에서 폭을 측정하지 못했습니다."] : []),
        ]),
      );
    } else {
      const reasons = [...notesOf("waist", "hip"), ...armReasons(kp, "waist"), ...armReasons(kp, "hip")];
      const v = ww / hw;
      metrics.push({
        ...META.waistHip,
        value: round(v, 2),
        display: `${v.toFixed(2)} : 1`,
        parts: [
          { label: "허리", value: ww },
          { label: "골반", value: hw },
        ],
        status: statusFrom(conf("waist", "hip"), reasons),
        reasons,
      });
    }
  }

  // 6. 허리 위치 상대 높이
  {
    const ids: LevelId[] = ["headTop", "waist", "floor"];
    const m = needLevels("waistHeight", ids);
    if (m) metrics.push(m);
    else {
      const total = y("floor")! - y("headTop")!;
      const fromFloor = y("floor")! - y("waist")!;
      const reasons = notesOf(...ids);
      const v = (fromFloor / total) * 100;
      metrics.push({
        ...META.waistHeight,
        value: round(v, 1),
        display: `바닥에서 ${v.toFixed(1)}%`,
        parts: [
          { label: "허리 아래", value: fromFloor },
          { label: "허리 위", value: total - fromFloor },
        ],
        status: statusFrom(conf(...ids), reasons),
        reasons,
      });
    }
  }

  // 7. 허벅지 : 종아리 (관절 중심 간 거리)
  {
    const j = kp.joints;
    const sides: [Pt | undefined, Pt | undefined, Pt | undefined][] = [
      [j.hipL, j.kneeL, j.ankleL],
      [j.hipR, j.kneeR, j.ankleR],
    ];
    const ratios = sides
      .filter((s): s is [Pt, Pt, Pt] => !!(s[0] && s[1] && s[2]))
      .map(([h, k, a]) => ({ thigh: dist(h, k), calf: dist(k, a) }));
    if (!ratios.length) metrics.push(unavailable("thighCalf", ["골반·무릎·발목 관절이 인식되지 않았습니다."]));
    else {
      const thigh = avg(ratios.map((r) => r.thigh));
      const calf = avg(ratios.map((r) => r.calf));
      const reasons: string[] = [];
      if (ratios.length < 2) reasons.push("한쪽 다리만 인식되어 그 값만 사용했습니다.");
      if (postureFlags.some((f) => f.code === "kneeBent")) reasons.push("무릎이 굽혀져 있어 길이가 짧게 측정될 수 있습니다.");
      const v = thigh / calf;
      metrics.push({
        ...META.thighCalf,
        value: round(v, 2),
        display: `${v.toFixed(2)} : 1`,
        parts: [
          { label: "허벅지", value: thigh },
          { label: "종아리", value: calf },
        ],
        status: reasons.length ? "low" : "ok",
        reasons,
      });
    }
  }

  // 8. 어깨 경사
  {
    const s = kp.shoulderSlope;
    const angle = (seg?: [Pt, Pt]) =>
      seg ? (Math.atan2(seg[1].y - seg[0].y, Math.abs(seg[1].x - seg[0].x)) * 180) / Math.PI : null;
    // 화면 왼쪽 = 본인의 오른쪽 (정면 사진)
    const right = angle(s?.L);
    const left = angle(s?.R);
    const vals = [left, right].filter((v): v is number => v !== null);
    if (!vals.length) {
      metrics.push(
        unavailable("shoulderSlope", [
          "목·어깨 윗윤곽을 찾지 못했습니다(목 밑·턱 기준선, 실루엣 필요).",
          ...(L.neckBase.y === null ? ["목 밑 기준선을 직접 지정하면 측정할 수 있습니다."] : []),
        ]),
      );
    } else {
      const reasons = notesOf("neckBase", "shoulder");
      reasons.push("머리카락이 어깨를 덮거나 옷 어깨선이 각진 경우 실제 경사와 다를 수 있습니다.");
      const v = avg(vals);
      metrics.push({
        ...META.shoulderSlope,
        value: round(v, 1),
        display:
          vals.length === 2 ? `평균 ${v.toFixed(1)}° (오른쪽 ${right!.toFixed(1)}° · 왼쪽 ${left!.toFixed(1)}°)` : `${v.toFixed(1)}° (한쪽만 측정)`,
        status: conf("neckBase", "shoulder") < 0.5 ? "low" : "ok",
        reasons,
      });
    }
  }

  // 9. 얼굴너비 : 어깨너비
  {
    const sw = width("shoulder");
    if (!kp.face) metrics.push(unavailable("faceShoulder", ["전신 사진에서 얼굴 랜드마크를 찾지 못했습니다."]));
    else if (sw === null) metrics.push(unavailable("faceShoulder", ["어깨 폭을 측정하지 못했습니다."]));
    else {
      const fw = dist(kp.face.left, kp.face.right);
      const v = fw / sw;
      const reasons = postureFlags.some((f) => f.code === "headTurn") ? ["고개가 돌아가 얼굴 폭이 좁게 잡혔을 수 있습니다."] : [];
      metrics.push({
        ...META.faceShoulder,
        value: round(v, 3),
        display: `1 : ${(1 / v).toFixed(2)}`,
        parts: [
          { label: "얼굴", value: fw },
          { label: "어깨", value: sw },
        ],
        status: reasons.length || conf("shoulder") < 0.5 ? "low" : "ok",
        reasons,
      });
    }
  }

  // 10. 얼굴 길이 : 보이는 목 길이
  {
    const miss = missingOf("chin", "neckBase");
    if (!kp.face) metrics.push(unavailable("faceNeck", ["얼굴 랜드마크가 없습니다."]));
    else if (miss.length)
      metrics.push(unavailable("faceNeck", miss.map((m) => `${LEVEL_LABEL[m]} 기준선 없음 — ${L[m].note ?? ""}`)));
    else {
      const faceLen = dist(kp.face.top, kp.face.chin);
      const neck = y("neckBase")! - y("chin")!;
      if (neck <= 0) metrics.push(unavailable("faceNeck", ["목 밑 기준선이 턱보다 위에 있습니다."]));
      else {
        const reasons = [...notesOf("chin", "neckBase"), "카메라 높이·고개 각도·옷깃에 따라 크게 달라지는 값입니다."];
        const v = neck / faceLen;
        metrics.push({
          ...META.faceNeck,
          value: round(v, 2),
          display: `1 : ${v.toFixed(2)}`,
          parts: [
            { label: "얼굴", value: faceLen },
            { label: "목", value: neck },
          ],
          status: conf("chin", "neckBase") < 0.5 ? "low" : "ok",
          reasons,
        });
      }
    }
  }

  // 11. 좌우 비대칭
  {
    const j = kp.joints;
    const parts: string[] = [];
    let maxPct: number | null = null;
    const diffPct = (a?: Pt, b?: Pt) => (a && b ? (Math.abs(a.y - b.y) / Math.max(1, Math.abs(a.x - b.x))) * 100 : null);
    const sh = diffPct(j.shoulderL, j.shoulderR);
    const hp = diffPct(j.hipL, j.hipR);
    if (sh !== null) parts.push(`어깨 높이차 ${sh.toFixed(1)}%`);
    if (hp !== null) parts.push(`골반 높이차 ${hp.toFixed(1)}%`);
    const ws = kp.widths.waist;
    let waistAsym: number | null = null;
    if (ws) {
      const c = kp.midlineAt(ws.y);
      const l = c - ws.left;
      const r = ws.right - c;
      if (l > 0 && r > 0) {
        waistAsym = (Math.abs(l - r) / ((l + r) / 2)) * 100;
        parts.push(`허리 좌우 폭 차 ${waistAsym.toFixed(1)}%`);
      }
    }
    for (const v of [sh, hp]) if (v !== null) maxPct = Math.max(maxPct ?? 0, v);
    if (!parts.length) metrics.push(unavailable("asymmetry", ["어깨·골반 관절이 인식되지 않았습니다."]));
    else {
      const reasons = postureFlags.map((f) => `자세 영향 가능: ${f.message}`);
      metrics.push({
        ...META.asymmetry,
        value: maxPct !== null ? round(maxPct, 1) : null,
        display: parts.join(" · "),
        status: reasons.length ? "low" : "ok",
        reasons: reasons.length ? reasons : ["높이차는 해당 부위 폭 대비 %입니다. 촬영 자세 영향이 감지되지 않았습니다."],
      });
    }
  }

  return { metrics, postureFlags };
}

/** 촬영 자세가 비대칭 측정에 영향을 줬을 가능성 */
export function detectPostureFlags(
  pose: LandmarkPx[] | null,
  world: { x: number; y: number; z: number }[] | null,
  kp: Keypoints,
): PostureFlag[] {
  const flags: PostureFlag[] = [];
  if (!pose) return flags;
  const g = (i: number) => (pose[i] && pose[i].visibility >= 0.5 ? pose[i] : undefined);

  const eL = g(POSE.leftEye);
  const eR = g(POSE.rightEye);
  if (eL && eR) {
    const a = Math.abs((Math.atan2(eL.y - eR.y, eL.x - eR.x) * 180) / Math.PI);
    const tilt = Math.min(a, 180 - a);
    if (tilt > 4) flags.push({ code: "headTilt", message: `고개가 ${tilt.toFixed(1)}° 기울어져 있습니다.`, value: tilt });
  }
  const nose = g(POSE.nose);
  const earL = g(POSE.leftEar);
  const earR = g(POSE.rightEar);
  if (nose && earL && earR) {
    const dl = Math.abs(earL.x - nose.x);
    const dr = Math.abs(earR.x - nose.x);
    const turn = Math.abs(dl - dr) / Math.max(1, dl + dr);
    if (turn > 0.25) flags.push({ code: "headTurn", message: "고개가 옆으로 돌아가 있습니다.", value: turn });
  }

  if (world && world.length >= 25) {
    const dzS = Math.abs(world[POSE.leftShoulder].z - world[POSE.rightShoulder].z);
    const dzH = Math.abs(world[POSE.leftHip].z - world[POSE.rightHip].z);
    if (dzS > 0.1 || dzH > 0.08)
      flags.push({ code: "bodyRotation", message: "몸통이 카메라 정면에서 돌아가 있습니다(폭이 좁게 측정될 수 있음).", value: Math.max(dzS, dzH) });
  }

  const j = kp.joints;
  const tiltOf = (a?: Pt, b?: Pt) => (a && b ? (Math.atan2(a.y - b.y, Math.abs(a.x - b.x)) * 180) / Math.PI : null);
  const ts = tiltOf(j.shoulderL, j.shoulderR);
  const th = tiltOf(j.hipL, j.hipR);
  if (ts !== null && th !== null && Math.sign(ts) === Math.sign(th) && Math.abs(ts) > 2 && Math.abs(th) > 2) {
    flags.push({
      code: "frameTilt",
      message: "어깨선과 골반선이 같은 방향으로 기울어 있습니다. 카메라가 기울었거나 몸이 한쪽으로 기댄 자세일 수 있습니다.",
    });
  }

  const H = (kp.levels.floor.y ?? 0) - (kp.levels.headTop.y ?? 0);
  if (j.hipL && j.hipR && j.ankleL && j.ankleR && H > 0) {
    const hipX = (j.hipL.x + j.hipR.x) / 2;
    const ankX = (j.ankleL.x + j.ankleR.x) / 2;
    if (Math.abs(hipX - ankX) > H * 0.035)
      flags.push({ code: "weightShift", message: "체중이 한쪽 다리로 쏠려 골반 높이가 달라 보일 수 있습니다." });
  }

  for (const [h, k, a] of [
    [j.hipL, j.kneeL, j.ankleL],
    [j.hipR, j.kneeR, j.ankleR],
  ] as const) {
    if (h && k && a) {
      const ang = angleAt(h, k, a);
      if (ang < 165) {
        flags.push({ code: "kneeBent", message: `무릎이 굽혀져 있습니다(${ang.toFixed(0)}°).`, value: ang });
        break;
      }
    }
  }
  return flags;
}

function armReasons(kp: Keypoints, key: "waist" | "hip"): string[] {
  return kp.warnings.filter((w) => w.code === `armsTouching_${key}`).map((w) => w.message);
}

export const LEVEL_LABEL: Record<LevelId, string> = {
  headTop: "머리끝",
  chin: "턱끝",
  neckBase: "목 밑",
  shoulder: "어깨선",
  waist: "허리선",
  hip: "골반선",
  crotch: "가랑이점",
  floor: "발바닥",
};

const META: Record<MetricId, Omit<Metric, "value" | "display" | "status" | "reasons">> = {
  headToBody: {
    id: "headToBody",
    index: 1,
    label: "머리 : 전신 (등신)",
    definition: "머리끝~턱끝 길이 대비 머리끝~발바닥 높이",
    uses: ["headTop", "chin", "floor"],
  },
  upperLower: {
    id: "upperLower",
    index: 2,
    label: "상체 : 하체",
    definition: "머리끝~허리선 : 허리선~발바닥 (시각적 상하 비율)",
    uses: ["headTop", "waist", "floor"],
  },
  torsoLeg: {
    id: "torsoLeg",
    index: 3,
    label: "몸통 : 다리",
    definition: "어깨선~가랑이점 : 가랑이점~발바닥",
    uses: ["shoulder", "crotch", "floor"],
  },
  shoulderHip: {
    id: "shoulderHip",
    index: 4,
    label: "어깨너비 : 골반너비",
    definition: "어깨 관절 높이의 실루엣 폭 : 골반에서 가장 넓은 실루엣 폭",
    uses: ["shoulder", "hip"],
  },
  waistHip: {
    id: "waistHip",
    index: 5,
    label: "허리너비 : 골반너비",
    definition: "허리선의 실루엣 폭 : 골반선의 실루엣 폭",
    uses: ["waist", "hip"],
  },
  waistHeight: {
    id: "waistHeight",
    index: 6,
    label: "허리 위치 높이",
    definition: "발바닥~허리선 높이 ÷ 전신 높이",
    uses: ["headTop", "waist", "floor"],
  },
  thighCalf: {
    id: "thighCalf",
    index: 7,
    label: "허벅지 : 종아리",
    definition: "고관절~무릎 관절 : 무릎~발목 관절 (관절 중심 간 직선거리, 좌우 평균)",
    uses: ["joints"],
  },
  shoulderSlope: {
    id: "shoulderSlope",
    index: 8,
    label: "어깨 경사",
    definition: "목 옆선에서 어깨 끝 방향 윗윤곽의 수평 대비 하강 각도",
    uses: ["neckBase", "shoulder"],
  },
  faceShoulder: {
    id: "faceShoulder",
    index: 9,
    label: "얼굴너비 : 어깨너비",
    definition: "광대 높이 얼굴 윤곽 폭(랜드마크 234–454) : 어깨 실루엣 폭",
    uses: ["face", "shoulder"],
  },
  faceNeck: {
    id: "faceNeck",
    index: 10,
    label: "얼굴 길이 : 보이는 목 길이",
    definition: "얼굴 메시 상단~턱끝 : 턱끝~목 밑(목·승모근 경계)",
    uses: ["face", "chin", "neckBase"],
  },
  asymmetry: {
    id: "asymmetry",
    index: 11,
    label: "좌우 비대칭",
    definition: "어깨·골반 관절 높이차(해당 부위 폭 대비 %), 허리 좌우 폭 차",
    uses: ["joints", "waist"],
  },
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

function angleAt(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
