/** Progress counts settled critical resources; failures leave the desktop fallback usable. */
export async function settleStartupResources(
  resources: Promise<unknown>[],
  update: (progress: number) => void,
) {
  let completed = 0;
  update(0);
  await Promise.all(
    resources.map(async (resource) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          resource,
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 8000);
          }),
        ]);
      } catch {
        // A failed image uses its existing text or background fallback.
      } finally {
        clearTimeout(timer);
        completed += 1;
        update(Math.round((completed / resources.length) * 100));
      }
    }),
  );
  if (!resources.length) update(100);
}
