import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173, // ou outra porta se necessário
    open: true, // abre o navegador automaticamente
  },
  plugins: [react(), tailwindcss()],
});