import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // serialport is a native Node addon — keep it server-side only, never bundled
  serverExternalPackages: ["serialport"],
};

export default nextConfig;
