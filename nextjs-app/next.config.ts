import type { NextConfig } from "next";

const nextConfig: NextConfig = {
};
module.exports = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};
export default nextConfig;
