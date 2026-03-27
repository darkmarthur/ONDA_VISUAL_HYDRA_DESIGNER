import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Add developer origins to allow cross-origin requests to HMR resources in dev mode
  allowedDevOrigins: ['192.168.100.85', 'localhost:3000'],
};

export default nextConfig;
