import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@adobe/pdfservices-node-sdk"],
  images: {
    domains: ["res.cloudinary.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
