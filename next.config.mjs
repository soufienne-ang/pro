import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/config.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/fr",
        permanent: false,
      },

    ];
  },
};

export default withNextIntl(nextConfig);
