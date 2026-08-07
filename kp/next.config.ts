import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pptxgenjs", "@react-pdf/renderer"],
  basePath: "/kp",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/kp",
  },
};

export default nextConfig;
