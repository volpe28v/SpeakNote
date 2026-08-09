import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// vite.config.ts とは分離している。ビルド設定（chunk 分割や minify）は
// テストに不要で、テスト専用の設定を混ぜるとビルド側の見通しが悪くなるため。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // vite.config.ts の '/src' は Vite が解決する URL 表記で Node からは辿れないため、
      // ここでは実ファイルパスに解決する
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // React フックのテストで DOM が要る
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
