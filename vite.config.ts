import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // GitHub Pages project site: https://<user>.github.io/minigames/
  base: mode === 'production' ? '/minigames/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
