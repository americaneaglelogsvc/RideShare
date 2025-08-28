import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    host: true, // Allow external connections
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});