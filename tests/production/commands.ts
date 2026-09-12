import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { MessageChannel } from "node:worker_threads";
import type { BrowserCommand } from "vitest/node";
import "@vitest/browser-playwright";

const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};
// Qwik creates scheduler channels at module scope. Node must not keep the test
// process running after browser verification has closed its pages.
const builtWorkers: Partial<
  Record<
    "desktop" | "navigation",
    Promise<{
      fetch: (
        request: Request,
        env: unknown,
        ctx: unknown,
      ) => Promise<Response>;
    }>
  >
> = {};
function loadBuiltWorker(app: "desktop" | "navigation") {
  builtWorkers[app] ??= (async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "MessageChannel",
    );
    // These bundles run in separate Worker isolates in production.
    const qwikVersion = Object.getOwnPropertyDescriptor(globalThis, "__qwik");
    Reflect.deleteProperty(globalThis, "__qwik");
    const channels: MessageChannel[] = [];
    Object.defineProperty(globalThis, "MessageChannel", {
      configurable: true,
      value: class extends MessageChannel {
        constructor() {
          super();
          channels.push(this);
        }
      },
    });
    try {
      return (
        await import(
          /* @vite-ignore */ pathToFileURL(
            resolve(`apps/${app}/server/entry.cloudflare.js`),
          ).href
        )
      ).default;
    } finally {
      if (qwikVersion) Object.defineProperty(globalThis, "__qwik", qwikVersion);
      else Reflect.deleteProperty(globalThis, "__qwik");
      for (const channel of channels) {
        channel.port1.unref();
        channel.port2.unref();
      }
      if (descriptor)
        Object.defineProperty(globalThis, "MessageChannel", descriptor);
      else Reflect.deleteProperty(globalThis, "MessageChannel");
    }
  })();
  return builtWorkers[app];
}
type BuiltApp = "desktop" | "about" | "music" | "navigation";
export const inspectBuiltApp: BrowserCommand<[app: BuiltApp]> = async (
  { context },
  app,
) => {
  const root = resolve(`apps/${app}/dist`);
  const origin = `https://${app}-build.test:444`;
  const errors: string[] = [];
  const missing: string[] = [];
  const browserPage = await context.newPage();
  browserPage.setDefaultTimeout(5000);
  browserPage.setDefaultNavigationTimeout(5000);
  let serverHtml = "";
  let serverStatus = 0;
  let notFoundStatus = 0;
  let navigationHtml = "";
  const assetResponse = async (request: Request) => {
    const path = decodeURIComponent(new URL(request.url).pathname);
    const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
    if (!file.startsWith(`${root}${sep}`))
      return new Response(null, { status: 403 });
    try {
      return new Response(await readFile(file), {
        headers: {
          "Content-Type": mime[extname(file)] || "application/octet-stream",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
  const worker =
    app === "desktop" || app === "navigation"
      ? await loadBuiltWorker(app)
      : undefined;
  const serve = (request: Request): Promise<Response> =>
    worker
      ? worker.fetch(
          request,
          {
            ASSETS: { fetch: assetResponse },
            NAVIGATION: {
              fetch: async () =>
                Response.json({
                  sites: [
                    {
                      id: "ssr-fixture",
                      name: "Server catalog fixture",
                      url: "https://example.com/",
                      category: "开发",
                      description: "Loaded through the service binding",
                      icon: "S",
                      tags: [],
                    },
                  ],
                  categories: ["开发"],
                  updatedAt: "2026-09-12T00:00:00Z",
                }),
            },
          },
          {
            waitUntil: (promise: Promise<unknown>) => promise.catch(() => {}),
            passThroughOnException: () => {},
          },
        )
      : assetResponse(request);
  if (worker) {
    const response = await serve(new Request(`${origin}/`));
    serverStatus = response.status;
    serverHtml = await response.text();
    navigationHtml =
      app === "desktop"
        ? await (await serve(new Request(`${origin}/navigation`))).text()
        : "";
    notFoundStatus = (
      await serve(new Request(`${origin}/definitely-missing-page/`))
    ).status;
  }
  browserPage.on("pageerror", (error) => errors.push(error.message));
  await browserPage.route(`${origin}/**`, async (route) => {
    const request = route.request();
    const response = await serve(
      new Request(request.url(), {
        method: request.method(),
        headers: request.headers(),
      }),
    );
    const path = new URL(request.url()).pathname;
    if (
      response.status === 404 &&
      !path.startsWith("/api/") &&
      path !== "/favicon.ico"
    )
      missing.push(path);
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  try {
    await browserPage.goto(`${origin}/`);
    if (
      app === "desktop" &&
      (await browserPage
        .getByRole("button", { name: "进入桌面", exact: true })
        .isVisible())
    )
      await browserPage
        .getByRole("button", { name: "进入桌面", exact: true })
        .click();
    const locator =
      app === "desktop"
        ? browserPage.getByLabel("搜索关键词")
        : app === "music"
          ? browserPage.getByLabel("搜索歌曲")
          : app === "navigation"
            ? browserPage.getByLabel("搜索网站")
            : browserPage.getByText("Draco", { exact: true }).first();
    await locator.waitFor({ state: "visible", timeout: 5000 });
    if (app === "desktop") {
      await locator.fill("Qwik SSR");
      if ((await locator.inputValue()) !== "Qwik SSR")
        throw new Error("Search did not resume");
    }
    if (app === "desktop") {
      await browserPage
        .getByRole("button", { name: "关于我", exact: true })
        .click();
      await browserPage.waitForURL("**/about");
      const about = browserPage.locator('[data-window="about"]');
      await about.waitFor({ state: "visible" });
      const original = await about.elementHandle();
      await browserPage
        .getByRole("button", { name: "应用导航", exact: true })
        .click();
      await browserPage.waitForURL("**/navigation");
      await browserPage
        .locator('[data-window="navigation"]')
        .waitFor({ state: "visible" });
      await browserPage.waitForFunction(() => document.title.includes("导航"));
      await browserPage.goBack();
      await browserPage.waitForURL("**/about");
      if (
        !original ||
        !(await original.evaluate(
          (node) => node === document.querySelector('[data-window="about"]'),
        ))
      )
        throw new Error("Router replaced the desktop window");
      await browserPage.waitForFunction(() => document.title.includes("关于"));
    }
    if (app === "music")
      await browserPage.locator("audio[src]").waitFor({ state: "attached" });
    return {
      navigationHtml,
      serverHtml,
      serverStatus,
      notFoundStatus,
      title: await browserPage.title(),
      errors,
      missing,
      stylesheets: await browserPage.locator('link[rel="stylesheet"]').count(),
      text: (await browserPage.locator("body").innerText()).slice(0, 1000),
    };
  } catch (error) {
    throw new Error(
      `${String(error)}; page errors: ${errors.join("; ")}; body: ${(await browserPage.locator("body").innerText()).slice(0, 700)}`,
    );
  } finally {
    await browserPage.close();
  }
};

declare module "vitest/browser" {
  interface BrowserCommands {
    inspectBuiltApp(app: BuiltApp): Promise<{
      navigationHtml: string;
      serverHtml: string;
      serverStatus: number;
      notFoundStatus: number;
      title: string;
      errors: string[];
      missing: string[];
      stylesheets: number;
      text: string;
    }>;
  }
}
