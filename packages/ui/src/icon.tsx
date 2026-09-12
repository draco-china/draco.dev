import { component$ } from "@qwik.dev/core";

const paths: Record<string, string> = {
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 6v6l4 2",
  shuffle:
    "M3 6h3c5 0 7 12 12 12h3 M17 14l4 4-4 4 M3 18h3c2 0 4-3 5-6s4-6 7-6h3 M17 2l4 4-4 4",
  volume: "M11 5L6 9H2v6h4l5 4z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14",
  "chevron-down": "M5 8l7 7 7-7",
  play: "M8 5l11 7-11 7z",
  pause: "M8 5v14 M16 5v14",
  previous: "M6 5v14 M18 5l-10 7 10 7z",
  next: "M18 5v14 M6 5l10 7-10 7z",
  code: "M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  external: "M14 3h7v7 M21 3L10 14 M11 5H4v16h16v-7",
  music:
    "M9 18V5l11-2v13 M9 8l11-2 M9 18a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3 M20 16a3 3 0 1 1-3-3c1.66 0 3 1.34 3 3",
  navigation: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
  browser: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 8l-3 5-5 3 3-5z",
  tools: "M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 4-4-4z",
  news: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h4",
  projects: "M3 7h7l2 2h9v11H3z M3 7V4h7l2 3",
  about: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2",
  contact: "M3 5h18v14H3z M3 6l9 7 9-7",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2",
  manage: "M4 5h16v15H4z M8 3v4 M16 3v4 M7 11h10 M7 15h6",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M15 5l-7 7 7 7",
  lock: "M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3",
  refresh: "M20 8a8 8 0 1 0 0 8 M20 3v5h-5",
  sun: "M16.1 12a4.1 4.1 0 1 1-8.2 0 4.1 4.1 0 0 1 8.2 0 M12 2.3v2 M12 19.7v2 M2.3 12h2 M19.7 12h2 M5.14 5.14l1.42 1.42 M17.44 17.44l1.42 1.42 M5.14 18.86l1.42-1.42 M17.44 6.56l1.42-1.42",
  wifi: "M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 20h.01",
  home: "M3 11l9-8 9 8 M5 9v12h14V9 M9 21v-8h6v8",
  plus: "M12 4v16 M4 12h16",
  check: "M4 12l5 5L20 6",
  close: "M6 6l12 12 M6 18L18 6",
};
export const Icon = component$<{ name: string; size?: number }>(
  ({ name, size = 22 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={name === "sun" ? 1.5 : 1.7}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {name === "wifi" ? (
        <path
          fill="currentColor"
          stroke="none"
          d="M1.4 7.2a16.1 16.1 0 0 1 21.2 0l-1.8 2a13.4 13.4 0 0 0-17.6 0z M5 11.3a10.6 10.6 0 0 1 14 0l-1.8 2a7.9 7.9 0 0 0-10.4 0z M8.6 15.4a5.1 5.1 0 0 1 6.8 0L12 19.2z"
        />
      ) : (
        <path d={paths[name] || paths.projects} />
      )}
    </svg>
  ),
);
