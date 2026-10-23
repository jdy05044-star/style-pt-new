"use client";
import type { Keypoints, LevelId, LevelOverrides } from "@/lib/types";
import { LEVEL_IDS } from "@/lib/types";
import { LEVEL_LABEL } from "@/lib/analysis/bodyRatios";
import { DEFAULT_FIGURE } from "@/lib/analysis/figureModel";

const HINT: Record<LevelId, string> = {
  headTop: "머리카락 포함 정수리",
  chin: "턱 끝 아래선",
  neckBase: "목이 어깨(승모근)로 넓어지기 시작하는 곳",
  shoulder: "어깨 관절 높이",
  waist: "몸통에서 가장 잘록한 곳(배꼽 위)",
  hip: "엉덩이·골반에서 가장 넓은 곳",
  crotch: "다리가 갈라지는 지점",
  floor: "발바닥(뒤꿈치) 닿는 선",
};

/** 사진에서 자동 식별이 어려운 기준선을 사용자가 확인·지정하는 패널 */
export function LevelEditor({
  kp,
  imageH,
  overrides,
  onSet,
  onReset,
}: {
  kp: Keypoints;
  imageH: number;
  overrides: LevelOverrides;
  onSet: (id: LevelId, y: number | null) => void;
  onReset: () => void;
}) {
  const suggest = (id: LevelId): number => {
    const idx = LEVEL_IDS.indexOf(id);
    const above = LEVEL_IDS.slice(0, idx).reverse().find((l) => kp.levels[l].y !== null);
    const below = LEVEL_IDS.slice(idx + 1).find((l) => kp.levels[l].y !== null);
    const top = kp.levels.headTop.y;
    const floor = kp.levels.floor.y;
    if (top !== null && floor !== null) {
      const f = DEFAULT_FIGURE.y[id];
      return top + f * (floor - top);
    }
    if (above && below) return (kp.levels[above].y! + kp.levels[below].y!) / 2;
    return imageH * DEFAULT_FIGURE.y[id];
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <b className="text-sm">측정 기준선 확인</b>
        {Object.keys(overrides).length > 0 && (
          <button onClick={onReset} className="text-[12px] text-mute underline">
            모두 자동값으로
          </button>
        )}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-mute">
        사진 위 선 오른쪽의 동그란 핸들을 위아래로 끌어 위치를 맞추세요. 보라색 선은 직접 지정한 값입니다. 수정하면 모든 비율이 즉시 다시 계산됩니다.
      </p>
      <ul className="mt-3 divide-y divide-line">
        {LEVEL_IDS.map((id) => {
          const lv = kp.levels[id];
          return (
            <li key={id} className="flex items-center gap-3 py-2.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  lv.source === "manual" ? "bg-[#7d5bd0]" : lv.source === "missing" ? "bg-bad" : lv.confidence < 0.5 ? "bg-warn" : "bg-ok"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">
                  {LEVEL_LABEL[id]}
                  <span className="ml-1.5 text-[11px] font-normal text-mute">
                    {lv.source === "manual" ? "직접 지정" : lv.source === "missing" ? "자동 인식 실패" : `자동 · 신뢰도 ${(lv.confidence * 100).toFixed(0)}%`}
                  </span>
                </div>
                <p className="truncate text-[11.5px] text-mute">{lv.note ?? HINT[id]}</p>
              </div>
              {lv.source === "missing" && (
                <button onClick={() => onSet(id, suggest(id))} className="shrink-0 rounded-full bg-ink px-3 py-1 text-[12px] text-white">
                  직접 지정
                </button>
              )}
              {lv.source === "manual" && (
                <button onClick={() => onSet(id, null)} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12px]">
                  되돌리기
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
