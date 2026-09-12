import { component$ } from "@qwik.dev/core";
export const Spinner = component$<{ label?: string }>(
  ({ label = "处理中" }) => (
    <span
      class="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent reduced:animate-none"
      role="progressbar"
      aria-label={label}
    />
  ),
);
