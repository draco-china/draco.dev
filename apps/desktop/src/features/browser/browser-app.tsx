import {
  $,
  component$,
  Slot,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@qwik.dev/core";
import { type AppContentProps, isSafeWebUrl } from "@workspace/app-sdk";
import { Button, IconButton, Input } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { addressUrl, move, visit } from "./navigation";
import { type BrowserSite, browserPermissions } from "./permissions";

export const BrowserApp = component$<
  AppContentProps & {
    engine?: "google" | "bing" | "baidu";
    sites?: BrowserSite[];
  }
>(({ host, engine = "google", sites = [] }) => {
  const history = useStore({ entries: [""], index: 0 });
  const address = useSignal("");
  const revision = useSignal(0);
  const loading = useSignal(false);
  const delayed = useSignal(false);
  const error = useSignal("");
  const current = history.entries[history.index] || "";
  const permissions = browserPermissions(current, sites);
  const navigate = $(async (value: string) => {
    const url = addressUrl(value, engine);
    if (!url) {
      error.value = "请输入 HTTPS 地址或搜索关键词";
      return;
    }
    error.value = "";
    Object.assign(history, visit(history, url));
    address.value = url;
    await host.navigate$(`/?url=${encodeURIComponent(url)}`);
  });
  const step = $(async (direction: -1 | 1) => {
    Object.assign(history, move(history, direction));
    address.value = history.entries[history.index] || "";
    await host.navigate$(
      address.value ? `/?url=${encodeURIComponent(address.value)}` : "/",
    );
  });
  useVisibleTask$(({ track }) => {
    const path = track(() => host.path);
    const url = new URL(path, "https://desktop.invalid").searchParams.get(
      "url",
    );
    const normalized = url && isSafeWebUrl(url) ? addressUrl(url) : "";
    if (
      normalized !== undefined &&
      normalized !== history.entries[history.index]
    ) {
      const index = history.entries.lastIndexOf(normalized);
      if (index >= 0) history.index = index;
      else Object.assign(history, visit(history, normalized));
      address.value = normalized;
    }
  });
  useVisibleTask$(({ track, cleanup }) => {
    const url = track(() => history.entries[history.index]);
    track(() => revision.value);
    delayed.value = false;
    loading.value = !!url;
    if (!url) return;
    const timer = setTimeout(() => {
      delayed.value = true;
    }, 10000);
    cleanup(() => clearTimeout(timer));
  });
  return (
    <div class="relative flex h-full min-h-0 flex-col">
      <form
        data-browser-toolbar
        class="relative flex h-12 shrink-0 items-center gap-1.5 bg-glass px-3 desktop:pl-[100px] max-phone:order-last max-phone:h-16 max-phone:gap-1 max-phone:px-2"
        preventdefault:submit
        onSubmit$={(_, form) =>
          navigate(String(new FormData(form).get("address") || ""))
        }
      >
        <IconButton
          aria-label="后退"
          disabled={history.index === 0}
          onClick$={() => step(-1)}
        >
          <Icon name="back" size={18} />
        </IconButton>
        <IconButton
          aria-label="前进"
          disabled={history.index >= history.entries.length - 1}
          onClick$={() => step(1)}
        >
          <span class="rotate-180">
            <Icon name="back" size={18} />
          </span>
        </IconButton>
        <div class="relative mx-auto flex h-8 min-w-0 max-w-[560px] flex-1 items-center rounded-control bg-content/5 px-2 shadow-sm focus-within:ring-2 focus-within:ring-accent/40">
          <Icon name="search" size={14} />
          <Input
            class="h-full min-w-0 flex-1 border-0 bg-transparent px-2 py-0 text-center text-xs shadow-none focus:text-left focus-visible:outline-none"
            name="address"
            aria-label="网页地址或搜索"
            placeholder="搜索或输入网站名称"
            bind:value={address}
            onFocus$={(_, el) => el.select()}
          />
          <IconButton
            size="sm"
            aria-label="刷新网页"
            disabled={!current}
            onClick$={() => revision.value++}
          >
            <Icon name="refresh" size={14} />
          </IconButton>
        </div>
        <button type="submit" class="sr-only">
          前往
        </button>
        <IconButton
          aria-label="浏览器起始页"
          onClick$={async () => {
            Object.assign(history, visit(history, ""));
            address.value = "";
            await host.navigate$("/");
          }}
        >
          <Icon name="home" size={18} />
        </IconButton>
        {current && (
          <a
            href={current}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在浏览器中打开"
            class="flex size-8.5 shrink-0 items-center justify-center rounded-control text-muted hover:bg-content/5 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="external" size={18} />
          </a>
        )}
        {loading.value && (
          <div
            role="status"
            aria-label="正在加载网页"
            class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-accent/60"
          />
        )}
      </form>
      {error.value && (
        <p role="alert" class="px-4 py-2 text-sm text-danger">
          {error.value}
        </p>
      )}
      {current ? (
        <>
          {delayed.value && (
            <div class="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 text-xs text-muted">
              <span>页面尚未显示？可以重试或在浏览器中打开。</span>
              <Button
                size="sm"
                variant="ghost"
                onClick$={() => revision.value++}
              >
                重试
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick$={() => {
                  delayed.value = false;
                }}
              >
                收起提示
              </Button>
            </div>
          )}
          <iframe
            key={`${current}:${revision.value}`}
            src={current}
            title="浏览网页"
            class="min-h-0 w-full flex-1 border-0 bg-white"
            sandbox={permissions.sandbox}
            allow={permissions.allow}
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad$={() => {
              loading.value = false;
            }}
          />
        </>
      ) : (
        <div class="min-h-0 flex-1 overflow-y-auto">
          <Slot />
        </div>
      )}
    </div>
  );
});
