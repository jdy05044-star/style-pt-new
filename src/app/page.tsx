import Link from "next/link";
import { TopBar } from "@/components/ui/primitives";
import { BodyFigure } from "@/components/analysis/BodyFigure";

const ANALYSES = [
  { n: "01", t: "신체 비율", d: "등신·상하체·어깨:골반 등 11개 항목을 사진 랜드마크로 계산", ready: true },
  { n: "02", t: "목 · 어깨", d: "보이는 목 길이, 어깨 경사·너비, 머리-어깨 정렬", ready: true },
  { n: "03", t: "골격 타입", d: "스트레이트·웨이브·내추럴 — 사진 + 보조 설문", ready: false },
  { n: "04", t: "실루엣 · 얼굴형", d: "모래시계·삼각·역삼각·직사각 / 6가지 얼굴형", ready: false },
  { n: "05", t: "넥라인 · 의상", d: "10가지 넥라인과 상의·하의·아우터 추천 근거", ready: false },
];

export default function Home() {
  return (
    <main>
      <TopBar />
      <section className="relative overflow-hidden px-5 pb-8 pt-8">
        <div className="absolute -right-16 top-6 h-64 w-64 rounded-full bg-blush/60 blur-3xl" aria-hidden />
        <p className="eyebrow">Personal Body &amp; Style Report</p>
        <h1 className="font-display mt-2 text-[2rem] leading-[1.2]">
          사진 속 비율로 찾는
          <br />
          나에게 맞는 옷의 선
        </h1>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-mute">
          실제 사진에서 어깨·허리·골반·얼굴의 특징점을 추출해 비율을 계산하고, 그 근거로 스타일을 제안합니다.
        </p>
        <div className="relative mt-6 flex items-center gap-4">
          <BodyFigure className="h-64 w-auto shrink-0" highlightLevels={["shoulder", "waist", "hip"]} highlightWidths={["shoulder", "waist", "hip"]} showLabels={false} />
          <ul className="space-y-3 text-[13px] text-mute">
            <li>
              <b className="block text-ink">어깨 · 허리 · 골반</b>실루엣 폭과 높이
            </li>
            <li>
              <b className="block text-ink">머리 · 목 · 다리</b>길이 비율과 등신
            </li>
            <li>
              <b className="block text-ink">자세 영향</b>기울기·회전 자동 구분
            </li>
          </ul>
        </div>
        <Link
          href="/upload"
          className="mt-7 flex h-13 items-center justify-center rounded-2xl bg-coral py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(201,106,87,0.6)]"
        >
          분석 시작하기
        </Link>
      </section>

      <section className="px-5 py-6">
        <p className="eyebrow">What we analyze</p>
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {ANALYSES.map((a) => (
            <li key={a.n} className="flex gap-4 py-4">
              <span className="font-display text-coral tabular">{a.n}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <b className="text-[15px]">{a.t}</b>
                  {!a.ready && <span className="rounded-full bg-shell px-2 py-0.5 text-[10px] text-mute">준비 중</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-mute">{a.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-5 mb-10 rounded-[var(--radius-card)] bg-shell p-5 text-[13px] leading-relaxed text-mute">
        <b className="mb-1 block text-ink">🔒 사진은 기기 밖으로 나가지 않습니다</b>
        모든 분석은 브라우저 안에서 실행됩니다. 사진을 서버에 저장하거나 AI 학습에 사용하지 않으며, 탭을 닫거나 새로고침하면 사진과 결과가 모두
        사라집니다. (분석 모델 파일만 처음 한 번 내려받습니다.)
        <br />
        <br />
        결과는 사진 속 <b>상대적인 비율</b>이며 실제 cm 치수나 의학적 판단이 아닙니다.
      </section>
    </main>
  );
}
