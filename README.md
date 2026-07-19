# 世界は優しい

一个部署在 Vercel 的“个人学术主页 + 研究笔记博客”。站点使用 Next.js App Router、TypeScript 与 Markdown，首页突出作者和真实研究/学习主题，正文适合长篇科研日志、论文阅读与课程笔记。

## 主要能力

- 学术人员博客风格：首页个人介绍、最近笔记、真实主题统计；无营销 Hero、视频背景、玻璃卡片或粒子效果。
- 静态优先：首页、笔记索引、关于页、作者页与全部文章在 Vercel 构建时预渲染；不使用 `output: "export"`。
- 轻量内容边界：列表和文件树只携带 `PostSummary`，文章正文由 `getPostDocument(path)` 在构建当前文章时读取。
- Typora 兼容：GFM、任务列表、脚注、KaTeX、代码高亮、emoji、`==mark==`、`~sub~`、`^sup^`、`[toc]`、Mermaid、Callout 和 Typora 图片缩放。
- 安全 Markdown：Unified AST 管线，不执行 MDX JSX、`import` 或 JavaScript 表达式；原始 HTML 使用白名单清洗，Mermaid 使用 strict 安全模式。
- 构建期媒体管线：文章图片生成内容哈希、宽高和静态 URL manifest，再由 `next/image` 与 Vercel CDN 提供。
- 静态全文搜索：FlexSearch 中英索引在构建期生成，只有首次打开 `Ctrl/⌘ + K` 时才加载代码和索引；结果可定位到匹配章节。
- SEO：从正式域名生成 canonical、Open Graph、`sitemap.xml`、`robots.txt` 和 `rss.xml`；Vercel Preview 自动禁止索引。
- 可观测性：接入 Vercel Speed Insights。

## 本地运行

需要 Node.js 20+。

```bash
npm install
npm run dev
```

`predev` 会先生成文章资源 manifest 与搜索索引，并执行全量内容检查。开发地址为 <http://localhost:3000>。

常用检查：

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run check:content
npm run build
npm run test:e2e
```

Playwright 默认使用已有 `.next` 构建并通过 `npm run start` 启动站点；第一次运行可执行：

```bash
npx playwright install chromium
```

## 内容结构

```text
app/
  page.tsx                    首页
  blog/page.tsx               静态笔记索引
  blog/[...slug]/page.tsx     静态文章页
  about/page.tsx              关于页
  authors/[id]/page.tsx       作者页
  sitemap.ts / robots.ts      SEO 路由
  rss.xml/route.ts            RSS
components/
  BlogListClient.tsx          URL 筛选、分页与视图交互
  SearchDialog.tsx            按需全文搜索
  MDXComponents.tsx           Markdown React 组件映射
  Mermaid.tsx                 按需图表渲染
lib/
  posts.ts                    PostSummary/PostDocument 与目录索引
  mdx.ts                      Unified Markdown AST 管线
  assets.ts                   内容资源 manifest 与安全路径解析
  site.ts                     正式域名和站点配置
content/
  posts/                      Markdown 与同目录附件
  authors/                    作者 JSON
scripts/
  prepare-content-assets.ts   构建哈希静态资源
  build-search-index.ts       构建 CJK/Latin 搜索索引
  check-content.ts            校验全部真实内容
```

## 写文章

`content/posts` 支持散装 Markdown 和文件夹 `index.md`，两者可混用：

```text
content/posts/
└── Coure-Notebook/
    ├── .folder.json
    ├── index.md                    /blog/Coure-Notebook
    ├── Operating_System/
    │   ├── Lec1.md                 /blog/Coure-Notebook/Operating_System/Lec1
    │   └── assets/
    │       └── memory layout (1).png
    └── Compiler_Principle/
        └── index.md                /blog/Coure-Notebook/Compiler_Principle
```

Frontmatter：

```markdown
---
title: "文章标题"
date: "2026-07-11"
description: "一句话摘要"
tags: ["标签 1", "标签 2"]
category: "课程笔记"
author: "zhuzichao"
draft: false
order: 1
---
```

- `title` 缺省为文件名。
- `date` 缺省为文件修改日期。
- `category` 缺省为“未分类”。
- `author` 缺省为 `siteConfig.primaryAuthorId`。
- `draft: true` 不生成公开路由、RSS、sitemap 或搜索结果。
- `description` 缺省时会在构建期从正文生成纯文本摘要。

文件夹显示信息由 `.folder.json` 提供：

```json
{
  "displayName": "操作系统",
  "icon": "📚",
  "order": 1,
  "collapsed": false
}
```

旧目录名会保留在 URL 中。例如 `Reaserch_Note` 不应直接重命名；界面显示名称可通过 `.folder.json` 修正，避免已有链接失效。

## Markdown 与 Typora

常用语法：

| 写法 | 结果 |
| --- | --- |
| `==高亮==` | `<mark>` |
| `H~2~O` | 下标 |
| `x^2^` | 上标 |
| `[toc]` 独占一行 | 使用正文同一 AST heading ID 的文章目录 |
| ```` ```mermaid ```` | 按需 Mermaid 图表 |
| `> [!IMPORTANT] 标题` | Typora/Obsidian Callout |
| `$x$` / `$$x$$` | KaTeX 行内/块公式 |
| 脚注、表格、`- [x]` | GFM |

支持以下本地图片形式：

```markdown
![结果](image.png)
![结果](./assets/image.png)
![结果](../shared/image.png?raw=1#figure)
![结果](./assets/NotebookLM Mind Map (2).png)
<img src="./assets/图 1.png" style="zoom:50%;" alt="结果">
```

中文、空格、括号、URL 编码、query/hash 和 Typora zoom 都会在构建期处理。外部未知主机图片使用原生 lazy `<img>`，不会消耗 Vercel Image Optimization 配额。

Markdown 内容不是 MDX。诸如 `{window.alert(1)}`、JSX、`import` 和事件属性不会执行；`script`、`iframe`、危险 URL 等会被过滤。

## 图片构建流程

```text
content/posts/**/*.{png,jpg,...}
            ↓ prepare-content-assets
.generated/content-assets.json
            ↓
public/_content/<sha256>.<ext>
            ↓
next/image + Vercel CDN
```

`.generated`、`public/_content` 与 `public/_search` 是可重复生成的构建产物，不提交 Git。构建会检测损坏图片与未拉取的 Git LFS pointer；缺失引用会由 `check:content` 阻止部署。

原 83 MB Hero 视频和 6.5 MB 头像原图由 `.vercelignore` 排除；线上使用约 20 KB 的 WebP 头像，首页不请求视频。

## Vercel 部署

生产部署继续使用 Vercel Git Integration，不需要 GitHub Pages，也不要设置 `output: "export"`。

在 Vercel Project Settings 中配置：

```text
NEXT_PUBLIC_SITE_URL=https://你的正式域名
```

这个变量在 Production 中应视为必填。canonical、Open Graph、RSS、sitemap 和 robots 都以它为准；Preview 会继续指向正式域名并自动 `noindex`。

仓库中的文章媒体使用 Git LFS。还需要在 Vercel 的 Project Settings → Git 中启用 Git LFS，然后重新部署；否则构建期资源检查会发现 pointer 并主动失败。

GitHub Actions 只运行 CI，生产发布由 Vercel 完成。建议 Vercel Build Command 保持默认 `npm run build`，Output Directory 留空（使用 `.next`）。

## 测试与验收

- Vitest：内容索引、摘要/正文边界、Typora AST、安全 HTML、图片路径、哈希资源和搜索。
- Testing Library：客户端筛选、分页、URL、主题和导航交互。
- Playwright：首页、笔记页、真实文章、404、移动端、暗色、reduced-motion 和搜索按需加载。
- Axe：E2E 页面不得有 serious/critical 无障碍问题。
- `check:content`：遍历全部 Markdown，检查解析、重复路由、作者、头像、封面、图片与内部链接。

CI 以 lint、类型检查、90%/85% 核心覆盖率、内容检查、生产构建和 E2E 为门禁。

## 站点配置

- 品牌、主作者和 URL：`lib/site.ts`
- 作者资料：`content/authors/<id>.json`
- 学术配色与排版：`app/globals.css`
- LaTeX 阅读主题：`app/latex-theme.css`
- Vercel 排除项：`.vercelignore`
