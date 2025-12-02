import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
        },
      },
    },
  },
})
