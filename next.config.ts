
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // This is a workaround for a bug in Next.js.
    // The issue is that the 'child_process' module is not available in the browser.
    // This is a problem because the 'google-auth-library' package uses it.
    if (!isServer) {
      config.externals.push({
        'child_process': 'commonjs child_process',
        'fs': 'commonjs fs'
      });
    }

    return config;
  }
};

export default nextConfig;
