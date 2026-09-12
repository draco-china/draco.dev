export interface BrowserHistory {
  entries: string[];
  index: number;
}
export function visit(history: BrowserHistory, url: string): BrowserHistory {
  if (history.entries[history.index] === url) return history;
  const entries = [...history.entries.slice(0, history.index + 1), url].slice(
    -100,
  );
  return { entries, index: entries.length - 1 };
}
export function move(
  history: BrowserHistory,
  direction: -1 | 1,
): BrowserHistory {
  return {
    ...history,
    index: Math.min(
      history.entries.length - 1,
      Math.max(0, history.index + direction),
    ),
  };
}
export function addressUrl(
  value: string,
  engine: "google" | "bing" | "baidu" = "google",
): string | undefined {
  const input = value.trim();
  if (!input) return;
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !input.startsWith("https://"))
    return;
  const candidate = input.startsWith("https://")
    ? input
    : /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(input)
      ? `https://${input}`
      : undefined;
  if (candidate) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && !url.username && !url.password)
        return url.href;
      return;
    } catch {
      return;
    }
  }
  const base = {
    google: "https://www.google.com/search?q=",
    bing: "https://www.bing.com/search?q=",
    baidu: "https://www.baidu.com/s?wd=",
  }[engine];
  return base + encodeURIComponent(input);
}
