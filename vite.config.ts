import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const OUT_DIR = 'dist';

// GitHub Pages serves 404.html for unknown paths; a copy of index.html lets the SPA router handle deep links.
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    async closeBundle() {
      await copyFile(path.resolve(OUT_DIR, 'index.html'), path.resolve(OUT_DIR, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => ({
  // GitHub Pages project site: https://<user>.github.io/minigames/
  base: mode === 'production' ? '/minigames/' : '/',
  root: '.',
  publicDir: 'public',
  plugins: [spaFallbackPlugin()],
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
}));
