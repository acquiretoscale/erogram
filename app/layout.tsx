import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "erogram.pro – Telegram Groups & Channels Directory",
    template: "%s – erogram.pro"
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
    title: "erogram.pro – Telegram Groups & Channels Directory",
    description: "Find and explore the best Telegram groups from around the world. Connect with communities that match your interests.",
    type: "website",
    siteName: "Erogram",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "erogram.pro – Telegram Groups & Channels Directory",
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

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://plausible.eroverse.space" />
        <link rel="dns-prefetch" href="https://plausible.eroverse.space" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`,
          }}
        />
        <script
          defer
          data-domain="erogram.pro"
          src="https://plausible.eroverse.space/js/script.file-downloads.outbound-links.js"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
