import { component$, type QRL } from "@qwik.dev/core";
import { Icon } from "@workspace/ui/icon";
import { cn } from "cn";

export const NavigationSidebar = component$<{
  groups: string[];
  selected: string;
  onChange$: QRL<(group: string) => void>;
}>(({ groups, selected, onChange$ }) => (
  <nav
    aria-label="导航分类"
    class="hidden w-[190px] shrink-0 flex-col gap-2 overflow-y-auto bg-content/3 p-3 @min-[760px]:flex"
  >
    <p class="px-3 pb-3 pt-2 text-xs font-medium text-muted">浏览分类</p>
    {["", ...groups].map((group) => (
      <button
        key={`group:${group}`}
        type="button"
        aria-pressed={selected === group}
        onClick$={() => onChange$(group)}
        class={cn(
          "flex min-h-12 items-center gap-3 rounded-control px-3 text-left text-sm transition-colors hover:bg-content/7 focus-visible:outline-2 focus-visible:outline-accent",
          selected === group
            ? "bg-accent/18 font-medium text-accent"
            : "text-content",
        )}
      >
        <span
          aria-hidden="true"
          class="grid size-6 shrink-0 place-items-center text-muted"
        >
          <Icon
            name={
              group === "前端"
                ? "code"
                : group === "设计"
                  ? "tools"
                  : group === "产品" || group === "3D打印"
                    ? "projects"
                    : group === "运营"
                      ? "news"
                      : group === "工作兼职"
                        ? "manage"
                        : group === "自然艺术"
                          ? "sun"
                          : group
                            ? "browser"
                            : "navigation"
            }
            size={20}
          />
        </span>
        {group || "全部"}
      </button>
    ))}
  </nav>
));
