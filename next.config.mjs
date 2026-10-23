/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 사진은 서버로 전송되지 않습니다. MediaPipe wasm 은 /public/mediapipe/wasm 에서,
  // 모델 파일은 storage.googleapis.com(또는 NEXT_PUBLIC_MODEL_BASE)에서 내려받습니다.
  async headers() {
    return [
      {
        source: "/mediapipe/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
