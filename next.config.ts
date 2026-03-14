/**
 * Next.js Configuration
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Bundle optimization
 * - Image optimization
 * - Font optimization
 * - Aggressive caching
 * - Bundle splitting
 * 
 * SECURITY CONFIGURATION:
 * - Security headers
 * - CSP policies
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Enable standalone output for Docker
    output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
    
    reactStrictMode: true,

    // Compression
    compress: true,

    // Image optimization
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
            {
                protocol: 'https',
                hostname: '**.cloudfront.net',
            },
            {
                protocol: 'https',
                hostname: 'img.youtube.com',
            },
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
            },
        ],
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    },

    // Bundle optimization
    experimental: {
        optimizePackageImports: [
            'lucide-react', 
            'recharts',
            'date-fns',
            'clsx',
            'tailwind-merge',
        ],
        scrollRestoration: true,
    },

    // Webpack config
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        default: false,
                        vendors: false,
                        commons: {
                            name: 'commons',
                            chunks: 'all',
                            minChunks: 2,
                        },
                        lib: {
                            test: /[\\/]node_modules[\\/]/,
                            name(module: { context: string }) {
                                const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
                                const packageName = match ? match[1] : 'vendors';
                                return `npm.${packageName.replace('@', '')}`;
                            },
                            priority: 10,
                        },
                    },
                },
            };
        }
        return config;
    },

    // Redirects for better SEO
    async redirects() {
        return [
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
            {
                source: '/index',
                destination: '/',
                permanent: true,
            },
        ];
    },

    // Headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://checkout.razorpay.com https://cdn.razorpay.com https://js.razorpay.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: https: blob:",
                            "font-src 'self'",
                            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://cdn.razorpay.com https://lumberjack.razorpay.com",
                            "media-src 'self' https:",
                            "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
                            "object-src 'none'",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
                        ].join('; '),
                    },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0',
                    },
                ],
            },
            {
                source: '/:all*(\\.png|\\.jpg|\\.jpeg|\\.gif|\\.ico|\\.svg|\\.woff|\\.woff2|\\.ttf|\\.eot)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
