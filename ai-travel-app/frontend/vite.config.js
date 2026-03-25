import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      // 1. Create a fake 'process.env' so libraries don't crash in browser
      'process.env': {}
    }
  }
})