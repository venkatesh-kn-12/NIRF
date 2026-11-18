/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow VS Code Dev Tunnels, Cloudflare Tunnels, and local ports to load CSS/JS chunks
  allowedDevOrigins: [
    "*.devtunnels.ms",
    "*.trycloudflare.com",
    "*.loca.lt",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  experimental: {
    allowedDevOrigins: [
      "*.devtunnels.ms",
      "*.trycloudflare.com",
      "*.loca.lt",
      "localhost:3000",
      "127.0.0.1:3000",
    ],
  },
};

export default nextConfig;


