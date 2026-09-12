import { createRenderer } from "@qwik.dev/router";
import Root from "./root";
export default createRenderer((options) => ({
  jsx: <Root />,
  options: {
    ...options,
    containerAttributes: { ...options.containerAttributes, lang: "zh-CN" },
  },
}));
