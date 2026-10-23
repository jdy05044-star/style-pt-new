"use client";
import { useState } from "react";
import type { Metric } from "@/lib/types";
import { RatioBar, StatusBadge } from "../ui/primitives";

export function MetricCard({ m, active, onSelect }: { m: Metric; active?: boolean; onSelect?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`card p-4 transition ${active ? "border-coral ring-2 ring-blush" : ""} ${m.status === "unavailable" ? "bg-[#fdfbfa]" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {m.index > 0 && <p className="text-[11px] text-mute tabular">{String(m.index).padStart(2, "0")}</p>}
          <h3 className="text-[14px] font-semibold leading-tight">{m.label}</h3>
        </div>
        <StatusBadge status={m.status} />
      </div>
      <p className={`mt-2 font-display tabular leading-tight ${m.status === "unavailable" ? "text-base text-mute" : "text-[1.6rem] text-ink"}`}>
        {m.display}
      </p>
      {m.parts && m.status !== "unavailable" && (
        <div className="mt-3">
          <RatioBar parts={m.parts} />
        </div>
      )}
      <button
        type="button"
        className="mt-3 text-[12px] text-coral-deep"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {open ? "접기" : "측정 기준 · 참고 사항"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 text-[12px] leading-snug text-mute">
          <p>
            <b className="text-ink">측정 기준</b> {m.definition}
          </p>
          {m.reasons.map((r) => (
            <p key={r}>• {r}</p>
          ))}
        </div>
      )}
      {!open && m.status === "unavailable" && m.reasons[0] && <p className="mt-1 text-[12px] leading-snug text-bad/80">{m.reasons[0]}</p>}
    </div>
  );
}
