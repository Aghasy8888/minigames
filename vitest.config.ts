import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // DOM tests opt in per file with a `// @vitest-environment happy-dom` docblock.
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      // `text` prints the terminal summary table; `html` writes a browsable report to coverage/.
      reporter: ['text', 'html'],
      // Every application source file, tested or not. Config files live outside src/ and are never counted.
      include: ['src/**/*.ts'],
      exclude: [
        // Test suites themselves, not application code.
        'src/**/*.test.ts',
        // Test-only helpers, not imported by app code.
        'src/test-support/**',
        // Ambient type declarations (`/// <reference types="vite/client" />`); erased at compile time.
        'src/**/*.d.ts',
        // Barrel files that only re-export a component's / feature's public API.
        'src/components/*/index.ts',
        'src/features/*/index.ts',
        // Barrel files that only import asset URLs and re-export them.
        'src/assets/*/index.ts',
        // API request/response interfaces and type aliases only; erased at compile time.
        'src/services/categories-types.ts',
        'src/services/comments-types.ts',
        'src/services/favorite-types.ts',
        'src/services/game-details-types.ts',
        'src/services/leaderboard-types.ts',
      ],
      // Ratchet toward the 80% statements target: a run that beats a floor raises it here (rounded
      // down to a whole percent so tiny refactors don't fail), a run below it fails. Never lower them by hand.
      // Branches and functions ratchet too, so untested error paths and guards can't hide behind statements.
      thresholds: {
        statements: 24,
        branches: 45,
        functions: 31,
        // The aggregate is the gate (the graded metric); low files are reviewed by hand in the table.
        perFile: false,
        autoUpdate: (newThreshold) => Math.floor(newThreshold),
      },
    },
  },
});
