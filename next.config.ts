/**
 * Next.js Configuration
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    images: {
        domains: [
            'localhost', 
            '*.supabase.co', 
            'cdn.saviedutech.com',
            'img.youtube.com',
            'i.ytimg.com',
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
