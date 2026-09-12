import { qwikVite } from "@qwik.dev/core/optimizer";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig(({ isPreview }) => ({
  root: new URL(".", import.meta.url).pathname,
  server: { host: "127.0.0.1" },
  plugins: [
    !isPreview && qwikVite({ csr: true, devTools: { clickToSource: false } }),
    tailwindcss(),
  ],
}));
