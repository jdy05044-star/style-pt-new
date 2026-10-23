// 설치된 @mediapipe/tasks-vision 버전과 정확히 같은 wasm 파일을 public/ 으로 복사합니다.
// (CDN 버전과 npm 버전이 어긋나 생기는 런타임 오류를 방지)
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "mediapipe", "wasm");

if (!existsSync(src)) {
  console.warn("[copy-mediapipe-wasm] wasm 폴더를 찾지 못했습니다:", src);
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-mediapipe-wasm] copied →", dest);
