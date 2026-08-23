/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Next.js nu suporta segmente dinamice partiale ("prefix-[param]") ca nume de
  // folder — rutele reale traiesc in /judet/[judet] si /industrie/[industrie],
  // iar rewrites pastreaza URL-urile SEO fara redirect.
  async rewrites() {
    return [
      { source: "/publicare-comunicat-:judet", destination: "/judet/:judet" },
      { source: "/comunicate-presa-:industrie", destination: "/industrie/:industrie" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/reteaua-noastra",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
