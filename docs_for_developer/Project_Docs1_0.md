# Next.js 个人博客项目文档 v1.0

> 文档版本：1.0  
> 更新日期：2026年2月12日  
> 项目版本：0.1.0

---

## 📋 目录

- [项目概述](#项目概述)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [核心功能模块](#核心功能模块)
- [配置说明](#配置说明)
- [部署方案](#部署方案)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

---

## 📖 项目概述

这是一个基于 **Next.js 14 App Router** 构建的现代化个人博客系统，采用 TypeScript + Tailwind CSS + MDX 技术栈。项目注重用户体验和视觉效果，包含多层动画系统、响应式设计、深色模式等功能。

### 设计理念

- **性能优先**：利用 Next.js 14 的最新特性实现最佳性能
- **开发体验**：使用 TypeScript 保证类型安全，完善的代码提示
- **内容为王**：使用 MDX 支持富文本内容，支持组件嵌入
- **视觉优雅**：4层动画效果、平滑过渡、响应式设计
- **可维护性**：模块化组件设计，清晰的文件组织

---

## ⭐ 核心特性

### 1. 视觉效果
- **4层Hero动画系统**
  - 静态渐变背景层
  - 动态渐变叠加层（Framer Motion）
  - Canvas粒子特效层（100个粒子，GPU加速）
  - 视差滚动效果（基于 scroll position）
- **打字机效果**：首页标题动画
- **过渡动画**：页面切换、组件交互

### 2. 内容管理
- **MDX 支持**：完整的 Markdown + JSX 组件
- **语法高亮**：rehype-pretty-code 实现代码块高亮
  - 双主题支持（github-light / github-dark）
  - 行高亮、字符高亮
  - 代码块标题、行号显示
- **多作者系统**：JSON配置文件管理作者信息
- **分类与标签**：文章分类、标签过滤
- **阅读时间**：自动计算文章阅读时长

### 3. 交互功能
- **可收缩侧边目录**：桌面端固定目录，可一键收起
- **移动端折叠目录**：移动端手风琴式目录
- **阅读进度条**：页面顶部实时显示阅读进度
- **返回顶部按钮**：滚动300px后显示
- **深色模式**：next-themes 实现，支持系统主题检测
- **视图切换**：列表/卡片视图切换，localStorage持久化

### 4. SEO与性能
- **静态生成**：所有文章页面预渲染（SSG）
- **图片优化**：Next.js Image 自动优化
- **代码分割**：自动按路由分割代码
- **字体优化**：Google Fonts 自动优化（Inter字体）
- **元数据管理**：完善的 SEO 元数据配置

---

## 🛠 技术栈

### 核心框架
```json
{
  "framework": "Next.js 14.2+",
  "runtime": "React 19.2+",
  "language": "TypeScript 5+",
  "styling": "Tailwind CSS 4.0 (beta)",
  "ui": "shadcn/ui + Radix UI"
}
```

### 主要依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `next` | 16.1.6 | React框架 |
| `react` | 19.2.3 | UI库 |
| `next-mdx-remote` | 5.0.0 | MDX编译 |
| `rehype-pretty-code` | - | 代码语法高亮 |
| `framer-motion` | 12.29.2 | 动画库 |
| `next-themes` | 0.4.6 | 主题切换 |
| `gray-matter` | 4.0.3 | Frontmatter解析 |
| `date-fns` | 4.1.0 | 日期格式化 |
| `lucide-react` | 0.563.0 | 图标库 |
| `sharp` | 0.34.5 | 图片处理 |
| `reading-time` | 1.5.0 | 阅读时间计算 |
| `remark-gfm` | - | GitHub Flavored Markdown |
| `rehype-slug` | - | 标题ID生成 |
| `rehype-autolink-headings` | - | 标题锚点 |

### 开发工具
- **包管理器**：npm
- **代码规范**：ESLint
- **构建工具**：Turbopack (Next.js 内置)
- **部署平台**：Vercel / GitHub Pages

---

## 📁 目录结构

```
blog/
├── app/                          # Next.js 14 App Router
│   ├── about/                    # 关于页面
│   ├── authors/[id]/             # 作者详情页（动态路由）
│   ├── blog/                     
│   │   ├── page.tsx              # 博客列表页
│   │   └── [slug]/page.tsx       # 文章详情页（动态路由）
│   ├── layout.tsx                # 根布局（字体、元数据）
│   ├── page.tsx                  # 首页（Hero + 最新文章）
│   ├── providers.tsx             # Context Providers
│   └── globals.css               # 全局样式（Tailwind + 自定义）
│
├── components/                   # React组件
│   ├── Hero/                     # Hero动画组件
│   │   ├── AnimatedHero.tsx      # 主Hero组件
│   │   ├── ParticlesLayer.tsx    # Canvas粒子层
│   │   └── TypingEffect.tsx      # 打字机效果
│   ├── layouts/                  # 布局组件
│   │   ├── CardLayout.tsx        # 卡片布局
│   │   └── ListLayout.tsx        # 列表布局
│   ├── ui/                       # shadcn/ui 基础组件
│   ├── BackToTop.tsx             # 返回顶部按钮
│   ├── MDXComponents.tsx         # MDX自定义组件
│   ├── MobileTOC.tsx             # 移动端目录
│   ├── Navigation.tsx            # 导航栏
│   ├── ReadingProgress.tsx       # 阅读进度条
│   ├── SearchDialog.tsx          # 搜索对话框（TODO）
│   ├── TableOfContents.tsx       # 桌面端目录（可收缩）
│   ├── ThemeToggle.tsx           # 主题切换按钮
│   └── ViewSwitcher.tsx          # 视图切换器
│
├── lib/                          # 工具函数库
│   ├── authors.ts                # 作者数据管理
│   ├── mdx.ts                    # MDX编译配置
│   ├── posts.ts                  # 文章数据管理
│   ├── toc.ts                    # 目录提取工具
│   ├── rss.ts                    # RSS生成（TODO）
│   └── sitemap.ts                # 站点地图（TODO）
│
├── content/                      # 内容目录
│   ├── posts/                    # 文章目录
│   │   ├── hello-world/
│   │   │   └── index.mdx         # MDX文章
│   │   ├── nextjs-blog/
│   │   └── typescript-tips/
│   └── authors/                  # 作者数据
│       ├── zhangsan.json
│       └── lisi.json
│
├── public/                       # 静态资源
│   ├── images/                   # 文章图片
│   └── avatars/                  # 作者头像
│
├── types/                        # TypeScript类型定义
│   └── index.ts                  # 全局类型
│
├── scripts/                      # 脚本工具
│   └── generateBlurData.ts       # 图片占位符生成
│
├── docs_for_developer/           # 开发者文档
│   └── Project_Docs1_0.md        # 本文档
│
├── next.config.ts                # Next.js配置
├── tailwind.config.ts            # Tailwind配置
├── tsconfig.json                 # TypeScript配置
├── package.json                  # 项目依赖
└── README.md                     # 项目说明
```

---

## 🔧 核心功能模块

### 1. Hero动画系统

**文件位置**：`components/Hero/`

#### AnimatedHero.tsx
4层动画叠加：
```tsx
<div className="relative">
  {/* Layer 1: 静态渐变背景 */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50" />
  
  {/* Layer 2: 动态渐变（Framer Motion） */}
  <motion.div 
    animate={{ backgroundPosition: ['0% 50%', '100% 50%'] }}
    transition={{ duration: 10, repeat: Infinity }}
  />
  
  {/* Layer 3: Canvas粒子系统 */}
  <ParticlesLayer />
  
  {/* Layer 4: 视差内容 */}
  <motion.div style={{ y: scrollYProgress }} />
</div>
```

#### ParticlesLayer.tsx
- 100个粒子对象
- RAF动画循环（60fps）
- GPU加速（transform: translate3d）
- 响应式自适应

#### TypingEffect.tsx
- 打字机效果实现
- 可配置打字速度
- 光标闪烁动画

---

### 2. MDX内容系统

**文件位置**：`lib/mdx.ts`, `lib/posts.ts`

#### 文章结构
```markdown
---
title: "文章标题"
date: "2024-01-15"
description: "文章描述"
tags: ["标签1", "标签2"]
category: "分类"
author: "作者ID"
coverImage: "/images/cover.jpg"
draft: false
---

## 标题

文章内容...
```

#### MDX编译流程
```typescript
compileMDX({
  source: mdxContent,
  options: {
    parseFrontmatter: true,
    mdxOptions: {
      remarkPlugins: [remarkGfm],          // GitHub风格Markdown
      rehypePlugins: [
        rehypeSlug,                         // 生成标题ID
        [rehypePrettyCode, {                // 代码高亮
          theme: {
            light: 'github-light',
            dark: 'github-dark'
          }
        }],
        [rehypeAutolinkHeadings, {...}]     // 标题锚点
      ]
    }
  }
})
```

#### 文章数据管理
- `getAllPosts()` - 获取所有文章
- `getPostBySlug(slug)` - 根据slug获取文章
- `getPostsByTag(tag)` - 按标签过滤
- `getPostsByCategory(category)` - 按分类过滤
- `getPostsByAuthor(authorId)` - 按作者过滤

---

### 3. 目录系统（TOC）

**文件位置**：`lib/toc.ts`, `components/TableOfContents.tsx`

#### 目录提取
```typescript
extractTOC(content: string, minLevel = 2, maxLevel = 4)
// 返回: [{ id, title, level }, ...]
```

#### 桌面端目录（可收缩）
特性：
- ✅ Sticky定位（top: 80px）
- ✅ IntersectionObserver滚动高亮
- ✅ 平滑滚动到标题
- ✅ 一键收起/展开（切换宽度 280px ↔ 48px）
- ✅ CSS过渡动画
- ✅ 子标题折叠功能

状态管理：
```typescript
const [isOpen, setIsOpen] = useState(true);     // 面板展开状态
const [activeId, setActiveId] = useState('');   // 当前高亮标题
const [collapsed, setCollapsed] = useState({});  // 子项折叠状态
```

#### 移动端目录
特性：
- 手风琴式折叠
- 点击跳转后自动关闭
- 层级缩进显示

---

### 4. 主题系统

**文件位置**：`app/providers.tsx`, `components/ThemeToggle.tsx`

#### next-themes配置
```tsx
<ThemeProvider
  attribute="class"           // 使用class切换
  defaultTheme="system"       // 默认跟随系统
  enableSystem                // 启用系统检测
  disableTransitionOnChange  // 禁用过渡（避免闪烁）
>
```

#### 主题变量
定义在 `app/globals.css`：
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.146 0 0);
  /* ... 更多变量 */
}

.dark {
  --background: oklch(0.146 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... 更多变量 */
}
```

#### 代码块主题
- 浅色模式：`github-light` (#f6f8fa 背景)
- 深色模式：`github-dark` (#161b22 背景)
- 自动跟随系统主题

---

### 5. 图片优化系统

**文件位置**：`components/MDXComponents.tsx`, `scripts/generateBlurData.ts`

#### Next.js Image优化
```tsx
<Image
  src={src}
  alt={alt}
  width={800}
  height={600}
  className="rounded-lg"
  loading="lazy"           // 懒加载
  placeholder="blur"       // 模糊占位符
  blurDataURL={...}        // Base64占位图
/>
```

#### 配置
`next.config.ts`：
```typescript
{
  images: {
    unoptimized: true,  // 静态导出时必须
  }
}
```

---

### 6. 路由系统

#### 静态路由
- `/` - 首页
- `/blog` - 博客列表
- `/about` - 关于页面

#### 动态路由
- `/blog/[slug]` - 文章详情
  - 生成路径：`generateStaticParams()`
  - 元数据：`generateMetadata()`
- `/authors/[id]` - 作者页面

#### 搜索参数
- `/blog?tag=标签` - 按标签过滤
- `/blog?author=作者ID` - 按作者过滤
- `/blog?category=分类` - 按分类过滤
- `/blog?view=card|list` - 视图模式

---

## ⚙️ 配置说明

### 1. Next.js配置

**文件**：`next.config.ts`

```typescript
const nextConfig: NextConfig = {
  // 静态导出（GitHub Pages部署时需要）
  output: 'export',  // 默认注释掉
  
  // 图片优化
  images: {
    unoptimized: true,  // 静态导出必须为true
  },
  
  // 性能优化
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  
  // 子路径部署（如 github.io/blog）
  // basePath: '/blog',
  // assetPrefix: '/blog',
};
```

---

### 2. Tailwind配置

**文件**：`tailwind.config.ts`

```typescript
export default {
  darkMode: ["class"],  // 使用class切换
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // shadcn/ui 主题变量
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ...
      },
      // 自定义动画
      animation: {
        'gradient': 'gradient 10s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
};
```

---

### 3. TypeScript配置

**文件**：`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "paths": {
      "@/*": ["./*"]  // 路径别名
    }
  }
}
```

---

### 4. 字体配置

**文件**：`app/layout.tsx`

```typescript
import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// 全局字体栈（CSS）
font-family: var(--font-inter), -apple-system, 
  'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

---

## 🚀 部署方案

### 方案对比

| 特性 | Vercel（推荐） | GitHub Pages | Cloudflare Pages |
|------|---------------|--------------|------------------|
| **难度** | ⭐ 最简单 | ⭐⭐ 需配置 | ⭐⭐ 中等 |
| **SSR支持** | ✅ | ❌ | ✅ (Workers) |
| **构建时间** | 快 | 中等 | 快 |
| **自定义域名** | ✅ 免费 | ✅ 免费 | ✅ 免费 |
| **HTTPS** | ✅ 自动 | ✅ 自动 | ✅ 自动 |
| **CDN** | ✅ 全球 | ✅ 全球 | ✅ 全球 |
| **配置** | 零配置 | 需要Actions | 简单配置 |

---

### 1. Vercel部署（推荐）

**步骤**：
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub登录
3. 点击 "Import Project"
4. 选择仓库 → 点击 "Deploy"
5. ✅ 完成！自动部署

**优势**：
- 零配置，开箱即用
- 自动CI/CD（推送代码自动部署）
- 支持所有Next.js特性
- 全球CDN + 自动HTTPS
- 预览部署（每个PR独立预览）

---

### 2. GitHub Pages部署

**前置要求**：静态导出配置

1. **修改 `next.config.ts`**：
```typescript
const nextConfig: NextConfig = {
  output: 'export',  // 启用静态导出
  images: {
    unoptimized: true,
  },
  // 如果部署到子路径（如 username.github.io/blog）
  basePath: '/blog',
  assetPrefix: '/blog',
};
```

2. **创建 GitHub Actions工作流**

**文件**：`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. **仓库设置**
- Settings → Pages → Source 选择 "GitHub Actions"

4. **推送代码**
```bash
git add .
git commit -m "Configure for GitHub Pages"
git push
```

**注意事项**：
- ⚠️ 不支持SSR/ISR
- ⚠️ 不支持API路由
- ⚠️ 图片必须 `unoptimized: true`
- ✅ 适合纯静态博客

---

### 3. Cloudflare Pages部署

**步骤**：
1. 访问 [pages.cloudflare.com](https://pages.cloudflare.com)
2. 连接GitHub仓库
3. 构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`.next`（或 `out` 如果静态导出）
4. 部署

**优势**：
- 无限带宽
- 全球CDN
- 支持Cloudflare Workers（可实现SSR）

---

## 💻 开发指南

### 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd blog

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问
# http://localhost:3000
```

---

### 开发命令

```bash
# 开发模式（Turbopack）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 生成图片占位符（可选）
npm run generate-blur
```

---

### 添加新文章

1. **创建文章目录**
```bash
mkdir -p content/posts/my-new-post
```

2. **创建 `index.mdx`**
```markdown
---
title: "我的新文章"
date: "2026-02-12"
description: "文章描述"
tags: ["标签1", "标签2"]
category: "技术"
author: "zhangsan"
coverImage: "/images/cover.jpg"
draft: false
---

## 标题

正文内容...

```typescript
// 代码示例
const hello = () => {
  console.log('Hello World');
};
```
```

3. **添加封面图片**
```bash
# 将图片放到 public/images/
cp cover.jpg public/images/
```

4. **预览**
```bash
npm run dev
# 访问 http://localhost:3000/blog/my-new-post
```

---

### 添加作者

1. **创建作者JSON**

**文件**：`content/authors/wangwu.json`

```json
{
  "id": "wangwu",
  "name": "王五",
  "bio": "全栈开发工程师",
  "avatar": "/avatars/wangwu.jpg",
  "social": {
    "github": "https://github.com/wangwu",
    "twitter": "https://twitter.com/wangwu"
  }
}
```

2. **添加头像**
```bash
cp wangwu.jpg public/avatars/
```

3. **在文章中使用**
```markdown
---
author: "wangwu"
---
```

---

### 自定义样式

#### 修改主题颜色

**文件**：`app/globals.css`

```css
:root {
  --primary: oklch(0.488 0.243 264.376);  /* 主色 */
  --secondary: oklch(0.556 0 0);          /* 副色 */
  --accent: oklch(0.728 0 0);             /* 强调色 */
  /* ... */
}
```

#### 修改代码块样式

```css
pre {
  background-color: #your-color;
  border-radius: 12px;        /* 圆角 */
  padding: 1.5rem;            /* 内边距 */
}
```

#### 修改字体

**文件**：`app/layout.tsx`

```typescript
import { Noto_Sans_SC } from "next/font/google";

const font = Noto_Sans_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});
```

---

### 调试技巧

#### 1. 查看构建输出
```bash
npm run build
# 检查 .next/static/ 目录
```

#### 2. 检查MDX编译
```typescript
// lib/mdx.ts
export async function compileMDXContent(source: string) {
  console.log('Compiling MDX:', source.substring(0, 100));
  const result = await compileMDX(...);
  console.log('Compiled frontmatter:', result.frontmatter);
  return result;
}
```

#### 3. 调试路由
```bash
# 查看所有生成的路由
npm run build
# 检查 .next/server/pages/ 目录
```

#### 4. 性能分析
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    logging: {
      level: 'verbose',
    },
  },
};
```

---

## ❓ 常见问题

### Q1: 图片不显示？

**A**: 检查以下几点：
1. 图片路径是否正确（`/images/xxx.jpg`）
2. 图片是否在 `public/` 目录下
3. `next.config.ts` 中 `images.unoptimized` 是否为 `true`

---

### Q2: 代码高亮不生效？

**A**: 确保：
1. `rehype-pretty-code` 已安装
2. 主题配置正确（`github-light` / `github-dark`）
3. CSS变量已定义（`--shiki-light` / `--shiki-dark`）
4. 代码块背景色已设置

---

### Q3: 深色模式切换有闪烁？

**A**: 添加到 `ThemeProvider`：
```tsx
<ThemeProvider disableTransitionOnChange>
```

---

### Q4: 构建时内存溢出？

**A**: 增加Node内存限制：
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

---

### Q5: Vercel部署失败？

**A**: 检查：
1. Node版本（Settings → Environment Variables → `NODE_VERSION=20`）
2. 构建命令（默认 `npm run build`）
3. 输出目录（默认 `.next`）
4. 依赖安装完整性

---

### Q6: 如何添加评论系统？

**A**: 推荐使用 Giscus（基于GitHub Discussions）：

1. 安装依赖：
```bash
npm install @giscus/react
```

2. 修改 `app/blog/[slug]/page.tsx`：
```tsx
import Giscus from '@giscus/react';

<Giscus
  repo="username/repo"
  repoId="your-repo-id"
  category="Announcements"
  categoryId="your-category-id"
  mapping="pathname"
  reactionsEnabled="1"
  emitMetadata="0"
  inputPosition="top"
  theme="preferred_color_scheme"
  lang="zh-CN"
/>
```

---

### Q7: 如何添加全文搜索？

**A**: 推荐使用 Pagefind：

1. 安装：
```bash
npx pagefind --site out
```

2. 集成到 `components/SearchDialog.tsx`

---

### Q8: 生产环境样式丢失？

**A**: 检查：
1. Tailwind配置的 `content` 路径
2. `postcss.config.mjs` 配置
3. CSS导入顺序

---

## 📞 技术支持

### 文档资源
- [Next.js文档](https://nextjs.org/docs)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [MDX文档](https://mdxjs.com/)
- [Framer Motion文档](https://www.framer.com/motion/)

### 项目仓库
- GitHub: [项目地址](#)
- Issues: [报告问题](#)
- Discussions: [讨论区](#)

---

## 📝 更新日志

### v1.0 (2026-02-12)
- ✅ 完成核心博客功能
- ✅ 4层Hero动画系统
- ✅ MDX内容管理
- ✅ 多作者支持
- ✅ 深色模式
- ✅ 可收缩侧边目录
- ✅ 阅读进度条
- ✅ 返回顶部按钮
- ✅ 代码语法高亮（双主题）
- ✅ 响应式设计
- ✅ 完整文档

### 待实现功能
- ⏳ 全文搜索（Pagefind）
- ⏳ 评论系统（Giscus）
- ⏳ RSS订阅
- ⏳ 站点地图
- ⏳ 文章系列
- ⏳ 相关文章推荐
- ⏳ 阅读统计
- ⏳ 图片灯箱

---

## 📄 许可证

本项目采用 MIT 许可证。

---

**文档结束**

如有疑问，请查阅上述文档或提交Issue。
