"use client";
import { useId } from "react";
import type { LevelId } from "@/lib/types";
import { DEFAULT_FIGURE, smoothPath, type FigureModel } from "@/lib/analysis/figureModel";
import { LEVEL_LABEL } from "@/lib/analysis/bodyRatios";

type WidthKey = "neck" | "shoulder" | "waist" | "hip";

interface Props {
  model?: FigureModel;
  /** 강조할 기준선 */
  highlightLevels?: LevelId[];
  /** 강조할 폭 */
  highlightWidths?: WidthKey[];
  /** 기준선 오른쪽에 붙일 짧은 텍스트 */
  showLabels?: boolean;
  className?: string;
  /** 측정되지 않은 부분 안내 문구 표시 */
  showDefaultNote?: boolean;
}

const VW = 240;
const VH = 520;
const TOP = 22;
const S = 470;
const CX = 104;

/**
 * 측정값으로 비율을 맞춘 독자적 인체 일러스트.
 * 측정되지 않은 부위는 기본 비율로 그리고 점선으로 구분합니다(수치는 표시하지 않음).
 */
export function BodyFigure({
  model = DEFAULT_FIGURE,
  highlightLevels = [],
  highlightWidths = [],
  showLabels = true,
  className,
  showDefaultNote = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const { y, half: h, measured } = model;
  const Y = (f: number) => TOP + f * S;
  const X = (f: number, side: 1 | -1) => CX + side * f * S;

  const shY = y.shoulder;
  const nb = y.neckBase;
  const outer: [number, number][] = [
    [h.neck, y.chin + (nb - y.chin) * 0.25],
    [h.neck * 1.06, nb],
    [h.neck + (h.shoulder - h.neck) * 0.62, nb + (shY - nb) * 0.65 + 0.004],
    [h.shoulder, shY + 0.014],
    [h.shoulder * 0.9, shY + 0.07],
    [h.waist, y.waist],
    [h.hip, y.hip],
    [h.hip * 0.94, y.crotch + 0.045],
    [h.hip * 0.55, y.knee],
    [h.hip * 0.52, y.knee + (y.floor - y.knee) * 0.32],
    [h.hip * 0.28, y.floor - 0.035],
    [h.hip * 0.38, y.floor - 0.004],
  ];
  const inner: [number, number][] = [
    [h.hip * 0.1, y.floor - 0.004],
    [h.hip * 0.1, y.floor - 0.035],
    [h.hip * 0.13, y.knee + (y.floor - y.knee) * 0.32],
    [h.hip * 0.1, y.knee],
    [h.hip * 0.06, y.crotch + 0.02],
  ];
  const toXY = (pts: [number, number][], side: 1 | -1) => pts.map(([fx, fy]) => [X(fx, side), Y(fy)] as [number, number]);
  const loop: [number, number][] = [
    ...toXY(outer, 1),
    ...toXY(inner, 1),
    [CX, Y(y.crotch)],
    ...toXY([...inner].reverse(), -1),
    ...toXY([...outer].reverse(), -1),
  ];
  const bodyD = smoothPath(loop, true);

  const arm = (side: 1 | -1) =>
    smoothPath([
      [X(h.shoulder * 0.96, side), Y(shY + 0.03)],
      [X(h.shoulder + 0.012, side), Y(shY + 0.09)],
      [X(h.shoulder + 0.03, side), Y(y.waist + 0.01)],
      [X(h.shoulder + 0.05, side), Y(y.crotch - 0.01)],
    ]);

  const headCy = Y((y.headTop + y.chin) / 2);
  const headRy = ((y.chin - y.headTop) / 2) * S;
  const headRx = h.head * S;

  const levels: LevelId[] = ["headTop", "chin", "neckBase", "shoulder", "waist", "hip", "crotch", "floor"];
  const widthY: Record<WidthKey, number> = {
    neck: (y.chin + nb) / 2,
    shoulder: shY,
    waist: y.waist,
    hip: y.hip,
  };
  const anyDefault = levels.some((l) => !measured[l]);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={className} role="img" aria-label="신체 비율 일러스트">
      <defs>
        <linearGradient id={`skin-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7e1" />
          <stop offset="1" stopColor="#f4d9d0" />
        </linearGradient>
      </defs>

      {/* 팔 */}
      {[1, -1].map((s) => (
        <path key={s} d={arm(s as 1 | -1)} stroke={`url(#skin-${uid})`} strokeWidth={S * 0.034} strokeLinecap="round" fill="none" />
      ))}
      {[1, -1].map((s) => (
        <path key={`o${s}`} d={arm(s as 1 | -1)} stroke="#e2b7ab" strokeWidth={0.8} fill="none" opacity={0.6} />
      ))}
      {/* 몸 */}
      <path d={bodyD} fill={`url(#skin-${uid})`} stroke="#d99a8b" strokeWidth={1.1} strokeLinejoin="round" />
      {/* 머리 */}
      <ellipse cx={CX} cy={headCy} rx={headRx} ry={headRy} fill={`url(#skin-${uid})`} stroke="#d99a8b" strokeWidth={1.1} />
      {/* 중심선 */}
      <line x1={CX} x2={CX} y1={Y(0) - 6} y2={Y(1) + 6} stroke="#e8d6cc" strokeDasharray="2 4" />

      {/* 기준선 */}
      {levels.map((id) => {
        const hl = highlightLevels.includes(id);
        const yy = Y(y[id]);
        const m = measured[id];
        return (
          <g key={id}>
            <line
              x1={CX - S * 0.16}
              x2={CX + S * 0.16}
              y1={yy}
              y2={yy}
              stroke={hl ? "#c96a57" : "#d8c3b7"}
              strokeWidth={hl ? 1.6 : 0.8}
              strokeDasharray={m ? undefined : "3 3"}
            />
            {showLabels && (
              <text
                x={CX + S * 0.17}
                y={yy + 3.5}
                fontSize={10}
                fill={hl ? "#c96a57" : "#a8948b"}
                fontWeight={hl ? 700 : 400}
              >
                {LEVEL_LABEL[id]}
                {!m ? " ·기본" : ""}
              </text>
            )}
          </g>
        );
      })}

      {/* 폭 강조 */}
      {highlightWidths.map((k) => {
        const yy = Y(widthY[k]) - (k === "neck" ? 0 : 0);
        const hw = h[k] * S;
        return (
          <g key={k}>
            <line x1={CX - hw} x2={CX + hw} y1={yy} y2={yy} stroke="#e58b78" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
            <circle cx={CX - hw} cy={yy} r={3} fill="#fff" stroke="#c96a57" strokeWidth={1.4} />
            <circle cx={CX + hw} cy={yy} r={3} fill="#fff" stroke="#c96a57" strokeWidth={1.4} />
          </g>
        );
      })}

      {showDefaultNote && anyDefault && (
        <text x={8} y={VH - 6} fontSize={9} fill="#a8948b">
          점선·&apos;기본&apos; 표시는 측정되지 않아 기본 비율로 그린 부분입니다
        </text>
      )}
    </svg>
  );
}
