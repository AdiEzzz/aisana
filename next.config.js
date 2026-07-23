/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // GeoJSON карты меняется только вместе с деплоем — кэшируем надолго,
        // повторные заходы на главную вообще не качают карту заново
        source: '/data/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // Загруженные PDF имеют уникальные имена (timestamp+random),
        // при замене создаётся новый файл — можно кэшировать агрессивно
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
