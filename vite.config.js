import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173, // ou outra porta se necessário
    open: false, // abre o navegador automaticamente
  },
  plugins: [react()],
  resolve: {
    alias: {
      '$': path.resolve(__dirname, './src'),
      '$api': path.resolve(__dirname, './src/api'),
      '$app': path.resolve(__dirname, './src/app'),
      '$assets': path.resolve(__dirname, './src/app/assets'),
      '$components': path.resolve(__dirname, './src/app/components'),
      '$pages': path.resolve(__dirname, './src/app/pages'),
      '$utils': path.resolve(__dirname, './src/app/utils'),
      '$context': path.resolve(__dirname, './src/app/context'),
    }
  }
})