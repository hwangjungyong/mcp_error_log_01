import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5183, // 충돌 방지를 위해 5183 포트 사용
    proxy: {
      '/api': {
        target: 'http://localhost:3011', // API 서버 포트
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

