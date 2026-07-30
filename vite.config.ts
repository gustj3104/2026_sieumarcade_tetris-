import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/2026_sieumarcade_tetris-/',
  plugins: [react()],
})
