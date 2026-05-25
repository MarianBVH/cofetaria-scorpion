import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;

module.exports = {
  allowedDevOrigins: ['192.168.0.98'],
}