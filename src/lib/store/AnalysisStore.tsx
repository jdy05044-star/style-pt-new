"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { LevelId, LevelOverrides, PhotoAnalysis, PhotoKind } from "../types";

export type SlotStatus = "empty" | "ready" | "analyzing" | "done" | "failed";

export interface PhotoSlot {
  file?: File;
  previewUrl?: string;
  status: SlotStatus;
  analysis?: PhotoAnalysis;
  error?: string;
}

interface Store {
  slots: Record<PhotoKind, PhotoSlot>;
  overrides: LevelOverrides;
  setFile: (kind: PhotoKind, file: File | null) => void;
  analyzeAll: () => Promise<void>;
  analyzing: boolean;
  modelError: string | null;
  setOverride: (id: LevelId, y: number | null) => void;
  resetOverrides: () => void;
  clearAll: () => void;
}

const empty = (): Record<PhotoKind, PhotoSlot> => ({
  frontBody: { status: "empty" },
  sideBody: { status: "empty" },
  frontFace: { status: "empty" },
  sideFace: { status: "empty" },
});

const Ctx = createContext<Store | null>(null);

/**
 * 사진과 분석 결과는 이 컴포넌트의 메모리(state)에만 존재합니다.
 * localStorage/서버 어디에도 저장하지 않으며, 새로고침·탭 닫기 시 사라집니다.
 */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState(empty);
  const [overrides, setOverrides] = useState<LevelOverrides>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const setFile = useCallback((kind: PhotoKind, file: File | null) => {
    setSlots((s) => {
      if (s[kind].previewUrl) URL.revokeObjectURL(s[kind].previewUrl!);
      return {
        ...s,
        [kind]: file ? { file, previewUrl: URL.createObjectURL(file), status: "ready" } : { status: "empty" },
      };
    });
    if (kind === "frontBody") setOverrides({});
  }, []);

  const analyzeAll = useCallback(async () => {
    setAnalyzing(true);
    setModelError(null);
    const { analyzePhoto } = await import("../mediapipe/detect");
    const current = slotsRef.current;
    for (const kind of Object.keys(current) as PhotoKind[]) {
      const slot = current[kind];
      if (!slot.file || slot.status === "done") continue;
      setSlots((s) => ({ ...s, [kind]: { ...s[kind], status: "analyzing", error: undefined } }));
      try {
        const analysis = await analyzePhoto(kind, slot.file);
        setSlots((s) => ({ ...s, [kind]: { ...s[kind], status: "done", analysis } }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isModel = /fetch|wasm|model|network|Failed to/i.test(msg);
        if (isModel) setModelError("분석 모델을 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
        setSlots((s) => ({ ...s, [kind]: { ...s[kind], status: "failed", error: msg } }));
      }
    }
    setAnalyzing(false);
  }, []);

  const setOverride = useCallback((id: LevelId, y: number | null) => {
    setOverrides((o) => {
      const n = { ...o };
      if (y === null) delete n[id];
      else n[id] = y;
      return n;
    });
  }, []);

  const resetOverrides = useCallback(() => setOverrides({}), []);

  const clearAll = useCallback(() => {
    for (const s of Object.values(slotsRef.current)) if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    setSlots(empty());
    setOverrides({});
  }, []);

  const value = useMemo(
    () => ({ slots, overrides, setFile, analyzeAll, analyzing, modelError, setOverride, resetOverrides, clearAll }),
    [slots, overrides, setFile, analyzeAll, analyzing, modelError, setOverride, resetOverrides, clearAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalysis() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAnalysis 는 AnalysisProvider 안에서만 사용할 수 있습니다.");
  return v;
}
