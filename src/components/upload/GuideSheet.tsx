"use client";
import { useEffect } from "react";
import type { PhotoKind } from "@/lib/types";
import { GUIDES } from "@/lib/guide";
import { GuideIllustration } from "./GuideIllustration";

export function GuideSheet({ kind, onClose, onPick }: { kind: PhotoKind | null; onClose: () => void; onPick: (k: PhotoKind) => void }) {
  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [kind, onClose]);

  if (!kind) return null;
  const g = GUIDES[kind];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30" onClick={onClose} role="dialog" aria-modal aria-label={`${g.title} 촬영 가이드`}>
      <div
        className="max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-sand" />
        <p className="eyebrow">Shooting guide</p>
        <h3 className="font-display text-xl">{g.title} 촬영 방법</h3>
        <div className="mt-4 flex gap-4">
          <GuideIllustration kind={kind} className="w-32 shrink-0" />
          <p className="text-[13px] leading-relaxed text-mute">
            <b className="block text-ink">이 사진으로 분석하는 것</b>
            {g.usedFor}
          </p>
        </div>
        <h4 className="mt-5 text-sm font-semibold">이렇게 찍어 주세요</h4>
        <ul className="mt-2 space-y-2 text-[13.5px] leading-snug">
          {g.checklist.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-0.5 text-coral">✓</span>
              {c}
            </li>
          ))}
        </ul>
        <h4 className="mt-5 text-sm font-semibold">피해 주세요</h4>
        <ul className="mt-2 space-y-2 text-[13.5px] leading-snug text-mute">
          {g.avoid.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-0.5 text-bad">✕</span>
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-shell p-3 text-[12px] leading-relaxed text-mute">
          사진 속 길이는 렌즈 원근 때문에 카메라에 가까운 부위가 커 보입니다. 같은 거리·높이에서 촬영할수록 비율이 안정적입니다.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="h-12 rounded-2xl border border-line text-sm">
            닫기
          </button>
          <button
            onClick={() => {
              onPick(kind);
              onClose();
            }}
            className="h-12 rounded-2xl bg-coral text-sm font-semibold text-white"
          >
            사진 선택
          </button>
        </div>
      </div>
    </div>
  );
}
