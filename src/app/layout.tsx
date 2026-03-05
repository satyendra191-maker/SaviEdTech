import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { NoticeBar } from '@/components/notice-bar';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-poppins',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'SaviEduTech - Digital Coaching for JEE & NEET',
        template: '%s | SaviEduTech',
    },
    description: 'India\'s premier digital coaching platform for JEE and NEET preparation. Learn from expert faculty, practice with daily problems, and track your progress.',
    keywords: ['JEE', 'NEET', 'IIT', 'Medical', 'Coaching', 'Online Learning', 'Education', 'India'],
    authors: [{ name: 'SaviTech AI' }],
    creator: 'SaviTech AI',
    publisher: 'SaviEduTech',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://saviedutech.com'),
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: 'SaviEduTech - Digital Coaching for JEE & NEET',
        description: 'India\'s premier digital coaching platform for JEE and NEET preparation.',
        url: 'https://saviedutech.com',
        siteName: 'SaviEduTech',
        locale: 'en_IN',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SaviEduTech - Digital Coaching for JEE & NEET',
        description: 'India\'s premier digital coaching platform for JEE and NEET preparation.',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
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
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
            <body className="min-h-screen bg-background font-sans antialiased">
                <Providers>
                    <div className="flex flex-col min-h-screen">
                        <NoticeBar />
                        <Navbar />
                        <main className="flex-1">
                            {children}
                        </main>
                        <Footer />
                    </div>
                </Providers>
            </body>
        </html>
    );
}