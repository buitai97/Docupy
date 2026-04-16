import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    outputFileTracingRoot: __dirname,
    async rewrites() {
        return [{
            source: "/api/:path*",
            destination: `${process.env.BACKEND_URL}/api/:path*`
        }];
    }
};

export default nextConfig;
