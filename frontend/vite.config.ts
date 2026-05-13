import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
            if (req.url?.startsWith('/api/chat/stream')) {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              delete proxyRes.headers['content-length'];
            }
          });
          proxy.on('error', (err: any, _req: any, _res: any) => {
            if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
              console.error('proxy error', err);
            }
          });
          proxy.on('proxyReqWs', (proxyReq: any, req: any, _res: any) => {
            proxyReq.on('error', (err: any) => {
              if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
                console.error('ws proxy error', err);
              }
            });
          });
        },
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
