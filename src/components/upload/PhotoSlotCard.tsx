"use client";
import { forwardRef } from "react";
import type { PhotoKind } from "@/lib/types";
import type { PhotoSlot } from "@/lib/store/AnalysisStore";
import { GUIDES } from "@/lib/guide";
import { GuideIllustration } from "./GuideIllustration";
import { IssueList } from "../ui/primitives";

interface Props {
  kind: PhotoKind;
  slot: PhotoSlot;
  onFile: (f: File | null) => void;
  onGuide: () => void;
}

export const PhotoSlotCard = forwardRef<HTMLInputElement, Props>(function PhotoSlotCard({ kind, slot, onFile, onGuide }, ref) {
  const g = GUIDES[kind];
  const inputId = `file-${kind}`;
  const issues = slot.analysis?.issues ?? [];
  const hasError = issues.some((i) => i.level === "error");
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-3 p-3">
        <label htmlFor={inputId} className="relative block aspect-[4/5] w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-shell">
          {slot.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.previewUrl} alt={`${g.title} 미리보기`} className="h-full w-full object-cover" />
          ) : (
            <GuideIllustration kind={kind} className="h-full w-full" />
          )}
          {slot.status === "analyzing" && (
            <span className="absolute inset-0 grid place-items-center bg-white/70 text-[11px] font-semibold text-coral-deep">분석 중…</span>
          )}
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="text-[15px]">{g.title}</b>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${g.required ? "bg-blush text-coral-deep" : "bg-shell text-mute"}`}>
              {g.required ? "필수" : "선택"}
            </span>
            {slot.status === "done" && (
              <span className={`text-[11px] font-semibold ${hasError ? "text-bad" : "text-ok"}`}>{hasError ? "재촬영 필요" : "✓ 인식 완료"}</span>
            )}
            {slot.status === "failed" && <span className="text-[11px] font-semibold text-bad">분석 실패</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-mute">{g.usedFor}</p>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={onGuide} className="rounded-full border border-line px-3 py-1.5 text-[12px]">
              촬영 가이드
            </button>
            <label htmlFor={inputId} className="cursor-pointer rounded-full bg-ink px-3 py-1.5 text-[12px] text-white">
              {slot.file ? "다시 선택" : "사진 선택"}
            </label>
            {slot.file && (
              <button type="button" onClick={() => onFile(null)} className="px-1 text-[12px] text-mute underline">
                삭제
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFile(f);
          e.target.value = "";
        }}
      />
      {(issues.length > 0 || slot.error) && (
        <div className="border-t border-line px-3 py-3">
          {slot.error && <p className="mb-2 text-xs text-bad">오류: {slot.error}</p>}
          <IssueList issues={issues} compact />
        </div>
      )}
    </div>
  );
});
