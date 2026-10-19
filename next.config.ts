import type { NextConfig } from "next";

// WebMCP origin trial tokens. Each is bound to one origin, so set them per deployment.
// Both go in one comma-separated header; each browser ignores the other's token.
const originTrialTokens = [
  process.env.CHROME_ORIGIN_TRIAL_TOKEN,
  process.env.EDGE_ORIGIN_TRIAL_TOKEN,
]
  .map((token) => token?.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  async headers() {
    if (originTrialTokens.length === 0) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "Origin-Trial", value: originTrialTokens.join(", ") }],
      },
    ];
  },
};

export default nextConfig;
