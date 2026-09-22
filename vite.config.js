import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React source lives in /client; the production build goes to /client/dist,
// which Express serves in production (same origin as the API, so no CORS).
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // In local dev, forward API and auth calls to Express on port 3000.
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000'
    }
  }
});
