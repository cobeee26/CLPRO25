import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  css: {
    // keep postcss config external para clean
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    // mas simple CSP para di mag‑conflict sa dev
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 http://localhost:3000;
        style-src 'self' 'unsafe-inline' http://localhost:5173;
        img-src 'self' data: blob: http://localhost:8000 http://localhost:5173;
        connect-src 'self' http://localhost:8000 http://localhost:5173 ws://localhost:5173;
        worker-src 'self' blob:;
        frame-src 'self';
        object-src 'none';
        base-uri 'self';
      `.replace(/\s+/g, ' ')
    },
  },
  build: {
    outDir: 'dist',
    // disable sourcemap in production para mas maliit ang build
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext', // mas mabilis build, modern browsers
    minify: 'esbuild', // mas mabilis kaysa terser
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    // exclude heavy deps kung di kailangan
    exclude: ['@heavy-lib']
  },
})