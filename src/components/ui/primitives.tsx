"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MetricStatus, QualityIssue } from "@/lib/types";

export function TopBar({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/70 bg-paper/90 px-4 backdrop-blur">
      {back ? (
        <Link href={back} className="-ml-2 rounded-full px-2 py-1 text-sm text-mute" aria-label="뒤로">
          ← 뒤로
        </Link>
      ) : (
        <span className="font-display text-lg tracking-wide">STYLE PT</span>
      )}
      {title && <span className="text-sm font-semibold">{title}</span>}
      <span className="w-12" />
    </header>
  );
}

export function StatusBadge({ status }: { status: MetricStatus }) {
  const map = {
    ok: { t: "측정됨", c: "bg-[#eaf3ee] text-ok" },
    low: { t: "신뢰도 낮음", c: "bg-[#fbf1e2] text-warn" },
    unavailable: { t: "측정 불가", c: "bg-[#f7e7e5] text-bad" },
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map.c}`}>{map.t}</span>;
}

export function IssueList({ issues, compact }: { issues: QualityIssue[]; compact?: boolean }) {
  if (!issues.length) return null;
  const sorted = [...issues].sort((a, b) => rank(a.level) - rank(b.level));
  return (
    <ul className={`space-y-1.5 ${compact ? "text-xs" : "text-sm"}`}>
      {sorted.map((i) => (
        <li
          key={i.code}
          className={`flex gap-2 rounded-xl px-3 py-2 leading-snug ${
            i.level === "error" ? "bg-[#f7e7e5] text-bad" : i.level === "warn" ? "bg-[#fbf1e2] text-[#9a6a25]" : "bg-shell text-mute"
          }`}
        >
          <span aria-hidden>{i.level === "error" ? "⛔" : i.level === "warn" ? "⚠️" : "ℹ️"}</span>
          <span>
            {i.message}
            {i.retake && <b className="ml-1 whitespace-nowrap">· 재촬영 권장</b>}
          </span>
        </li>
      ))}
    </ul>
  );
}
const rank = (l: QualityIssue["level"]) => (l === "error" ? 0 : l === "warn" ? 1 : 2);

const BAR_COLORS = ["#e58b78", "#efc9bd", "#d9a3a0", "#efe2d6"];

/** 구성 비율 막대 */
export function RatioBar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-shell">
        {parts.map((p, i) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: BAR_COLORS[i % 4] }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-mute tabular">
        {parts.map((p) => (
          <span key={p.label}>
            {p.label} {((p.value / total) * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function Section({ eyebrow, title, children, right }: { eyebrow?: string; title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="px-4 py-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="font-display text-[1.35rem] leading-tight">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-13 w-full rounded-2xl bg-coral px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(201,106,87,0.6)] transition active:scale-[0.99] disabled:bg-sand disabled:text-mute disabled:shadow-none"
    >
      {children}
    </button>
  );
}
