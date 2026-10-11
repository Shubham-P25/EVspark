/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/driver",
        permanent: false,
      },
      {
        source: "/dashboard/driver",
        destination: "/driver",
        permanent: false,
      },
      {
        source: "/dashboard/operator",
        destination: "/station",
        permanent: false,
      },
      {
        source: "/operator",
        destination: "/station",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
