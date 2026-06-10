/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Local placeholder posters in /public are SVG; allow the optimizer to
    // serve them. These are first-party files we generate ourselves.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
};

export default nextConfig;
