import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The Press section used to live at /media.
    return [
      { source: "/media", destination: "/press", permanent: true },
      { source: "/admin/media", destination: "/admin/press", permanent: true }
    ];
  }
};

export default nextConfig;
