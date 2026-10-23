import { describe, expect, it } from "vitest";
import { firstGapInColumn, maskFromCategory, maskFromFloat, runAt, subtract } from "../src/lib/mask/mask";
import { assessImageQuality, laplacianVariance, meanBrightness } from "../src/lib/image/quality";
import { assessFrontFace, yawRatio } from "../src/lib/analysis/detectionQuality";
import { makeFace } from "./fixtures";
import { FACE } from "../src/lib/analysis/landmarkIndex";

describe("mask utilities", () => {
  const m = maskFromFloat([0, 0.9, 0.9, 0, 0.9, 0, 0.2, 0.8], 8, 1);
  it("threshold", () => {
    expect(Array.from(m.data)).toEqual([0, 1, 1, 0, 1, 0, 0, 1]);
  });
  it("runAt 은 연속 구간만 반환(팔-몸통 틈 구분)", () => {
    expect(runAt(m, 1.5, 0.5, 8, 1)).toEqual({ left: 1, right: 3 });
    expect(runAt(m, 4.2, 0.5, 8, 1)).toEqual({ left: 4, right: 5 });
  });
  it("마스크 해상도가 이미지와 달라도 이미지 좌표로 환산", () => {
    // 마스크 8px ↔ 이미지 80px
    expect(runAt(m, 15, 5, 80, 10)).toEqual({ left: 10, right: 30 });
  });
  it("firstGapInColumn", () => {
    const col = maskFromFloat([1, 1, 1, 0, 0, 1], 1, 6);
    expect(firstGapInColumn(col, 0, 0, 5, 1, 6, 0)).toBe(3);
  });
  it("subtract 로 머리카락 제외", () => {
    const person = maskFromCategory(new Uint8Array([1, 1, 2, 0]), 4, 1, [1, 2]);
    const hair = maskFromCategory(new Uint8Array([1, 1, 2, 0]), 4, 1, [1]);
    expect(Array.from(subtract(person, hair).data)).toEqual([0, 0, 1, 0]);
  });
});

describe("image quality", () => {
  const W = 64;
  const H = 64;
  const flat = new Float32Array(W * H).fill(30);
  const checker = new Float32Array(W * H).map((_, i) => (((i % W) + Math.floor(i / W)) % 2 ? 230 : 40));
  it("어두운 이미지 감지", () => {
    expect(meanBrightness(flat)).toBe(30);
    const issues = assessImageQuality({ width: W, height: H, gray: flat, grayW: W, grayH: H, originalShortSide: 1000 });
    expect(issues.map((i) => i.code)).toContain("tooDark");
    expect(issues.map((i) => i.code)).toContain("blurry");
  });
  it("선명한 패턴은 흐림 아님", () => {
    expect(laplacianVariance(checker, W, H)).toBeGreaterThan(1000);
    const issues = assessImageQuality({ width: W, height: H, gray: checker, grayW: W, grayH: H, originalShortSide: 1000 });
    expect(issues.map((i) => i.code)).not.toContain("blurry");
  });
  it("저해상도 경고", () => {
    const issues = assessImageQuality({ width: W, height: H, gray: checker, grayW: W, grayH: H, originalShortSide: 300 });
    expect(issues.map((i) => i.code)).toContain("lowResolution");
  });
});

describe("face quality", () => {
  it("정면 얼굴 yaw ≈ 0", () => {
    const f = makeFace();
    expect(Math.abs(yawRatio(f[FACE.rightCheek], f[FACE.leftCheek], f[FACE.noseTip]))).toBeLessThan(0.01);
  });
  it("얼굴 미검출 → 재촬영 error", () => {
    const issues = assessFrontFace(null, 400, 400);
    expect(issues[0].level).toBe("error");
    expect(issues[0].retake).toBe(true);
  });
  it("고개를 돌리면 faceYaw", () => {
    const f = makeFace();
    f[FACE.noseTip] = { ...f[FACE.noseTip], x: 225 };
    expect(assessFrontFace({ landmarks: f, fromCrop: false }, 200, 400).map((i) => i.code)).toContain("faceYaw");
  });
});
