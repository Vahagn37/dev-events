import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    cacheComponents: true,
    serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
