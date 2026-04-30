import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          game: [
            './src/main.js',
            './src/config.js',
            './src/utils.js',
          ],
        },
      },
    },
    sourcemap: false,
    target: 'es2020',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
