import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true, // Enable gzip compression

  experimental: {
    optimizePackageImports: ['framer-motion', 'axios', '@types/*'],
  },

  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    domains: ['images.pexels.com'], // Fallback for some environments
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**', // Allow all paths
      },
      {
        protocol: 'https',
        hostname: '*.erogram.pro',
        pathname: '/**',
      },
    ],
  },


  async redirects() {
    return [
      {
        source: '/groups/page',
        destination: '/groups',
        permanent: true,
      },
      {
        source: '/groups/page/',
        destination: '/groups',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              // Default security baseline
              "default-src 'self'",

              // Scripts allowed
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
              "https://telegram.org " +
              "https://cdn.jsdelivr.net " +
              "https://www.googletagmanager.com " +
              "https://www.google-analytics.com " +
              "https://*.google-analytics.com " +
              "https://analytics.ahrefs.com " +
              "https://static.ahrefs.com " +
              "https://static.cloudflareinsights.com " +
              "https://a.pemsrv.com " +
              "https://*.pemsrv.com",

              // Styles
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",

              // Fonts
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",

              // Images
              "img-src 'self' data: blob: https:",

              // Frames
              "frame-src 'self' https://telegram.org https://*.telegram.org",
              "frame-ancestors 'self' https://telegram.org https://*.telegram.org",

              // Network connections
              "connect-src 'self' " +
              "https://api.telegram.org " +
              "https://www.googletagmanager.com " +
              "https://www.google-analytics.com " +
              "https://*.google-analytics.com " +
              "https://analytics.google.com " +
              "https://stats.g.doubleclick.net " +
              "https://analytics.ahrefs.com " +
              "https://static.ahrefs.com " +
              "https://static.cloudflareinsights.com " +
              "https://a.pemsrv.com " +
              "https://*.pemsrv.com",

              // Workers / blobs / misc
              "worker-src 'self' blob:",
              "media-src 'self' https:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      // Cache optimization for static assets
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache optimization for images
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // Cache optimization for MongoDB-served images
      {
        source: "/api/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache optimization for fonts
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default process.env.ANALYZE === 'true' ? withBundleAnalyzer()(nextConfig) : nextConfig;
