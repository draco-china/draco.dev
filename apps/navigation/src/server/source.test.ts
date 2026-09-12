import { execFileSync } from "node:child_process";
import type { D1Database } from "@cloudflare/workers-types";
import { expect, it, vi } from "vitest";
import { replaceSnapshot } from "./database";
import { directUrl, fetchSourcePage } from "./source";

it("reads each card description after its heading and falls back only for empty descriptions", () => {
  // Bun supplies the streaming HTMLRewriter API used by the Worker.
  const html = `<div class="panel-title card">设计工具</div>
    <div class="card"><a class="card-heading" title="https://example.com/first">
      <span class="card-title">First</span></a>
      <div class="card-body">在线 <strong>图片编辑</strong>\n 与协作</div>
      <div class="card-footer">123 次访问</div></div>
    <div class="card"><a class="card-heading" title="https://example.com/second">
      <span class="card-title">Second</span></a><div class="card-body"> </div></div>
    <div class="card"><a class="card-heading" title="javascript:alert(1)">
      <span class="card-title">Rejected</span></a><div class="card-body">无效链接</div></div>
    <div class="tool"><a class="tool-heading" title="https://example.com/tool">
      <span class="tool-title">Editor</span></a><div class="tool-body">专业视频剪辑</div></div>`;
  const result = JSON.parse(
    execFileSync(
      "bun",
      [
        "--eval",
        `import { parseSource } from "./source.ts";
        const html = await Bun.stdin.text();
        console.log(JSON.stringify(await parseSource(html)));`,
      ],
      { cwd: new URL(".", import.meta.url), input: html, encoding: "utf8" },
    ),
  );
  expect(
    result.map((site: { description: string }) => site.description),
  ).toEqual(["在线 图片编辑 与协作", "设计工具相关网站", "专业视频剪辑"]);
});

it("uses direct URLs and removes referral parameters without permitting redirects or credentials", () => {
  expect(directUrl("https://example.com/tool?utm_source=x&mode=edit")).toBe(
    "https://example.com/tool?mode=edit",
  );
  for (const value of [
    "javascript:alert(1)",
    "https://u:p@example.com/",
    "https://chuangzaoshi.com/Go/?url=https://example.com",
    "http://127.0.0.1/",
  ])
    expect(directUrl(value)).toBeNull();
});
it("restricts source requests and rejects oversized or non-HTML responses", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response("{}", { headers: { "content-type": "application/json" } }),
    );
  await expect(fetchSourcePage("https://example.com", fetcher)).rejects.toThrow(
    "not allowed",
  );
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    fetchSourcePage("https://chuangzaoshi.com/", fetcher),
  ).rejects.toThrow("unavailable");
  fetcher.mockResolvedValueOnce(
    new Response("x".repeat(5_000_001), {
      headers: { "content-type": "text/html" },
    }),
  );
  await expect(
    fetchSourcePage("https://chuangzaoshi.com/", fetcher),
  ).rejects.toThrow("too large");
});
it("replaces snapshots in one atomic batch scoped to its source and rejects empty snapshots", async () => {
  const statements: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        args: [] as unknown[],
        bind(...args: unknown[]) {
          this.args = args;
          return this;
        },
      };
      statements.push(statement);
      return statement;
    },
    batch: vi.fn().mockResolvedValue([]),
  };
  await expect(
    replaceSnapshot(db as unknown as D1Database, []),
  ).rejects.toThrow("empty");
  expect(db.batch).not.toHaveBeenCalled();
  await replaceSnapshot(
    db as unknown as D1Database,
    [
      {
        section: "websites",
        group: "设计",
        id: "fixture",
        name: "Fixture",
        url: "https://example.com/",
        category: "工具",
        description: "工具相关网站",
        tags: [],
        icon: "F",
      },
    ],
    "2026-09-12T00:00:00.000Z",
  );
  expect(db.batch).toHaveBeenCalledOnce();
  expect(statements).toHaveLength(3);
  expect(statements[1].sql).toContain("WHERE source=? AND snapshot<>?");
  expect(statements[1].args[0]).toBe("chuangzaoshi");
  expect(statements[2].args).toEqual([
    "chuangzaoshi",
    "2026-09-12T00:00:00.000Z",
    1,
  ]);
});
