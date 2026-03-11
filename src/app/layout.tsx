import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { NoticeBar } from '@/components/notice-bar';
import { NotificationBar } from '@/components/notification-bar';
import { ScreenshotProtection } from '@/components/screenshot-protection';
import { MobileBottomNav, MobileHeader, MobileAIFloatingButton } from '@/components/mobile-nav';

export const metadata: Metadata = {
    title: {
        default: 'SaviEduTech - Digital Coaching for JEE & NEET',
        template: '%s | SaviEduTech',
    },
    description: 'India\'s premier digital coaching platform for JEE and NEET preparation.',
    metadataBase: new URL('https://saviedutech.com'),
    icons: {
        icon: '/icons/icon-192.png',
        shortcut: '/icons/icon-192.png',
        apple: '/icons/icon-512.png',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background font-sans antialiased text-slate-900">
                <ScreenshotProtection enabled={false}>
                    <Providers>
                        <div className="flex flex-col min-h-screen">
                            <MobileHeader />
                            <Navbar />
                            <NotificationBar />
                            <NoticeBar />
                            <main className="flex-1 flex flex-col">
                                {children}
                            </main>
                            <Footer />
                            <MobileBottomNav />
                            <MobileAIFloatingButton />
                        </div>
                    </Providers>
                </ScreenshotProtection>
            </body>
        </html>
    );
}