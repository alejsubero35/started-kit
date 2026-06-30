
import { defineConfig } from "vite";
// Prefer Babel-based React plugin to avoid SWC native binding issues on Windows
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // In development we use relative base for Vite dev server.
  // In production we deploy under Laravel public/app, so use absolute base "/app/".
  base: (mode === 'production' || mode === 'laravel') ? '/app/' : './',
  
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      // Direct access to Vite dev server under sslip domains
      host: '127-0-0-1.sslip.io',
      clientPort: 8080,
    },
    watch: {
      // Ignore common folders that may be written to by plugins or external tools
      // to avoid triggering Vite's file watcher and restarting the dev server.
      ignored: ['**/node_modules/**', '**/.git/**', 'dist/**', 'public/**']
    },
  },
  plugins: [
    react(),
    // componentTagger disabled to avoid injecting external scripts (e.g., gptengineer)
    // which can conflict with Laravel hosting under /app.
    VitePWA({
      strategies: 'injectManifest',
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'dist/sw.js',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}',
          'fonts.css',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'fonts.css'],
      manifest: {
        name: 'Started Kit',
        short_name: 'Started',
        description: 'Boilerplate administrativo offline-first',
        theme_color: '#0B5FFF',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'Usuarios',
            short_name: 'Usuarios',
            url: './users',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  preview: {
    port: 4173,
    strictPort: true,
    open: '/app/',
  },
  resolve: {
    alias: {
      // Use process.cwd() to avoid __dirname in ESM configs
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
}));
