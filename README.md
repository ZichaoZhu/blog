# 个人博客

基于 **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + MDX** 的个人博客。

## 功能一览

- 首页 Hero：渐变背景、视差滚动、打字动画、Canvas 粒子层
- 博客列表：文件树导航 + 分类/标签/文件夹筛选 + 列表/卡片视图切换
- 文章页：嵌套目录、右侧 TOC（与渲染的 heading id 对齐）、面包屑、阅读进度条、返回顶部
- Markdown/MDX 渲染：代码高亮（`rehype-pretty-code`，双主题）、数学公式（KaTeX）、GFM、`==高亮==` 语法、同目录相对路径图片
- 暗色模式（`next-themes`，系统主题检测）
- 多作者（JSON 配置 + 作者页）
- 全站鼠标点击涟漪动画

## 运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
npm run lint
```

## 目录结构

```
app/                            # Next.js App Router 页面
  page.tsx                      # 首页
  about/page.tsx                # 关于
  blog/page.tsx                 # 博客列表
  blog/[...slug]/page.tsx       # 文章页（支持嵌套路径）
  authors/[id]/page.tsx         # 作者页
  api/images/[...path]/route.ts # 文章内相对路径图片代理
components/
  Hero/                         # 首页 Hero（动画、粒子、打字）
  layouts/                      # ListLayout / CardLayout
  ui/                           # shadcn/ui（dialog、button、input）
  ClickEffect.tsx               # 全站点击动画
  FileTreeView.tsx              # 侧边文件树
  TableOfContents.tsx           # 文章右侧 TOC
  Breadcrumb.tsx, MobileTOC.tsx, BackToTop.tsx, ReadingProgress.tsx
  Navigation.tsx, SearchDialog.tsx, ThemeToggle.tsx, ViewSwitcher.tsx
  MDXComponents.tsx             # MDX 元素映射 + 图片路径解析
lib/
  posts.ts                      # 扫描 content/posts，构建文件树、加载文章
  authors.ts                    # 读取作者 JSON
  mdx.ts                        # MDX 编译（remark/rehype 管线）
  toc.ts                        # 从 markdown 提取目录
  utils.ts                      # cn() 工具
content/
  posts/                        # 文章源（Markdown，支持嵌套文件夹）
  authors/                      # 作者 JSON
scripts/
  sync-md-to-mdx.ts             # 将散装 .md 同步成文件夹形式
  watch-md.ts                   # 监听 content/posts/**/*.md 自动 sync
types/index.ts                  # Post / Folder / FileTree 等类型
```

## 写文章

### 目录约定

`content/posts/` 下的每个子文件夹都是一个「文章文件夹」，可嵌套。两种放文章的方式：

**方式 A：文件夹下直接放 `.md`**

```
content/posts/
└── Compiler_Principle/         # 一个文件夹 = 一个系列
    ├── .folder.json            # 文件夹元数据（显示名、图标、排序等）
    ├── index.md                # 系列首页 → 路由 /blog/Compiler_Principle
    ├── Lec1.md                 # → /blog/Compiler_Principle/Lec1
    ├── Lec2.md                 # → /blog/Compiler_Principle/Lec2
    └── assets/                 # 同目录图片
        └── image-xxx.png
```

**方式 B：每篇文章独立文件夹**

```
content/posts/
└── hello-world/
    └── index.md                # → /blog/hello-world
```

两种方式可以混用。`index.md` 的路由等于它所在的文件夹路径。

### Frontmatter

所有字段都是可选的 —— 缺失字段会在加载时填默认值（参见 [lib/posts.ts](lib/posts.ts) 的 `loadPost`），所以笔记直接从 Typora 复制过来也能跑。

```markdown
---
title: "文章标题"              # 缺省时用文件名
date: "2026-03-06"            # 缺省时用文件 mtime
description: "一句话摘要"
tags: ["标签1", "标签2"]
category: "分类"               # 缺省时为「未分类」
author: "zhuzichao"           # 对应 content/authors/zhuzichao.json
coverImage: "/images/xxx.jpg" # 可选
draft: false                  # true 时跳过
---

## 正文从 h2 开始

支持 GFM、KaTeX 公式、`==高亮==`、代码块、相对路径图片。
```

### 文件夹元数据 `.folder.json`

```json
{
  "displayName": "编译原理",
  "icon": "📚",
  "order": 1,
  "collapsed": false
}
```

### 图片

文章里的相对路径图片（`./assets/xxx.png`）由 [MDXComponents.tsx](components/MDXComponents.tsx) 改写成 `/api/images/<文件夹>/assets/xxx.png`，再由 [app/api/images/\[...path\]/route.ts](app/api/images/[...path]/route.ts) 从 `content/posts/` 下读出来返回。**图片跟 Markdown 放一起就行，不需要塞进 `public/`。**

### Markdown 同步脚本（可选）

如果你习惯在 Typora 这样的编辑器里写单个 `.md` 文件，`scripts/sync-md-to-mdx.ts` 会把散装的 `Foo.md` 挪成 `Foo/index.md` 形式。

```bash
npm run sync:md          # 全量同步
npm run sync:md Foo.md   # 单文件同步
npm run watch:md         # 监听自动同步
```

> 脚本名里的 `mdx` 是历史遗留，现在产物是 `.md`。现在的 `lib/posts.ts` 直接加载 `.md`，其实散装 `.md` 文件也能被识别成文章（作为兄弟文件，见方式 A），所以这个脚本大部分场景可有可无。

## 作者

`content/authors/<id>.json`：

```json
{
  "name": "朱子超",
  "bio": "一句话简介",
  "avatar": "/avatars/me.jpg",
  "social": {
    "github": "username",
    "twitter": "username",
    "website": "https://example.com"
  }
}
```

文章的 `author` 字段填文件名里的 `<id>` 即可，自动关联。

## 自定义

| 想改的东西 | 去哪改 |
|---|---|
| 主题色、暗色变量 | [app/globals.css](app/globals.css) 里的 CSS 变量 |
| 导航栏标题/菜单 | [components/Navigation.tsx](components/Navigation.tsx) |
| 首页文案、打字动画 | [components/Hero/AnimatedHero.tsx](components/Hero/AnimatedHero.tsx) |
| 点击动画颜色/粒子数 | [components/ClickEffect.tsx](components/ClickEffect.tsx) |
| 站点元数据 | [app/layout.tsx](app/layout.tsx) 的 `metadata` |
| MDX 渲染映射 | [components/MDXComponents.tsx](components/MDXComponents.tsx) |

## 部署

任何支持 Next.js 的平台都行。注意：

- `/api/images/[...path]` 是动态路由，**不能静态导出**（`output: 'export'`）。如果要走 GitHub Pages 纯静态方案，需要先把文章图片复制到 `public/` 并调整 `MDXComponents.tsx` 的路径改写逻辑。
- Vercel 直接 import 仓库即可，无需额外配置。

## 技术栈

- Next.js 16 · React 19 · TypeScript 5
- Tailwind CSS v4 · shadcn/ui (dialog/button/input) · `tw-animate-css`
- MDX：`next-mdx-remote` + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-slug` + `rehype-autolink-headings` + `rehype-pretty-code` (Shiki)
- 内容：`gray-matter` + `reading-time` + `github-slugger`
- 动画：`framer-motion`
- 图标：`lucide-react`
- 主题：`next-themes`
- 日期：`date-fns`
