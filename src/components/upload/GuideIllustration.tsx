import type { PhotoKind } from "@/lib/types";

const STROKE = "#c96a57";
const FILL = "#fbe7e1";

/** 촬영 자세 안내용 독자 일러스트 (단순 라인 아트) */
export function GuideIllustration({ kind, className }: { kind: PhotoKind; className?: string }) {
  return (
    <svg viewBox="0 0 160 200" className={className} aria-hidden>
      <rect x="1" y="1" width="158" height="198" rx="14" fill="#fffaf7" stroke="#efe2d6" />
      {kind === "frontBody" && <FrontBody />}
      {kind === "sideBody" && <SideBody />}
      {kind === "frontFace" && <FrontFace />}
      {kind === "sideFace" && <SideFace />}
    </svg>
  );
}

function Frame({ y1 = 14, y2 = 186 }: { y1?: number; y2?: number }) {
  // 촬영 프레임 가이드 코너
  const c = 10;
  return (
    <g stroke="#d9a3a0" strokeWidth="1.5" fill="none" strokeLinecap="round">
      <path d={`M24 ${y1 + c} V${y1} H${24 + c}`} />
      <path d={`M${136 - c} ${y1} H136 V${y1 + c}`} />
      <path d={`M24 ${y2 - c} V${y2} H${24 + c}`} />
      <path d={`M${136 - c} ${y2} H136 V${y2 - c}`} />
    </g>
  );
}

function FrontBody() {
  return (
    <g>
      <Frame y1={12} y2={190} />
      <line x1="30" x2="130" y1="104" y2="104" stroke="#efc9bd" strokeDasharray="3 3" />
      <text x="100" y="100" fontSize="7" fill="#a8948b">카메라 높이</text>
      <g fill={FILL} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="80" cy="34" rx="10" ry="12.5" />
        <path d="M76 46 h8 l1 5 q13 1 17 7 l-3 32 l-5 8 q2 10 -2 18 l-3 62 h-7 l-2-56 l-2 56 h-7 l-3-62 q-4-8 -2-18 l-5-8 l-3-32 q4-6 17-7 z" />
        <path d="M62 58 q-8 18 -15 40" fill="none" strokeWidth="5" stroke={FILL} />
        <path d="M98 58 q8 18 15 40" fill="none" strokeWidth="5" stroke={FILL} />
        <path d="M62 58 q-8 18 -15 40 M98 58 q8 18 15 40" fill="none" />
      </g>
      <path d="M55 70 a20 20 0 0 0 -6 14" stroke="#e58b78" fill="none" strokeDasharray="2 2" />
      <text x="34" y="84" fontSize="8" fill="#c96a57">30°</text>
    </g>
  );
}

function SideBody() {
  return (
    <g>
      <Frame y1={12} y2={190} />
      <line x1="84" x2="84" y1="14" y2="188" stroke="#efc9bd" strokeDasharray="3 3" />
      <g fill={FILL} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="84" cy="34" rx="11" ry="12.5" />
        <path d="M80 46 h7 l1 6 q8 3 7 16 q-1 10 -4 16 q4 6 3 16 l-3 70 h6 v4 h-16 l-2-74 q-5-10 -3-22 q-2-12 0-22 q2-6 4-6 z" />
        <path d="M82 58 q-3 22 0 44" fill="none" />
      </g>
      <text x="96" y="30" fontSize="7" fill="#a8948b">귀–어깨–골반</text>
      <text x="96" y="39" fontSize="7" fill="#a8948b">한 줄 확인</text>
    </g>
  );
}

function FrontFace() {
  return (
    <g>
      <Frame y1={22} y2={178} />
      <g fill={FILL} stroke={STROKE} strokeWidth="1.3">
        <path d="M80 40 q30 0 32 38 q0 34 -32 52 q-32 -18 -32 -52 q2 -38 32 -38 z" />
        <path d="M64 136 v20 q16 8 32 0 v-20" fill="none" />
      </g>
      <g stroke={STROKE} strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M64 78 h10 M86 78 h10" />
        <path d="M80 84 v14 h-3" />
        <path d="M73 110 h14" />
      </g>
      <line x1="40" x2="120" y1="78" y2="78" stroke="#efc9bd" strokeDasharray="3 3" />
      <text x="96" y="160" fontSize="7" fill="#a8948b">이마·턱선 노출</text>
    </g>
  );
}

function SideFace() {
  return (
    <g>
      <Frame y1={22} y2={178} />
      <g fill={FILL} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M70 42 q34 -4 36 30 q0 6 6 14 l-6 4 q2 8 -2 12 q2 8 -8 10 l-4 14 q-4 6 -14 6 l2 22 q20 4 36 14 h-90 q8-10 30-14 l2-24 q-14-10 -14-40 q0-44 26-48 z" />
      </g>
      <ellipse cx="70" cy="84" rx="5" ry="8" fill="none" stroke={STROKE} strokeWidth="1.2" />
      <text x="20" y="168" fontSize="7" fill="#a8948b">귀·턱·목·어깨 한 화면</text>
    </g>
  );
}
