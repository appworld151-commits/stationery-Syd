// GitHub Pages has no SPA fallback: copy index.html to 404.html so deep links
// (e.g. /stationery-Syd/store) still load the app instead of a GitHub 404.
import { copyFileSync, existsSync } from 'node:fs'

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html not found - build failed?')
  process.exit(1)
}
copyFileSync('dist/index.html', 'dist/404.html')
console.log('Created dist/404.html')
