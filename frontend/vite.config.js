import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const pages = ['index.html', 'buy.html', 'track.html', 'success.html', 'failed.html', 'privacy.html', 'terms.html'];

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.replace('.html', ''), resolve(rootDir, page)])),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});