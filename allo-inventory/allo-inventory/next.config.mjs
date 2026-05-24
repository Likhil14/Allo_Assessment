/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server actions (stable in Next.js 15)
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
