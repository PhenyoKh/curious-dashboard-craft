import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// Security headers plugin
const securityHeaders = () => ({
  name: 'security-headers',
  configureServer(server: any) {
    server.middlewares.use((_req: any, res: any, next: any) => {
      // Content Security Policy
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Consider removing unsafe-inline and unsafe-eval for production
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        "font-src 'self' fonts.gstatic.com",
        "img-src 'self' data: blob: https: *.supabase.co",
        "media-src 'self' blob:",
        "connect-src 'self' *.supabase.co wss: ws: fonts.googleapis.com fonts.gstatic.com",
        "frame-src 'self' youtube.com www.youtube.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '));
      
      // Other security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8083,
    hmr: {
      port: 8083,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    securityHeaders(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Scola Dashboard',
        short_name: 'Scola',
        description: 'Your personal note-taking and study management platform',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'New Note',
            short_name: 'New Note',
            description: 'Create a new note',
            url: '/note',
            icons: [{ src: '/icons/icon-96x96.svg', sizes: '96x96' }]
          },
          {
            name: 'Subjects',
            short_name: 'Subjects',
            description: 'View subjects',
            url: '/subjects',
            icons: [{ src: '/icons/icon-96x96.svg', sizes: '96x96' }]
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));