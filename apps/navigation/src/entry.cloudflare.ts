import { createQwikRouter } from "@qwik.dev/router/middleware/cloudflare-pages";
import render from "./entry.ssr";
import { scheduled } from "./server/scheduled";
export default { fetch: createQwikRouter({ render }), scheduled };
