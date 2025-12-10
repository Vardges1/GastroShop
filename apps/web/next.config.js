const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  async rewrites() {
    // Use internal Docker network address for server-side rewrites
    const apiUrl = process.env.API_BASE_URL || 'http://api:8080';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
  // Disable static generation for pages with useTranslations
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = withNextIntl(nextConfig);
