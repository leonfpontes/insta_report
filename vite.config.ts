import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// O painel é estático (dist/); as rotas em api/ são funções da Vercel. Em `npm run dev`, /api vai
// para a Vercel local (`npx vercel dev` na porta 3000) se ela estiver rodando.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { chunkSizeWarningLimit: 600 },
  server: { proxy: { "/api": "http://localhost:3000", "/_vercel": "http://localhost:3000" } },
});
