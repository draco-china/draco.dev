# draco.dev

Apple 系统风格的个人桌面网站，集成搜索、应用导航、音乐播放器和个人介绍，适配桌面、平板与手机。

## 功能

- 桌面窗口、Dock、启动与欢迎界面
- Google、Bing、百度搜索及常用网站入口
- 分类导航、网站搜索和定时数据同步
- 静态音乐播放、播放队列、歌词和桌面小组件
- 个人介绍与工作经历
- 浅色、深色、主题色、壁纸及动态效果设置
- 服务端渲染、页面元信息、结构化数据和 sitemap

## 技术栈

- Qwik、Qwik Router、TypeScript
- Tailwind CSS v4、CVA、cn
- Bun Workspaces、Biome、Vitest Browser Mode
- Cloudflare Workers、D1、R2、Service Bindings、Cron Triggers

## 快速开始

需要 Bun 1.3.14 或兼容版本。

```sh
bun install --frozen-lockfile
bun run dev
```

主站默认运行在 `http://127.0.0.1:5175`，导航服务使用端口 `8787`。启动命令会构建导航 Worker 并应用本机数据库迁移。

```sh
bun run dev --port 5176
```

## 项目结构

```text
apps/
  desktop/      # 桌面宿主、页面路由和同源接口
  navigation/   # 导航应用、接口、数据库和定时同步
  about/        # 个人介绍
  music/        # 音乐播放器
packages/
  app-sdk/      # 应用宿主与通信协议
  theme/        # 主题和设计 token
  ui/           # 基础组件
public/         # 图标、壁纸和静态音乐
scripts/        # 开发、部署和音乐导入
tests/         # 单元、浏览器和生产构建测试
```

Qwik 应用的服务端源代码与路由位于 `src`。`dist` 和 `server` 为构建产物，由 Git 忽略。

## 配置

| 内容 | 文件 |
| --- | --- |
| 应用注册与外部地址 | `apps/desktop/src/features/desktop/app-registry.ts` |
| 默认外观、壁纸与搜索引擎 | `apps/desktop/src/features/site/model.ts` |
| 个人资料 | `apps/about/src/profile.ts` |
| 导航回退目录与首页精选 | `apps/navigation/src/catalog.ts`、`featured-catalog.ts` |
| SEO | `apps/desktop/src/features/seo` |
| 主站 Worker | `wrangler.jsonc` |
| 导航 Worker 与数据库 | `apps/navigation/wrangler.jsonc` |

外观偏好与音乐播放状态保存在当前浏览器。工具箱默认地址为 `https://tool.draco.dev/`。

### 音乐

音乐清单位于 `public/music/catalog.json`，音频使用同源静态资源。导入本地曲库：

```sh
bun run music:import "/音乐目录"
```

导入器保留原始文件、清理重复条目，并将超过 25 MiB 的音频转换为网页副本。macOS 使用 `afconvert`，其他平台需要 `ffmpeg`。详见 [音乐应用说明](apps/music/README.md)。

### 导航数据

导航使用 D1 数据库 `navigation`，绑定名为 `DB`。初始化迁移位于 `apps/navigation/migrations`。

```sh
bun run navigation:migrate:local
bun run navigation:sync:local
```

同步命令需要本机导航服务正在运行。Cron 每 15 分钟触发，北京时间 04:00 后首次执行更新目录，其余执行补齐图片缓存。来源覆盖创造狮的设计、前端、产品、运营等十个页面，图标校验后同步到 R2 存储桶 `navigation`（绑定 `ICONS`），D1 保存同源图片链接，浏览器按内容哈希缓存图片，来源失败时保留已有数据。

## 开发与测试

```sh
bun run check                 # Biome 与 Qwik 检查
bun run typecheck             # 应用类型检查
bun run typecheck:worker      # 服务端类型检查
bunx playwright install chromium firefox webkit
bun run test                  # 单元测试与 Browser Mode
bun run build                 # 构建全部应用
bun run test:production       # 验证生产构建
bun run build:worker          # Worker 打包检查
bun run validate              # 完整验证
bun run preview               # 本机预览完整 Workers，端口 4270
```

Browser Mode 使用 Playwright provider 驱动 Chromium、Firefox 和 WebKit。主站及导航通过 `qwik build` 统一构建浏览器资源与 Cloudflare SSR 产物。

## 部署

部署由主站 Worker `draco-dev` 和导航 Worker `navigation` 组成。主站通过 `NAVIGATION` Service Binding 调用导航服务，导航 Worker 管理 D1 和定时同步。

### Cloudflare Workers Builds

在 Cloudflare 关联 GitHub 仓库，配置：

| 选项 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 根目录 | `/` |
| 构建命令 | `bun run build` |
| 部署命令 | `bun run deploy:worker` |

构建环境需要目标账户的 Workers、D1 和 R2 权限。部署脚本自动创建或复用 `navigation` 数据库及同名 R2 存储桶，应用迁移，再依次部署导航 Worker 和主站。推送到生产分支后由 Cloudflare 自动构建部署。

### 本机部署

```sh
bunx wrangler login
bun run deploy
```

部署前确认两个 Wrangler 配置中的 `account_id`。数据库 ID 由部署脚本写入临时配置，凭据通过 Cloudflare 或本机环境管理。

公开路由为 `/`、`/about`、`/music`、`/navigation`。更换正式域名时，同步 SEO 配置、`public/robots.txt` 和 `public/sitemap.xml`。
