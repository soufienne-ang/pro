import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/config.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'arabic-reshaper', '@vmprint/context-pdf', '@vmprint/contracts', '@sparticuz/chromium'],
    outputFileTracingIncludes: {
      '/api/applications/[id]/convocation': ['./node_modules/@sparticuz/chromium/**'],
      '/api/epreuves/[id]/convocation': ['./node_modules/@sparticuz/chromium/**'],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
      });
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/ar",
        permanent: false,
      },

    ];
  },
};

export default withNextIntl(nextConfig);
