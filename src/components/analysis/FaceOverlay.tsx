"use client";
import type { PhotoAnalysis } from "@/lib/types";
import { FACE, FACE_OVAL } from "@/lib/analysis/landmarkIndex";

/** 얼굴 사진 위 윤곽선·주요 지점 표시 (얼굴형 분류는 4단계) */
export function FaceOverlay({ photo, showMesh = false }: { photo: PhotoAnalysis; showMesh?: boolean }) {
  const { width: W, height: H } = photo;
  const lm = photo.face?.landmarks;
  const u = Math.max(W, H) / 400;
  const oval = lm ? FACE_OVAL.map((i) => `${lm[i].x},${lm[i].y}`).join(" ") : "";
  const pairs: [number, number, string][] = [
    [FACE.foreheadRight, FACE.foreheadLeft, "이마"],
    [FACE.rightCheek, FACE.leftCheek, "광대"],
    [FACE.jawRight, FACE.jawLeft, "턱"],
  ];
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-shell" style={{ aspectRatio: `${W} / ${H}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.imageUrl} alt="얼굴 사진" className="absolute inset-0 h-full w-full object-contain" />
      {lm && (
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          {showMesh && (
            <g fill="#fff" opacity={0.6}>
              {lm.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={u * 0.5} />
              ))}
            </g>
          )}
          <polygon points={oval} fill="none" stroke="#fff" strokeWidth={u * 1.4} style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,.4))" }} />
          <line x1={lm[FACE.top].x} y1={lm[FACE.top].y} x2={lm[FACE.chin].x} y2={lm[FACE.chin].y} stroke="#7d5bd0" strokeWidth={u * 1.2} strokeDasharray={`${u * 3} ${u * 2}`} />
          {pairs.map(([a, b, label]) => (
            <g key={label}>
              <line x1={lm[a].x} y1={lm[a].y} x2={lm[b].x} y2={lm[b].y} stroke="#e58b78" strokeWidth={u * 1.8} strokeLinecap="round" />
              <circle cx={lm[a].x} cy={lm[a].y} r={u * 2} fill="#fff" stroke="#c96a57" strokeWidth={u * 0.8} />
              <circle cx={lm[b].x} cy={lm[b].y} r={u * 2} fill="#fff" stroke="#c96a57" strokeWidth={u * 0.8} />
              <text x={lm[b].x + u * 4} y={lm[b].y + u * 2} fontSize={u * 6} fill="#fff" fontWeight={700} style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,.6))" }}>
                {label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
