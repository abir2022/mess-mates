import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5273 },
  build: {
    rollupOptions: {
      output: {
        // React and Supabase change far less often than app code, so giving them
        // their own chunks keeps them cached across deploys and keeps the entry
        // chunk small enough to parse quickly on a budget phone.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
