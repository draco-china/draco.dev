import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { initializeStandaloneAppearance } from "@workspace/app-sdk/appearance";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import App from "./app";
import "@workspace/theme";

initializeStandaloneAppearance();

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const container = document.getElementById("app");
if (!container) throw new Error("Missing application container");
await render(
  container,
  <StandaloneApp
    app={App}
    appId="about"
    allowedParentOrigins={["https://draco.dev", window.location.origin]}
    title="关于我 · draco.dev"
  />,
);
