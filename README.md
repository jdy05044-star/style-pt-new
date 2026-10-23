# STYLE PT · 체형·비율 분석 웹앱 (1~3단계 MVP)

사진을 올리면 **브라우저 안에서** MediaPipe 로 신체·얼굴 랜드마크와 실루엣을 추출하고, 같은 사진 안의 픽셀 길이 비율로 11개 신체 비율을 계산해 사진 위 분석선과 인체 일러스트로 보여 줍니다.
측정할 수 없는 항목은 숫자를 만들지 않고 **측정 불가**와 사유를 표시합니다.

## 실행

```bash
# Node 20.9 이상
npm install          # postinstall 이 MediaPipe wasm 을 public/mediapipe/wasm 으로 복사
npm run dev          # http://localhost:3000
npm test             # 분석 엔진 단위 테스트 (vitest)
npm run typecheck
```

휴대폰에서 테스트: 같은 Wi‑Fi 에서 `npm run dev -- -H 0.0.0.0` 후 `http://<PC IP>:3000`.
(카메라 직접 촬영 API 는 쓰지 않고 파일 선택만 쓰므로 http 에서도 동작합니다.)

최신 버전 확인: `npm outdated` → `npm install next@latest @mediapipe/tasks-vision@latest`
`@mediapipe/tasks-vision` 을 올리면 postinstall 이 같은 버전의 wasm 을 다시 복사합니다.

## 배포 (Vercel)

1. GitHub 에 푸시 → Vercel 에서 Import (Framework: Next.js, 설정 변경 불필요)
2. 빌드 시 `npm install` 의 postinstall 로 wasm 이 복사되어 함께 배포됩니다.
3. 모델 파일을 자체 호스팅하려면 `.env.example` 참고(`public/models/` + `NEXT_PUBLIC_*_MODEL`).

## 폴더 구조

```
src/
  app/
    layout.tsx            전역 레이아웃·폰트·AnalysisProvider
    page.tsx              소개·개인정보 안내
    upload/page.tsx       1단계: 사진 4종 업로드, 동의, 분석 실행
    analysis/page.tsx     3단계: 결과(전신 비율 / 목·어깨 / 얼굴 / 측면 탭)
  components/
    upload/               PhotoSlotCard, GuideSheet(촬영 가이드), GuideIllustration(SVG)
    analysis/             BodyOverlay(사진 위 분석선+드래그 보정), LevelEditor,
                          BodyFigure(측정값으로 비율을 맞춘 SVG 인체), FaceOverlay, MetricCard
    ui/primitives.tsx     TopBar, StatusBadge, IssueList, RatioBar, Section, PrimaryButton
  lib/
    types.ts              공통 타입
    guide.ts              촬영 가이드 문구
    store/AnalysisStore   사진·결과를 메모리에만 보관(저장/전송 없음)
    image/                loadImage(EXIF 회전·축소), quality(밝기·흐림·해상도)
    mask/mask.ts          실루엣 마스크 연산(폭·윤곽·틈 탐색)
    mediapipe/            vision.ts(Pose/Face/Segmenter 로더, GPU→CPU 폴백; tasks-vision 1.0.x API 기준), detect.ts
    analysis/
      landmarkIndex.ts    MediaPipe 인덱스
      keypoints.ts        기준선(머리끝·턱·목밑·어깨·허리·골반·가랑이·바닥)과 폭 자동 검출
      bodyRatios.ts       11개 비율 + 촬영 자세 영향 감지
      detectionQuality.ts 인식 실패·재촬영 판정
      alignment.ts        머리-어깨 정렬(정면/측면)
      faceMeasures.ts     얼굴 세로/가로, 이마·광대·턱 폭(4단계 얼굴형 입력)
      figureModel.ts      일러스트용 정규화 모델
tests/                    합성 인체(알려진 치수)로 측정값 검증 — 34개
```

## 측정 방식 요약

| # | 항목 | 정의 |
|---|---|---|
| 1 | 등신 | (머리끝→바닥) ÷ (머리끝→턱끝). 턱끝은 전신 사진의 얼굴 영역을 잘라 Face Landmarker 로 검출 |
| 2 | 상체:하체 | 머리끝→허리선 : 허리선→바닥 |
| 3 | 몸통:다리 | 어깨선→가랑이점 : 가랑이점→바닥 |
| 4 | 어깨:골반 | Pose 세그멘테이션 실루엣에서 어깨 높이 폭 : 골반 최대 폭 |
| 5 | 허리:골반 | 허리선(가장 좁은 높이) 폭 : 골반 폭 |
| 6 | 허리 높이 | 바닥→허리선 ÷ 전신 |
| 7 | 허벅지:종아리 | 고관절→무릎 : 무릎→발목 (관절 중심) |
| 8 | 어깨 경사 | 머리카락(Image Segmenter)을 제외한 실루엣 윗윤곽의 기울기 |
| 9 | 얼굴:어깨 | 광대 높이 얼굴 폭 : 어깨 폭 |
| 10 | 얼굴:목 | 얼굴 메시 상단→턱끝 : 턱끝→목 밑 |
| 11 | 비대칭 | 어깨·골반 높이차(%), 허리 좌우 폭 차 + 고개 기울임/회전/체중 쏠림/카메라 기울기/무릎 굽힘 감지 |

- 가랑이점·허리선·목 밑·턱끝 등은 **기준선 수정** 모드에서 드래그로 보정하며, 보정 즉시 재계산됩니다.
- "직접 지정"으로 추가만 하고 아직 끌어 맞추지 않은 선은 계산에 쓰지 않습니다(임의 수치 방지).
- 팔이 몸통에 붙으면 폭이 부풀려지므로 경고 후 신뢰도를 낮춥니다.

## 개인정보

- 사진은 `File` → 캔버스로만 읽고, 서버 업로드·localStorage 저장·외부 전송을 하지 않습니다.
- 네트워크 요청은 wasm(자기 도메인)과 모델 파일(storage.googleapis.com), 폰트뿐입니다.

## 한계

- 모든 값은 사진 속 상대 비율이며 cm 치수가 아닙니다. 광각 렌즈·가까운 거리·위/아래 앵글은 원근 왜곡을 만듭니다.
- selfie_multiclass 세그멘터는 셀피용 모델이라 전신 사진에서 머리카락 분리가 불완전할 수 있습니다(실패 시 머리카락 제외 없이 진행).
- 실루엣 폭은 옷 두께를 포함합니다. 몸에 붙는 옷을 권장합니다.
- HEIC 는 Safari 외 브라우저에서 열리지 않을 수 있습니다.

## 다음 단계 (설계 반영됨)

- **4단계**: `lib/analysis/` 에 `boneType.ts`(측정값+보조 설문 → 근거 점수, 혼합/보류), `silhouette.ts`, `faceShape.ts`(faceMeasures 입력), `neck.ts`(faceNeck 값 → 짧아 보임/보통/길어 보임)
- **5단계**: `lib/recommend/` 규칙 테이블(넥라인 10종·의상) — 각 규칙이 어떤 측정값을 근거로 점수를 주는지 기록해 "왜 어울리는지" 표시
- **6단계**: 리포트 화면·인쇄, E2E 테스트, 배포
