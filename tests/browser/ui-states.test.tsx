import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import {
  Button,
  Input,
  SegmentedControl,
  Switch,
  Textarea,
} from "@workspace/ui";
import { expect, test } from "vitest";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);

test("shared controls use borderless materials and consistent disabled/invalid states", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const view = await render(
    host,
    <div>
      <Button variant="secondary" disabled>
        Disabled
      </Button>
      <Button loading>Loading</Button>
      <Input aria-label="Input" disabled />
      <Textarea aria-label="Text" aria-invalid="true" />
      <Switch aria-label="Switch" disabled checked />
      <SegmentedControl
        label="Mode"
        value="a"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
        ]}
        onChange$={$(() => {})}
      />
    </div>,
  );
  try {
    for (const el of host.querySelectorAll<HTMLElement>(
      "button,input,textarea,fieldset",
    ))
      expect(getComputedStyle(el).borderTopWidth).toBe("0px");
    for (const el of host.querySelectorAll<HTMLElement>(":disabled")) {
      expect(getComputedStyle(el).opacity).toBe("0.45");
      expect(getComputedStyle(el).cursor).toBe("default");
    }
    expect(
      host.querySelector('button[aria-busy="true"]')?.hasAttribute("disabled"),
    ).toBe(true);
    expect(
      getComputedStyle(host.querySelector("textarea") as HTMLElement).boxShadow,
    ).not.toBe("none");
  } finally {
    view.cleanup();
    host.remove();
  }
});
