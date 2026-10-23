import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalysisProvider } from "@/lib/store/AnalysisStore";

export const metadata: Metadata = {
  title: "STYLE PT · 체형 & 스타일 분석",
  description: "사진 속 랜드마크로 신체 비율·골격·얼굴형을 분석하고 어울리는 옷을 제안합니다. 사진은 기기 밖으로 나가지 않습니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdfb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh">
        <AnalysisProvider>
          <div className="mx-auto min-h-dvh max-w-[480px] bg-paper sm:border-x sm:border-line">{children}</div>
        </AnalysisProvider>
      </body>
    </html>
  );
}
