import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this project at https://<user>.github.io/stationery-Syd/
const BASE = '/stationery-Syd/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: BASE,
      scope: BASE,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'AYANO KOJI',
        short_name: 'AYANO KOJI',
        description: 'Digital bookstore',
        theme_color: '#1b1530',
        background_color: '#0f0b1e',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: `${BASE}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${BASE}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${BASE}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: `${BASE}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      }
    })
  ]
})
