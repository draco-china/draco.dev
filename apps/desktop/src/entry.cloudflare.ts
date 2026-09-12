import { createQwikRouter } from "@qwik.dev/router/middleware/cloudflare-pages";
import render from "./entry.ssr";
export default { fetch: createQwikRouter({ render }) };
