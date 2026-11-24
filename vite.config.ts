import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api-kira-beta.fatalsoft.com.tr',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
