export function motionTokens() {
  const style = getComputedStyle(document.documentElement);
  return {
    enter:
      Number.parseFloat(style.getPropertyValue("--duration-window")) || 360,
    exit: Number.parseFloat(style.getPropertyValue("--duration-exit")) || 280,
    ease: style.getPropertyValue("--ease").trim(),
    exitEase: style.getPropertyValue("--ease-exit").trim(),
    spring: style.getPropertyValue("--system-ease-spring").trim(),
  };
}
/** Client-only helpers. Call after a window is mounted and visible. */
type WindowMotion = "open" | "close" | "minimize" | "restore";
const running = new WeakMap<HTMLElement, Animation>();
function find(attribute: string, id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[${attribute}="${CSS.escape(id)}"]`,
  );
}

export async function animateWindow(
  id: string,
  kind: WindowMotion,
  desktop: boolean,
): Promise<boolean> {
  const element = find("data-window", id);
  if (!element?.isConnected) return false;
  const previous = running.get(element);
  const visual = getComputedStyle(element);
  const interrupted = previous && previous.playState !== "finished";
  const current = { transform: visual.transform, opacity: visual.opacity };
  previous?.cancel();
  // The window shell's CSS entrance must not compete with its FLIP transform.
  for (const animation of element.getAnimations()) animation.cancel();
  const reduced = document.documentElement.classList.contains("reduce-motion");
  if (!element.animate || reduced) {
    running.delete(element);
    return element.isConnected;
  }
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) return element.isConnected;
  const destination = find("data-dock", id);
  const icon = destination?.getBoundingClientRect();
  const origin = icon
    ? `translate(${icon.x + icon.width / 2 - box.x - box.width / 2}px, ${icon.y + icon.height / 2 - box.y - box.height / 2}px) scale(${Math.max(0.02, icon.width / box.width)}, ${Math.max(0.02, icon.height / box.height)})`
    : desktop
      ? "translateY(18px) scale(0.93)"
      : "translateY(40px) scale(0.94)";
  const entering = kind === "open" || kind === "restore";
  const start: Keyframe =
    interrupted || (!entering && current.transform !== "none")
      ? current
      : entering
        ? { transform: origin, opacity: 0.15 }
        : { transform: "none", opacity: 1 };
  const end: Keyframe = entering
    ? { transform: "none", opacity: 1 }
    : { transform: origin, opacity: 0 };
  const tokens = motionTokens();
  const animation = element.animate(
    [
      { ...start, transformOrigin: "center center" },
      { ...end, transformOrigin: "center center" },
    ],
    {
      duration: entering ? tokens.enter : tokens.exit,
      easing: entering ? tokens.ease : tokens.exitEase,
      fill: "forwards",
    },
  );
  running.set(element, animation);
  try {
    await animation.finished;
    if (!element.isConnected || running.get(element) !== animation)
      return false;
    // Entering windows return to layout control. Exiting windows retain their
    // final invisible frame until the caller hides or unmounts the element.
    if (entering) {
      animation.cancel();
      running.delete(element);
    }
    return true;
  } catch {
    return false;
  }
}

export function focusWindow(id: string): void {
  const element = find("data-window", id);
  if (!element) return;
  const target =
    element.querySelector<HTMLElement>("[data-window-title], h1, h2") ||
    element.querySelector<HTMLElement>("[data-back]") ||
    element.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), a[href], [tabindex='0']",
    ) ||
    element;
  if (!target.matches("button,input,a[href],select,textarea,[tabindex]"))
    target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

export function focusDock(id: string): void {
  (find("data-dock", id) || find("data-dock", "home"))?.focus({
    preventScroll: true,
  });
}
