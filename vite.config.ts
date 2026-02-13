import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'shared') },
  },
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/personas': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/evaluate': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
