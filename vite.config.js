/* This code fixed By Tg:@ImxCodex */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/generated': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/generate': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/preview': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
