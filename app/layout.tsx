import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

export const metadata: Metadata = {
  title: {
    default: "Erogram | Best NSFW Telegram Groups & Channels Directory 2026",
    template: "%s | Erogram"
  },
  description: "Find and explore the best Telegram groups from around the world. Connect with communities that match your interests.",
  keywords: "telegram groups, telegram channels, communities, messaging, NSFW telegram groups",
  icons: {
    // Force the correct App Router favicon filename, and add a cache-busting query.
    icon: '/favicon.ico?v=2',
    shortcut: '/favicon.ico?v=2',
  },
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Erogram | Best NSFW Telegram Groups & Channels Directory 2026",
    description: "Find and explore the best Telegram groups from around the world. Connect with communities that match your interests.",
    type: "website",
    siteName: "Erogram",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Erogram | Best NSFW Telegram Groups & Channels Directory 2026",
    description: "Find and explore the best Telegram groups from around the world.",
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
  other: {
    rating: 'adult',
    'RATING': 'RTA-5042-1996-1400-1577-RTA',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#111111" />
        <meta name="generator" content="Next.js 16" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Erogram" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                  }
                });
                if (typeof caches !== 'undefined') {
                  caches.keys().then(function(names) {
                    for (var i = 0; i < names.length; i++) {
                      caches.delete(names[i]);
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1LS0T31C7J"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1LS0T31C7J');
          `}
        </Script>

        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
