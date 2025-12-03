import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - generates reports in /perf-reports
    visualizer({
      filename: 'perf-reports/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // or 'sunburst', 'network'
    }),
  ],
  build: {
    // Increase warning limit since we have intentionally large pages
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks for better caching and parallel loading
        manualChunks: {
          // React and router in their own chunk (rarely changes)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client (medium-sized, rarely changes)
          'vendor-supabase': ['@supabase/supabase-js'],
          // UI icons (large, rarely changes)
          'vendor-icons': ['lucide-react'],
          // Animation library (load on-demand)
          'vendor-motion': ['framer-motion'],
          // QR code generation (used for screen pairing)
          'vendor-qrcode': ['qrcode'],
        },
      },
    },
  },
})
