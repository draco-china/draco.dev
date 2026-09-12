import { $, component$, render, useStore } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { EmbeddedApp } from "../../packages/app-sdk/src/embedded";
import {
  type AppContentProps,
  type AppHost,
  createAppMessage,
} from "../../packages/app-sdk/src/index";
import { StandaloneApp } from "../../packages/app-sdk/src/standalone";

const script = document.createElement("script");
script.textContent = QWIK_LOADER;
document.head.append(script);
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
const originalUrl = location.href;
afterEach(() => {
  cleanup?.();
  container?.remove();
  history.replaceState(null, "", originalUrl);
});
const Fixture = component$(() => {
  const host = useStore<AppHost>({
    mode: "desktop",
    appearance: { theme: "dark", accent: "purple", reducedMotion: true },
    visible: true,
    path: "/start",
    openUrl$: $((url: string) => {
      document.body.dataset.sdkOpen = url;
    }),
    navigate$: $((path: string) => {
      document.body.dataset.sdkPath = path;
    }),
    setTitle$: $((title: string) => {
      document.body.dataset.sdkTitle = title;
    }),
  });
  return (
    <div>
      <button
        type="button"
        onClick$={() => {
          host.visible = false;
          host.path = "/next";
          host.appearance = {
            theme: "light",
            accent: "green",
            reducedMotion: false,
          };
        }}
      >
        Update host
      </button>
      <EmbeddedApp
        host={host}
        appId="fixture"
        url={`${location.origin}/tests/fixtures/sdk.html`}
        bridge
      />
    </div>
  );
});
async function mount() {
  container = document.createElement("div");
  document.body.append(container);
  cleanup = (await render(container, <Fixture />)).cleanup;
}
function frame() {
  const value = container.querySelector("iframe");
  if (!value) throw new Error("Missing child");
  return value;
}
function state() {
  const text = frame().contentDocument?.getElementById("state")?.textContent;
  return text ? JSON.parse(text) : null;
}
test("embedded handshake with a real child window synchronizes appearance visibility and path both ways", async () => {
  await mount();

  await expect
    .poll(() => state(), { timeout: 10000 })
    .toMatchObject({
      appearance: { theme: "dark", accent: "purple", reducedMotion: true },
    });
  await expect.poll(() => state()?.path).toBe("/start");
  await page.getByRole("button", { name: "Update host" }).click();
  await expect
    .poll(() => state(), { timeout: 10000 })
    .toMatchObject({
      visible: false,
      path: "/next",
      appearance: { theme: "light", accent: "green", reducedMotion: false },
    });
  frame().contentDocument?.getElementById("navigate")?.click();
  await expect.poll(() => document.body.dataset.sdkPath).toBe("/album/42");
  frame().contentDocument?.getElementById("title")?.click();
  await expect.poll(() => document.body.dataset.sdkTitle).toBe("Album 42");
  frame().contentDocument?.getElementById("open")?.click();
  await expect
    .poll(() => document.body.dataset.sdkOpen)
    .toBe("https://example.com/song");
});
test("embedded boundary rejects wrong origin and window source", async () => {
  await mount();
  await expect.poll(() => state()?.path, { timeout: 10000 }).toBe("/start");
  delete document.body.dataset.sdkTitle;
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://wrong.example",
      source: frame().contentWindow,
      data: createAppMessage("fixture", {
        type: "title",
        title: "Wrong origin",
      }),
    }),
  );
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      source: window,
      data: createAppMessage("fixture", {
        type: "title",
        title: "Wrong source",
      }),
    }),
  );
  expect(document.body.dataset.sdkTitle).toBeUndefined();
});

const StandaloneContent = component$<AppContentProps>(({ host }) => (
  <output id="standalone-state">
    {JSON.stringify({
      mode: host.mode,
      path: host.path,
      visible: host.visible,
      appearance: host.appearance,
    })}
  </output>
));
test("standalone bridge applies only messages from configured parent origin and source", async () => {
  const url = new URL(location.href);
  url.searchParams.set("hostOrigin", location.origin);
  url.searchParams.set("appId", "fixture");
  history.replaceState(null, "", url);
  container = document.createElement("div");
  document.body.append(container);
  cleanup = (
    await render(
      container,
      <StandaloneApp
        app={StandaloneContent}
        appId="fixture"
        title="Fixture"
        allowedParentOrigins={[location.origin]}
      />,
    )
  ).cleanup;
  const current = () =>
    JSON.parse(container.querySelector("output")?.textContent || "{}");
  await expect.poll(() => current().mode).toBe("desktop");
  const appearance = {
    theme: "dark",
    accent: "orange",
    reducedMotion: true,
  } as const;
  const message = createAppMessage("fixture", {
    type: "appearance",
    value: appearance,
  });
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://wrong.example",
      source: parent,
      data: message,
    }),
  );
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      source: window,
      data: message,
    }),
  );
  expect(current().appearance.accent).toBe("blue");
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      source: parent,
      data: message,
    }),
  );
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      source: parent,
      data: createAppMessage("fixture", { type: "visibility", visible: false }),
    }),
  );
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: location.origin,
      source: parent,
      data: createAppMessage("fixture", {
        type: "path",
        path: "/library?tab=favorites",
      }),
    }),
  );
  await expect
    .poll(() => current())
    .toMatchObject({
      visible: false,
      path: "/library?tab=favorites",
      appearance,
    });
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    true,
  );
  expect(new URL(location.href).searchParams.get("hostOrigin")).toBe(
    location.origin,
  );
});
