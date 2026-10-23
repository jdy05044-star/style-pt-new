"use client";
import { useRef, useState } from "react";
import type { Keypoints, LevelId, PhotoAnalysis } from "@/lib/types";
import { LEVEL_IDS } from "@/lib/types";
import { POSE_CONNECTIONS } from "@/lib/analysis/landmarkIndex";
import { LEVEL_LABEL } from "@/lib/analysis/bodyRatios";

interface Props {
  photo: PhotoAnalysis;
  kp: Keypoints | null;
  editMode?: boolean;
  highlight?: LevelId[];
  onCommitLevel?: (id: LevelId, y: number) => void;
  showSkeleton?: boolean;
}

/** 실제 사진 위 SVG 분석선(기준선·폭·골격·얼굴·어깨 경사) + 드래그 보정 */
export function BodyOverlay({ photo, kp, editMode = false, highlight = [], onCommitLevel, showSkeleton = true }: Props) {
  const { width: W, height: H } = photo;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: LevelId; y: number } | null>(null);
  const u = Math.max(W, H) / 400; // 화면 크기와 무관한 선 두께 단위
  const pose = photo.body?.pose;

  const toY = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return Math.max(0, Math.min(H, pt.y));
  };

  const levelY = (id: LevelId) => (drag?.id === id ? drag.y : kp?.levels[id].y ?? null);
  const shoulderHalf = kp?.widths.shoulder ? (kp.widths.shoulder.right - kp.widths.shoulder.left) / 2 : W * 0.12;
  const span = Math.min(W * 0.48, shoulderHalf * 1.5);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-shell" style={{ aspectRatio: `${W} / ${H}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.imageUrl} alt="분석 사진" className="absolute inset-0 h-full w-full select-none object-contain" draggable={false} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        onPointerMove={(e) => {
          if (!drag) return;
          const y = toY(e.clientX, e.clientY);
          if (y !== null) setDrag({ ...drag, y });
        }}
        onPointerUp={() => {
          if (drag) onCommitLevel?.(drag.id, drag.y);
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        <rect width={W} height={H} fill="#fff" opacity={editMode ? 0.25 : 0.12} />

        {/* 골격 */}
        {showSkeleton && pose && (
          <g stroke="#ffffff" strokeWidth={u * 1.6} strokeLinecap="round" opacity={0.9}>
            {POSE_CONNECTIONS.map(([a, b]) =>
              pose[a].visibility > 0.5 && pose[b].visibility > 0.5 ? (
                <line key={`${a}-${b}`} x1={pose[a].x} y1={pose[a].y} x2={pose[b].x} y2={pose[b].y} />
              ) : null,
            )}
          </g>
        )}
        {showSkeleton && pose && (
          <g>
            {pose.map((p, i) =>
              i >= 11 && p.visibility > 0.5 ? <circle key={i} cx={p.x} cy={p.y} r={u * 2.2} fill="#e58b78" stroke="#fff" strokeWidth={u * 0.8} /> : null,
            )}
          </g>
        )}

        {/* 얼굴 윤곽 기준점 */}
        {kp?.face && (
          <g fill="#fff" stroke="#c96a57" strokeWidth={u * 0.8}>
            {[kp.face.left, kp.face.right, kp.face.top, kp.face.chin].map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={u * 1.8} />
            ))}
            <line x1={kp.face.left.x} y1={kp.face.left.y} x2={kp.face.right.x} y2={kp.face.right.y} stroke="#e58b78" strokeWidth={u} />
          </g>
        )}

        {/* 실루엣 폭 */}
        {kp &&
          (["neck", "shoulder", "waist", "hip"] as const).map((k) => {
            const s = kp.widths[k];
            if (!s) return null;
            const yy = k === "neck" ? s.y : levelY(k as LevelId) ?? s.y;
            return (
              <g key={k} opacity={drag?.id === k ? 0.35 : 1}>
                <line x1={s.left} x2={s.right} y1={yy} y2={yy} stroke="#e58b78" strokeWidth={u * 2.6} strokeLinecap="round" />
                <circle cx={s.left} cy={yy} r={u * 2.4} fill="#fff" stroke="#c96a57" strokeWidth={u} />
                <circle cx={s.right} cy={yy} r={u * 2.4} fill="#fff" stroke="#c96a57" strokeWidth={u} />
              </g>
            );
          })}

        {/* 어깨 경사 */}
        {kp?.shoulderSlope &&
          [kp.shoulderSlope.L, kp.shoulderSlope.R].map((seg, i) =>
            seg ? (
              <line key={i} x1={seg[0].x} y1={seg[0].y} x2={seg[1].x} y2={seg[1].y} stroke="#7d5bd0" strokeWidth={u * 1.6} strokeDasharray={`${u * 3} ${u * 2}`} />
            ) : null,
          )}

        {/* 기준선 */}
        {kp &&
          LEVEL_IDS.map((id) => {
            const y = levelY(id);
            if (y === null) return null;
            const lv = kp.levels[id];
            const cx = kp.midlineAt(y);
            const hl = highlight.includes(id) || drag?.id === id;
            const low = lv.source === "auto" && lv.confidence < 0.5;
            const color = lv.source === "manual" ? "#7d5bd0" : hl ? "#c96a57" : "#ffffff";
            const x1 = Math.max(0, cx - span);
            const x2 = Math.min(W, cx + span);
            return (
              <g key={id}>
                <line
                  x1={x1}
                  x2={x2}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeWidth={u * (hl ? 1.8 : 1.1)}
                  strokeDasharray={low ? `${u * 4} ${u * 3}` : undefined}
                  opacity={0.95}
                  style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,.35))" }}
                />
                <g transform={`translate(${x1 + u * 2}, ${y - u * 2.5})`}>
                  <rect x={-u} y={-u * 7.5} width={u * (LEVEL_LABEL[id].length * 6.4 + 4)} height={u * 9} rx={u * 2} fill="rgba(58,47,44,.62)" />
                  <text x={u} y={-u * 0.6} fontSize={u * 6.2} fill="#fff" fontWeight={600}>
                    {LEVEL_LABEL[id]}
                  </text>
                </g>
                {editMode && (
                  <g
                    className="drag-handle"
                    onPointerDown={(e) => {
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                      setDrag({ id, y });
                    }}
                  >
                    <circle cx={x2 - u * 8} cy={y} r={u * 9} fill="transparent" />
                    <circle cx={x2 - u * 8} cy={y} r={u * 5} fill={lv.source === "manual" ? "#7d5bd0" : "#e58b78"} stroke="#fff" strokeWidth={u * 1.4} />
                    <path
                      d={`M${x2 - u * 8} ${y - u * 2.6} l${-u * 1.8} ${u * 1.8} h${u * 3.6} z M${x2 - u * 8} ${y + u * 2.6} l${-u * 1.8} ${-u * 1.8} h${u * 3.6} z`}
                      fill="#fff"
                    />
                  </g>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
