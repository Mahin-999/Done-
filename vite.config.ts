import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
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