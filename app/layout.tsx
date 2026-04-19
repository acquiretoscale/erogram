import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import ClarityScript from "@/components/ClarityScript";
import { getLocale, getPathname } from "@/lib/i18n/server";
import { getDictionary, LocaleProvider } from "@/lib/i18n";
import { LOCALES, localePath, LOCALE_HREFLANG, DEFAULT_LOCALE } from "@/lib/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);
  const m = dict.meta || {};

  const title = m.homeTitle || "Erogram | Best NSFW Telegram Groups, Bots & AI Tools Directory (2026)";
  const description = m.homeDesc || "Find and explore the best Telegram groups from around the world. Connect with communities that match your interests.";

  // Self-referencing canonical — each locale owns its own URL
  const canonical = `${canonicalBase}${pathname === '/' ? '' : pathname}` || canonicalBase;

  return {
    title: { default: title, template: "%s | Erogram" },
    description,
    keywords: "porn telegram, telegram porn, best porn telegram groups, nsfw telegram, nsfw telegram groups, adult telegram directory, porn telegram channels, telegram porn groups",
    icons: { icon: '/favicon.ico?v=2', shortcut: '/favicon.ico?v=2' },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical,
      languages: Object.fromEntries(
        LOCALES.map(loc => [
          LOCALE_HREFLANG[loc],
          `${canonicalBase}${localePath(
            locale !== DEFAULT_LOCALE ? pathname.replace(new RegExp(`^/${locale}`), '') || '/' : pathname,
            loc
          )}`,
        ])
      ),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Erogram",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html lang={LOCALE_HREFLANG[locale]}>
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

        {/* SW registered only for admins — see AdminSaleAlert */}
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

        <ClarityScript />

        <LocaleProvider locale={locale} dict={dict}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </LocaleProvider>
      </body>
    </html>
  );
}
