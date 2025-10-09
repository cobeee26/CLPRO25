import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
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
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:5173 http://localhost:3000; style-src 'self' 'unsafe-inline' http://localhost:5173; img-src 'self' data: blob: http://localhost:8000 http://localhost:5173; connect-src 'self' http://localhost:8000 http://localhost:5173 ws://localhost:5173; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self';"
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})