interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Fixed popovers use layout coordinates, including a panned visual viewport. */
export function selectPosition(
  trigger: DOMRect,
  count: number,
  align: "start" | "end" = "start",
) {
  const visual = window.visualViewport;
  const visible: Bounds = {
    left: visual?.offsetLeft ?? 0,
    top: visual?.offsetTop ?? 0,
    right: (visual?.offsetLeft ?? 0) + (visual?.width ?? innerWidth),
    bottom: (visual?.offsetTop ?? 0) + (visual?.height ?? innerHeight),
  };
  const viewport = (window as Window & { viewport?: { segments?: DOMRect[] } })
    .viewport;
  const regions = (viewport?.segments ?? [visible])
    .map((segment) => ({
      left: Math.max(visible.left, segment.left),
      top: Math.max(visible.top, segment.top),
      right: Math.min(visible.right, segment.right),
      bottom: Math.min(visible.bottom, segment.bottom),
    }))
    .filter(
      (region) => region.right > region.left && region.bottom > region.top,
    );
  const centerX = (trigger.left + trigger.right) / 2;
  const centerY = (trigger.top + trigger.bottom) / 2;
  regions.sort((a, b) => {
    const distance = (region: Bounds) =>
      Math.hypot(
        centerX - Math.max(region.left, Math.min(centerX, region.right)),
        centerY - Math.max(region.top, Math.min(centerY, region.bottom)),
      );
    return distance(a) - distance(b);
  });
  const region = regions[0] ?? visible;
  const leftEdge = region.left + 8;
  const rightEdge = Math.max(leftEdge, region.right - 8);
  const topEdge = region.top + 8;
  const bottomEdge = Math.max(topEdge, region.bottom - 8);
  const width = Math.min(Math.max(trigger.width, 220), rightEdge - leftEdge);
  const below = Math.max(0, bottomEdge - trigger.bottom - 4);
  const above = Math.max(0, trigger.top - topEdge - 4);
  const placeBelow = below >= Math.min(280, count * 44 + 12) || below >= above;
  const height = Math.min(
    280,
    placeBelow ? below : above,
    bottomEdge - topEdge,
  );
  const actualHeight = Math.min(count * 44 + 12, height);
  const preferredTop = placeBelow
    ? trigger.bottom + 4
    : trigger.top - actualHeight - 4;
  return {
    width,
    left: Math.max(
      leftEdge,
      Math.min(
        align === "end" ? trigger.right - width : trigger.left,
        rightEdge - width,
      ),
    ),
    top: Math.max(topEdge, Math.min(preferredTop, bottomEdge - actualHeight)),
    height: actualHeight,
  };
}
