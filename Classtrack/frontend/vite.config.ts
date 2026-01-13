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
    // Very permissive CSP for development - allows all necessary functionality
    // Vite requires eval for HMR (Hot Module Replacement)
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: blob: http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:*; font-src 'self' data:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
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