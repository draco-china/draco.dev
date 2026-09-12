import { z } from "zod";

export function isStaticImageUrl(value: string): boolean {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.startsWith("/media/")
  )
    return [...value].every((character) => character.charCodeAt(0) > 32);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
const link = z
  .string()
  .max(2048)
  .refine((v) => !v || isStaticImageUrl(v), "请输入静态资源路径或 HTTPS 链接");
export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  accent: z.enum([
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "graphite",
  ]),
  icons: z.enum(["original", "tinted"]),
  wallpaper: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  motion: z.enum(["system", "full", "reduced"]),
  engine: z.enum(["google", "bing", "baidu"]),

  wallpapers: z
    .array(
      z.object({
        id: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-zA-Z0-9_-]+$/),
        name: z.string().max(80),
        url: z.string().max(2048).refine(isStaticImageUrl),
      }),
    )
    .max(30),
});
export const siteSchema = z.object({
  profile: z.object({
    name: z.string().max(80),
    tagline: z.string().max(160),
    bio: z.string().max(10000),
    now: z.string().max(1000),
    avatar: link,
    skills: z.string().max(1000),
    title: z.string().max(100),
    description: z.string().max(300),
  }),
  settings: settingsSchema,
});
export type SiteData = z.infer<typeof siteSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = {
  theme: "system",
  accent: "blue",
  icons: "original",
  wallpaper: "alpine",
  motion: "system",
  engine: "google",
  wallpapers: [],
};
export const defaultSite: SiteData = {
  profile: {
    name: "Draco",
    tagline: "欢迎来到我的数字桌面",
    bio: "",
    now: "",
    avatar: "",
    skills: "",
    title: "Draco — 个人桌面",
    description: "关于我、音乐、应用导航与我的数字生活。",
  },
  settings: defaultSettings,
};
export const searchUrl = (engine: Settings["engine"], query: string) =>
  ({
    google: "https://www.google.com/search?q=",
    bing: "https://www.bing.com/search?q=",
    baidu: "https://www.baidu.com/s?wd=",
  })[engine] + encodeURIComponent(query);
