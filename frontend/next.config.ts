import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    outputFileTracingRoot: __dirname,
    async rewrites() {
        if (!isDev) return [];
        return [{
            source: "/api/:path*",
            destination: `${process.env.BACKEND_URL}/api/:path*`
        }];
    }
};

export default nextConfig;
