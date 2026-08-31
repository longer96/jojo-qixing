import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许局域网 IP 访问开发态资源，否则按钮/交互会失效
  allowedDevOrigins: [
    "10.130.31.165",
    "198.18.0.1",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
