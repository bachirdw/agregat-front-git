import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: {
    '/api': { target: process.env.AGENT_PLATFORM_API_URL || 'http://127.0.0.1:4310', changeOrigin: true,
      configure(proxy) { proxy.on('proxyReq', (request) => request.removeHeader('origin')); } }
  } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], restoreMocks: true }
});
