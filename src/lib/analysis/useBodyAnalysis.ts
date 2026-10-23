"use client";
import { useMemo } from "react";
import type { BodyMetricsResult, Keypoints, LevelOverrides, PhotoAnalysis } from "../types";
import { computeKeypoints } from "./keypoints";
import { computeBodyMetrics } from "./bodyRatios";

/** 정면 전신 분석 결과 + 사용자 보정 → 기준선·비율 (보정할 때마다 즉시 재계산) */
export function useBodyAnalysis(
  front: PhotoAnalysis | undefined,
  overrides: LevelOverrides,
): { kp: Keypoints | null; result: BodyMetricsResult | null } {
  return useMemo(() => {
    if (!front?.body?.pose) return { kp: null, result: null };
    const kp = computeKeypoints(front.body, front.width, front.height, overrides);
    const result = computeBodyMetrics(kp, front.body.pose, front.body.worldPose);
    return { kp, result };
  }, [front, overrides]);
}
