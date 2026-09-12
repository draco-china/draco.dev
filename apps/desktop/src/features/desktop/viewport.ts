export interface ViewportRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Restrict the canvas only when hardware segments leave an actual occluded gap. */
export function selectViewportRegion(
  width: number,
  height: number,
  segments: readonly ViewportRegion[] = [],
): ViewportRegion | null {
  if (segments.length < 2) return null;
  const visible = segments
    .filter((r) => [r.left, r.top, r.width, r.height].every(Number.isFinite))
    .map((r) => {
      const left = Math.max(0, r.left);
      const top = Math.max(0, r.top);
      return {
        left,
        top,
        width: Math.max(0, Math.min(width, r.left + r.width) - left),
        height: Math.max(0, Math.min(height, r.top + r.height) - top),
      };
    })
    .filter((r) => r.width > 0 && r.height > 0)
    .sort(
      (a, b) =>
        b.width * b.height - a.width * a.height ||
        a.top - b.top ||
        a.left - b.left,
    );
  // A continuous folding display can expose adjacent segments. Use its whole
  // canvas rather than treating a crease as missing pixels. Compute the union
  // by vertical strips so overlapping or more than two segments are supported.
  const edges = [
    ...new Set([
      0,
      width,
      ...visible.flatMap((r) => [r.left, r.left + r.width]),
    ]),
  ].sort((a, b) => a - b);
  let covered = 0;
  for (let i = 1; i < edges.length; i++) {
    const left = edges[i - 1];
    const right = edges[i];
    const ranges = visible
      .filter((r) => r.left <= left && r.left + r.width >= right)
      .map((r) => [r.top, r.top + r.height])
      .sort((a, b) => a[0] - b[0]);
    let bottom = 0;
    let heightCovered = 0;
    for (const [top, end] of ranges) {
      heightCovered += Math.max(0, end - Math.max(top, bottom));
      bottom = Math.max(bottom, end);
    }
    covered += (right - left) * heightCovered;
  }
  if (Math.abs(covered - width * height) < 0.001) return null;
  return visible[0] ?? null;
}

export function updateViewportRegion(): boolean {
  const viewport = (
    window as Window & {
      viewport?: { segments?: readonly ViewportRegion[] };
    }
  ).viewport;
  const region = selectViewportRegion(
    innerWidth,
    innerHeight,
    viewport?.segments ?? [],
  );
  const root = document.documentElement;
  const validSegments = (viewport?.segments ?? []).filter(
    (r) =>
      [r.left, r.top, r.width, r.height].every(Number.isFinite) &&
      r.width > 0 &&
      r.height > 0 &&
      r.left < innerWidth &&
      r.top < innerHeight &&
      r.left + r.width > 0 &&
      r.top + r.height > 0,
  );
  root.toggleAttribute("data-foldable", validSegments.length >= 2);
  root.toggleAttribute("data-segmented", !!region);
  for (const key of ["left", "top", "width", "height"] as const) {
    if (region) root.style.setProperty(`--segment-${key}`, `${region[key]}px`);
    else root.style.removeProperty(`--segment-${key}`);
  }
  return !!region;
}
