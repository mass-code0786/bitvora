import type { NextConfig } from "next";
const deploymentBuildId=process.env.BITVORA_BUILD_ID??process.env.GIT_COMMIT_SHA??`bitvora-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: process.env.ENABLE_BROWSER_SOURCEMAPS === "true",
  env:{NEXT_PUBLIC_BITVORA_BUILD_ID:deploymentBuildId},
  generateBuildId:async()=>deploymentBuildId,
};

export default nextConfig;
