import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/minigames/
  base: process.env.NODE_ENV === 'production' ? '/minigames/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
