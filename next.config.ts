/**
 * Next.js Configuration
 * 
 * SECURITY CONFIGURATION:
 * - Security headers are set here for static files and pages
 * - Additional headers are added via middleware.ts for dynamic responses
 * - Both configurations work together for comprehensive protection
 * 
 * DOCKER CONFIGURATION:
 * - Output set to 'standalone' for Docker deployment
 * - Reduces image size and improves security
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Enable standalone output for Docker
    output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
    
    reactStrictMode: true,

    images: {
        domains: ['localhost', '*.supabase.co', 'cdn.saviedutech.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
            {
                protocol: 'https',
                hostname: '**.cloudfront.net',
            },
        ],
    },

    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts'],
    },

    /**
     * Security Headers
     * 
     * These headers are applied to all routes and provide protection against
     * common web attacks including XSS, clickjacking, and MIME sniffing.
     * 
     * Note: Middleware adds additional headers for API routes and dynamic content
     */
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        // DNS Prefetch Control - improves performance
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        // Strict Transport Security - forces HTTPS
                        // max-age: 2 years (63072000 seconds)
                        // includeSubDomains: applies to all subdomains
                        // preload: allows browser preloading
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        // Content Type Options - prevents MIME sniffing
                        // Ensures browsers respect the declared Content-Type
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        // Frame Options - prevents clickjacking attacks
                        // DENY: page cannot be displayed in a frame
                        // Changed from SAMEORIGIN to DENY for maximum security
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        // XSS Protection - enables browser XSS filters
                        // Legacy but still useful for older browsers
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        // Referrer Policy - controls referrer information
                        // strict-origin-when-cross-origin: full URL for same-origin, origin only for cross-origin
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        // Permissions Policy - controls browser features
                        // Allow the in-browser AI assistant to access media capture on same-origin pages
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()',
                    },
                    {
                        // Content Security Policy - controls resource loading
                        // Comprehensive policy to prevent XSS and data injection
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
                // Specific headers for API routes
                source: '/api/:path*',
                headers: [
                    {
                        // Prevent caching of API responses
                        key: 'Cache-Control',
                        value: 'no-store, max-age=0',
                    },
                ],
            },
            {
                // Headers for static assets (caching)
                source: '/:all*(\\.png|\\.jpg|\\.jpeg|\\.gif|\\.ico|\\.svg|\\.woff|\\.woff2|\\.ttf|\\.eot)',
                headers: [
                    {
                        // Cache public static assets for 1 year with immutable flag.
                        // Do not override JS/CSS caching; Next manages chunk assets correctly.
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
