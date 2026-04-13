import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/spending",
        destination: "/bookkeeping/spending",
        permanent: true,
      },
      {
        source: "/transactions",
        destination: "/bookkeeping/transactions",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
