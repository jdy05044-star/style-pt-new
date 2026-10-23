import { describe, expect, it } from "vitest";
import { computeKeypoints } from "../src/lib/analysis/keypoints";
import { computeBodyMetrics, detectPostureFlags } from "../src/lib/analysis/bodyRatios";
import { POSE } from "../src/lib/analysis/landmarkIndex";
import { H, W, makeDetection, makePose } from "./fixtures";
import type { MetricId } from "../src/lib/types";

const metric = (det = makeDetection(), over = {}) => {
  const kp = computeKeypoints(det, W, H, over);
  const r = computeBodyMetrics(kp, det.pose, det.worldPose);
  const get = (id: MetricId) => r.metrics.find((m) => m.id === id)!;
  return { kp, r, get };
};

describe("computeKeypoints – 합성 인체에서 기준선 자동 검출", () => {
  const { kp } = metric();
  it("머리끝·턱·바닥", () => {
    expect(kp.levels.headTop.y).toBeGreaterThanOrEqual(100);
    expect(kp.levels.headTop.y).toBeLessThanOrEqual(103);
    expect(kp.levels.chin.y).toBe(218);
    expect(kp.levels.floor.y).toBeCloseTo(980, 0);
  });
  it("허리선은 가장 좁은 높이(420) 근처", () => {
    expect(Math.abs(kp.levels.waist.y! - 420)).toBeLessThan(4);
    const w = kp.widths.waist!;
    expect(w.right - w.left).toBeGreaterThan(98);
    expect(w.right - w.left).toBeLessThan(104);
  });
  it("골반선 폭 150, 어깨 폭 160", () => {
    expect(kp.widths.hip!.right - kp.widths.hip!.left).toBeCloseTo(150, 0);
    expect(kp.widths.shoulder!.right - kp.widths.shoulder!.left).toBeCloseTo(160, 0);
  });
  it("가랑이점 = 다리 틈 시작(560)", () => {
    expect(kp.levels.crotch.y).toBeCloseTo(560, 0);
  });
  it("목 밑 = 목이 어깨로 넓어지는 지점(250~258)", () => {
    expect(kp.levels.neckBase.y).toBeGreaterThan(249);
    expect(kp.levels.neckBase.y).toBeLessThan(259);
  });
});

describe("computeBodyMetrics – 알려진 치수와 일치", () => {
  const { get } = metric();
  it("등신 ≈ 879/117 = 7.5", () => {
    expect(get("headToBody").value!).toBeGreaterThan(7.4);
    expect(get("headToBody").value!).toBeLessThan(7.6);
  });
  it("어깨:골반 = 160/150", () => {
    expect(get("shoulderHip").value).toBeCloseTo(1.07, 2);
  });
  it("허리:골반 ≈ 0.67", () => {
    expect(get("waistHip").value!).toBeGreaterThan(0.65);
    expect(get("waistHip").value!).toBeLessThan(0.7);
  });
  it("몸통:다리 = 280 : 420", () => {
    expect(get("torsoLeg").display).toBe("40 : 60");
    expect(get("torsoLeg").value).toBeCloseTo(1.5, 2);
  });
  it("허벅지:종아리 = 220/200", () => {
    expect(get("thighCalf").value).toBeCloseTo(1.1, 2);
  });
  it("어깨 경사 ≈ atan(20/62) = 17.9°", () => {
    expect(get("shoulderSlope").value!).toBeGreaterThan(15);
    expect(get("shoulderSlope").value!).toBeLessThan(21);
  });
  it("얼굴:어깨 = 72/160", () => {
    expect(get("faceShoulder").value).toBeCloseTo(0.45, 2);
  });
  it("대칭 인체는 비대칭 0%", () => {
    expect(get("asymmetry").value).toBe(0);
  });
  it("11개 항목 모두 반환", () => {
    expect(metric().r.metrics).toHaveLength(11);
  });
});

describe("측정 불가 처리 – 임의 수치를 만들지 않음", () => {
  it("다리를 붙이면 가랑이점 missing → 몸통:다리 측정 불가", () => {
    const { kp, get } = metric(makeDetection({ legsTogether: true }));
    expect(kp.levels.crotch.source).toBe("missing");
    expect(get("torsoLeg").status).toBe("unavailable");
    expect(get("torsoLeg").value).toBeNull();
  });
  it("얼굴 미검출 → 턱 missing → 등신·얼굴 비율 측정 불가", () => {
    const { get } = metric(makeDetection({ noFace: true }));
    expect(get("headToBody").status).toBe("unavailable");
    expect(get("faceShoulder").status).toBe("unavailable");
    expect(get("faceNeck").status).toBe("unavailable");
  });
  it("수동 지정한 가랑이점으로 다시 계산", () => {
    const { kp, get } = metric(makeDetection({ legsTogether: true }), { crotch: 560 });
    expect(kp.levels.crotch.source).toBe("manual");
    expect(get("torsoLeg").display).toBe("40 : 60");
  });
  it("실루엣 마스크가 없으면 폭 관련 항목 불가, 관절 기반 항목은 계산", () => {
    const det = { ...makeDetection(), personMask: null };
    const { get } = metric(det);
    expect(get("shoulderHip").status).toBe("unavailable");
    expect(get("waistHip").status).toBe("unavailable");
    expect(get("thighCalf").status).toBe("ok");
  });
  it("포즈가 없으면 얼굴에서 얻는 턱끝을 제외한 기준선 모두 missing", () => {
    const det = { ...makeDetection(), pose: null };
    const kp = computeKeypoints(det, W, H);
    expect(Object.values(kp.levels).filter((l) => l.id !== "chin").every((l) => l.source === "missing")).toBe(true);
  });
});

describe("팔이 몸통에 붙은 사진", () => {
  it("경고를 내고 허리·골반 신뢰도를 낮춤", () => {
    const det = makeDetection({ armsTouching: true });
    det.pose![POSE.leftWrist] = { x: 285, y: 520, z: 0, visibility: 0.99 };
    det.pose![POSE.rightWrist] = { x: 115, y: 520, z: 0, visibility: 0.99 };
    const { kp, get } = metric(det);
    expect(kp.warnings.some((w) => w.code === "armsTouching_hip")).toBe(true);
    expect(get("waistHip").status).toBe("low");
  });
});

describe("detectPostureFlags – 촬영 자세 영향 구분", () => {
  it("한쪽 어깨·골반이 같은 방향으로 기울면 frameTilt", () => {
    const pose = makePose({
      [POSE.leftShoulder]: { y: 290 },
      [POSE.rightShoulder]: { y: 270 },
      [POSE.leftHip]: { y: 548 },
      [POSE.rightHip]: { y: 532 },
    });
    const det = { ...makeDetection(), pose };
    const kp = computeKeypoints(det, W, H);
    const flags = detectPostureFlags(pose, null, kp);
    expect(flags.map((f) => f.code)).toContain("frameTilt");
    const asym = computeBodyMetrics(kp, pose, null).metrics.find((m) => m.id === "asymmetry")!;
    expect(asym.status).toBe("low");
  });
  it("월드 좌표 z 차이가 크면 몸통 회전", () => {
    const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
    world[POSE.leftShoulder].z = 0.15;
    const det = makeDetection();
    const kp = computeKeypoints(det, W, H);
    expect(detectPostureFlags(det.pose, world, kp).map((f) => f.code)).toContain("bodyRotation");
  });
  it("무릎 굽힘 감지", () => {
    const pose = makePose({ [POSE.leftKnee]: { x: 280 } });
    const det = { ...makeDetection(), pose };
    const kp = computeKeypoints(det, W, H);
    expect(detectPostureFlags(pose, null, kp).map((f) => f.code)).toContain("kneeBent");
  });
});
