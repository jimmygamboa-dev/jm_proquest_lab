/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Cloudflare Pages — static HTML export
  trailingSlash: true, // Cloudflare Pages sirve rutas con /ruta/ correctamente
};

export default nextConfig;
