import { viteAdapter } from "@qwik.dev/router/adapters/shared/vite";
import { extendConfig } from "@qwik.dev/router/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, {
  build: { ssr: "src/entry.cloudflare.ts" },
  plugins: [
    viteAdapter({
      name: "cloudflare-workers",
      origin: "https://draco.dev",
      ssg: null,
      config: () => ({
        resolve: { conditions: ["webworker", "worker"] },
        ssr: {
          target: "webworker",
          noExternal: true,
          external: ["node:async_hooks"],
        },
        build: { rolldownOptions: { output: { format: "es" } } },
        publicDir: false,
      }),
    }),
  ],
});
