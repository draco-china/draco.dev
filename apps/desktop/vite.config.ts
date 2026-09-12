import { qwikVite } from "@qwik.dev/core/optimizer";
import { qwikRouter } from "@qwik.dev/router/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    proxy: { "/api/navigation": "http://127.0.0.1:8787" },
  },
  plugins: [
    qwikRouter({ trailingSlash: false, strictLoaders: false }),
    qwikVite({
      client: { input: "src/root.tsx" },
      lint: false,
      devTools: { clickToSource: false },
    }),
    tailwindcss(),
  ],
  publicDir: "../../public",
});
