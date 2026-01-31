
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': process.env
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
