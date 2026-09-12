import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { expect, test } from "vitest";
import { AppIcon } from "../../apps/desktop/src/features/desktop/app-icon";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);

test("semantic appearance tokens change in both modes and tinted icons use all eight accent colors", async () => {
  const root = document.documentElement;
  const previousTheme = root.dataset.theme;
  const previousAccent = root.dataset.accent;
  const host = document.createElement("div");
  host.dataset.icons = "tinted";
  document.body.append(host);
  const view = await render(host, <AppIcon app="about" />);
  try {
    const tint = host.querySelector<HTMLElement>("[data-icon-tint]");
    if (!tint) throw new Error("Missing icon tint");
    const colors = new Set<string>();
    for (const theme of ["light", "dark"]) {
      root.dataset.theme = theme;
      expect(getComputedStyle(root).colorScheme).toBe(theme);
      for (const accent of [
        "blue",
        "purple",
        "pink",
        "red",
        "orange",
        "yellow",
        "green",
        "graphite",
      ]) {
        root.dataset.accent = accent;
        const style = getComputedStyle(tint);
        expect(style.display).toBe("block");
        expect(style.mixBlendMode).toBe("color");
        expect(style.maskImage).toContain("/icons/macos/about.webp");
        colors.add(style.backgroundColor);
      }
    }
    expect(colors.size).toBe(8);
    host.dataset.icons = "original";
    expect(getComputedStyle(tint).display).toBe("none");
    expect(
      getComputedStyle(host.querySelector("img") as HTMLImageElement).filter,
    ).toBe("none");
  } finally {
    view.cleanup();
    host.remove();
    if (previousTheme) root.dataset.theme = previousTheme;
    else delete root.dataset.theme;
    if (previousAccent) root.dataset.accent = previousAccent;
    else delete root.dataset.accent;
  }
});
