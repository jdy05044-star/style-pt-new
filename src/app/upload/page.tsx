"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_KINDS, type PhotoKind } from "@/lib/types";
import { useAnalysis } from "@/lib/store/AnalysisStore";
import { PhotoSlotCard } from "@/components/upload/PhotoSlotCard";
import { GuideSheet } from "@/components/upload/GuideSheet";
import { PrimaryButton, TopBar } from "@/components/ui/primitives";

export default function UploadPage() {
  const { slots, setFile, analyzeAll, analyzing, modelError } = useAnalysis();
  const [guide, setGuide] = useState<PhotoKind | null>(null);
  const [consent, setConsent] = useState(false);
  const inputs = useRef<Partial<Record<PhotoKind, HTMLInputElement | null>>>({});
  const router = useRouter();

  const hasFront = !!slots.frontBody.file;
  const pending = PHOTO_KINDS.filter((k) => slots[k].file && slots[k].status !== "done").length;
  const anyDone = PHOTO_KINDS.some((k) => slots[k].status === "done");
  const frontFatal = slots.frontBody.analysis?.issues.some((i) => i.code === "noPerson");

  const run = async () => {
    await analyzeAll();
    router.push("/analysis");
  };

  return (
    <main className="pb-36">
      <TopBar back="/" title="사진 준비" />
      <div className="px-4 pt-5">
        <p className="eyebrow">Step 1</p>
        <h1 className="font-display text-2xl leading-snug">분석할 사진을 준비해 주세요</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          각 사진의 <b className="text-ink">촬영 가이드</b>를 먼저 확인하면 측정 정확도가 크게 올라갑니다. 정면 전신 사진만 있어도 신체 비율 분석은 가능합니다.
        </p>
      </div>

      <div className="mt-5 space-y-3 px-4">
        {PHOTO_KINDS.map((k) => (
          <PhotoSlotCard
            key={k}
            kind={k}
            slot={slots[k]}
            onFile={(f) => setFile(k, f)}
            onGuide={() => setGuide(k)}
            ref={(el) => {
              inputs.current[k] = el;
            }}
          />
        ))}
      </div>

      {modelError && <p className="mx-4 mt-4 rounded-xl bg-[#f7e7e5] p-3 text-sm text-bad">{modelError}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <label className="mb-3 flex items-start gap-2 text-[12px] leading-snug text-mute">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#e58b78]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            사진은 이 기기의 브라우저 안에서만 분석되며 서버 저장·AI 학습에 쓰이지 않는다는 점, 결과가 사진 기준의 상대 비율(실제 치수·의학적 진단 아님)이라는 점을 확인했습니다.
          </span>
        </label>
        {pending > 0 || !anyDone ? (
          <PrimaryButton disabled={!hasFront || !consent || analyzing} onClick={run}>
            {analyzing ? "랜드마크 추출 중… (처음엔 모델 다운로드로 수십 초 걸릴 수 있어요)" : hasFront ? `사진 ${pending}장 분석하기` : "정면 전신 사진을 추가해 주세요"}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={!!frontFatal} onClick={() => router.push("/analysis")}>
            결과 보기
          </PrimaryButton>
        )}
      </div>

      <GuideSheet kind={guide} onClose={() => setGuide(null)} onPick={(k) => inputs.current[k]?.click()} />
    </main>
  );
}
