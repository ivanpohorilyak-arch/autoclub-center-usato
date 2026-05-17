/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Permette al build di produzione di completarsi anche se ESLint trova problemi.
    // Il lint resta eseguibile manualmente con `npm run lint`.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
