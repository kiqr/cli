import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/commands/**/*.tsx', 'src/commands/**/*.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
