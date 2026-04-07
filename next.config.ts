import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // device comms go through the Windows Flask API — no native addons needed
  basePath: "/microbird",
};

export default nextConfig;
