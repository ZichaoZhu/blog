# 个人博客

基于 **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + MDX** 的个人博客，对 **Typora 笔记完全友好**。

## 功能一览

- **首页 Hero**：渐变背景、视差滚动、打字动画、Canvas 粒子层
- **博客列表**：文件树导航 + 分类/标签/文件夹筛选 + 列表/卡片视图切换
- **文章页**：嵌套目录、右侧 TOC（与渲染的 heading id 对齐）、面包屑、阅读进度条、返回顶部
- **MDX 渲染**：代码高亮（`rehype-pretty-code`，双主题 Shiki）、数学公式（KaTeX）、GFM
- **Typora 扩展语法**：`==高亮==` / `H~2~O` 下标 / `mc^2^` 上标 / `:smile:` emoji / `[toc]` 文章内目录 / ` ```mermaid ` 流程图 / Typora `<img style="zoom:N%">`
- **LaTeX 论文风阅读主题**：右下角一键切换，自动编号标题、Times serif、A4 纸张感，跟随明暗模式
- **暗色模式**（`next-themes`，系统主题检测）
- **多作者**（JSON 配置 + 作者页）
- **全站点击涟漪动画**

## 运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
npm run lint
```

## 目录结构

```
app/
  page.tsx                      # 首页
  about/page.tsx                # 关于
  blog/page.tsx                 # 博客列表
  blog/[...slug]/page.tsx       # 文章页（支持嵌套路径）
  authors/[id]/page.tsx         # 作者页
  api/images/[...path]/route.ts # 文章内相对路径图片代理
  globals.css                   # 站点全局样式
  latex-theme.css               # LaTeX 论文风阅读主题（scoped 在 .theme-latex 下）
components/
  Hero/                         # 首页 Hero（动画、粒子、打字）
  layouts/                      # ListLayout / CardLayout
  ui/                           # shadcn/ui（dialog、button、input）
  ClickEffect.tsx               # 全站点击动画
  ReadingTheme.tsx              # 阅读主题 Provider + ArticleBody + 切换按钮
  ArticleTOC.tsx                # [toc] 渲染出的客户端目录组件
  Mermaid.tsx                   # mermaid 代码块的客户端渲染（懒加载）
  MDXComponents.tsx             # MDX 元素映射 + 图片路径解析
  FileTreeView.tsx              # 侧边文件树
  TableOfContents.tsx           # 文章右侧 TOC
  Breadcrumb.tsx, MobileTOC.tsx, BackToTop.tsx, ReadingProgress.tsx
  Navigation.tsx, SearchDialog.tsx, ThemeToggle.tsx, ViewSwitcher.tsx
lib/
  posts.ts                      # 扫描 content/posts，构建文件树、加载文章
  authors.ts                    # 读取作者 JSON
  mdx.ts                        # MDX 编译管线 + Typora 兼容预处理 + 自定义 remark 插件
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

> 文件夹/文件名建议用下划线或连字符（`Operating_System` / `compiler-principle`），别用空格 —— URL 里要 encode，分享/复制粘贴容易断。

### Frontmatter

所有字段都是可选的 —— 缺失字段会在加载时填默认值（参见 [lib/posts.ts](lib/posts.ts) 的 `loadPost`），所以 Typora 笔记直接复制过来也能跑。

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

### Typora 扩展语法

[lib/mdx.ts](lib/mdx.ts) 里的预处理 + 自定义 remark 插件让 Typora 笔记可以**原样**扔进来：

| 写法 | 渲染结果 | 说明 |
|---|---|---|
| `==高亮==` | <mark>高亮</mark> | 行内 `<mark>` |
| `H~2~O` | H<sub>2</sub>O | 下标。⚠️ 同时关掉了 `remark-gfm` 的 `singleTilde` |
| `mc^2^` | mc<sup>2</sup> | 上标 |
| `:smile: :rocket:` | 😄 🚀 | `remark-emoji` |
| `[toc]`（独占一行）| 文章内嵌目录 | [ArticleTOC.tsx](components/ArticleTOC.tsx) 客户端扫描已渲染的 h2~h4 生成 |
| ` ```mermaid ` 代码块 | 流程图 | [Mermaid.tsx](components/Mermaid.tsx) 客户端懒加载 mermaid（~700KB），跟随明暗主题 |
| `<img style="zoom:50%">` | 等价 `width="50%"` | 字符串 `style` 在 React JSX 里会报错，预处理时自动改写 |
| `<segment, offset>`、`a < b`、`count <>0` | 自动转义为 `&lt;` | MDX 默认会把这些误当 JSX 标签开头炸掉 |
| `~~delete~~` | <del>delete</del> | GFM 标准 |
| `$x$` / `$$x$$` | LaTeX 公式 | KaTeX |
| `- [x]` 任务列表、表格、脚注 | GFM 标准 | 全部支持 |

如果遇到没覆盖的 Typora corner case，规则就在 [lib/mdx.ts](lib/mdx.ts) 的 `preprocessMarkdown` 和 `remarkTyporaInline` / `remarkMermaid` / `remarkTocPlaceholder` 几个函数里，加一行就行。

### 图片

文章里的相对路径图片（`./assets/xxx.png`）由 [components/MDXComponents.tsx](components/MDXComponents.tsx) 改写成 `/api/images/<文件夹>/assets/xxx.png`，再由 [app/api/images/\[...path\]/route.ts](app/api/images/[...path]/route.ts) 从 `content/posts/` 下读出来返回。**图片跟 Markdown 放一起就行，不需要塞进 `public/`。**

### Markdown 同步脚本（可选）

如果你习惯先在 Typora 里写散装 `.md`，`scripts/sync-md-to-mdx.ts` 会把 `Foo.md` 挪成 `Foo/index.md` 形式。

```bash
npm run sync:md          # 全量同步
npm run sync:md Foo.md   # 单文件同步
npm run watch:md         # 监听自动同步
```

> 当前的 `lib/posts.ts` 已经能直接加载文件夹里的散装 `.md`（作为兄弟文件，见方式 A），所以这个脚本对大多数场景可有可无。

## 阅读主题

文章页右下角有两个浮动按钮：

- **回到顶部**（默认主题样式）
- **📰 切换 LaTeX 论文风** ↔ **📄 切换默认主题**

LaTeX 主题改编自 Typora 经典的 [LaTeX 主题](https://github.com/lyj0309/latex-typora)，重写为博客可用的 scoped CSS（[app/latex-theme.css](app/latex-theme.css)），保留：

- Times serif + 中文宋体的字体栈
- 标题自动编号（`1`、`1.1`、`1.1.1`...）
- booktabs 三线表
- 自定义无序/有序列表标记（`–` `◦` / `(a)` `i.`）
- A4 纸宽 + 阴影 + 居中

切换是局部的（`<ArticleBody>` 在默认 prose 和 `.theme-latex` 之间换 className），不会影响导航栏、TOC、首页 Hero 等任何站点其他部分。选择存在 `localStorage['reading-theme']`。暗色模式 + LaTeX 主题正交可叠加。

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
| LaTeX 主题字体/字号/纸张 | [app/latex-theme.css](app/latex-theme.css) 顶部 `--latex-*` 变量 |
| 导航栏标题/菜单 | [components/Navigation.tsx](components/Navigation.tsx) |
| 首页文案、打字动画 | [components/Hero/AnimatedHero.tsx](components/Hero/AnimatedHero.tsx) |
| 点击动画颜色/粒子数 | [components/ClickEffect.tsx](components/ClickEffect.tsx) |
| 站点元数据 | [app/layout.tsx](app/layout.tsx) 的 `metadata` |
| MDX 渲染映射、Typora 语法 | [components/MDXComponents.tsx](components/MDXComponents.tsx)、[lib/mdx.ts](lib/mdx.ts) |

## 部署

任何支持 Next.js 的平台都行。注意：

- `/api/images/[...path]` 是动态路由，**不能静态导出**（`output: 'export'`）。如果要走 GitHub Pages 纯静态方案，需要先把文章图片复制到 `public/` 并调整 `MDXComponents.tsx` 的路径改写逻辑。
- Vercel 直接 import 仓库即可，无需额外配置。

## 技术栈

- Next.js 16 · React 19 · TypeScript 5
- Tailwind CSS v4 · shadcn/ui (dialog/button/input) · `tw-animate-css`
- MDX：`next-mdx-remote` + `remark-gfm` + `remark-math` + `remark-emoji` + `rehype-katex` + `rehype-slug` + `rehype-autolink-headings` + `rehype-pretty-code` (Shiki)
- 图表：`mermaid`（懒加载，仅出现 ` ```mermaid ` 块的页面才下载）
- 内容：`gray-matter` + `reading-time` + `github-slugger`
- 动画：`framer-motion`
- 图标：`lucide-react`
- 主题：`next-themes`
- 日期：`date-fns`
