import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pptxgenjs", "@react-pdf/renderer"],
  basePath: "/kp",
};

export default nextConfig;
