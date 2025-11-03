import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      lib: {
        entry: 'src/main/main.ts',
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['electron', 'menubar', '@portwatch/core']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: 'src/preload/preload.ts',
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    root: '.',
    plugins: [react()],
    base: './',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    server: {
      port: 5173
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer')
      }
    }
  }
});
