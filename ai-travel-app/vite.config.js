import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // FIX: Use '.' instead of process.cwd()
  // This tells Vite to look in the "current folder" for .env
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // 1. Create a fake 'process.env' so libraries like groq-sdk don't crash
      'process.env': {},
      
      // 2. Put your API keys into a global window variable
      'window.ENV': {
        GROQ_API_KEY: JSON.stringify(env.GROQ_API_KEY),
        GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY),
      }
    }
  }
})