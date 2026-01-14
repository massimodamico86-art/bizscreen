import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'polotno/blueprint.polotno.css': resolve(__dirname, 'node_modules/polotno/blueprint.polotno.css'),
    },
  },
  build: {
    outDir: '../../public/polotno',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'polotno-editor.js',
        chunkFileNames: 'polotno-[hash].js',
        assetFileNames: 'polotno-[name].[ext]',
      },
    },
  },
  base: '/polotno/',
});
