import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // FIX: Use '.' instead of process.cwd()
  // This tells Vite to look in the "current folder" for .env
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // 1. Create a fake 'process.env' so libraries don't crash in browser
      'process.env': {}
    }
  }
})