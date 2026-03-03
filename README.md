# 我的个人博客

基于 Next.js 14 构建的现代化个人博客系统。

## ✨ 功能特性

- 🎨 **精美动画** - 首页包含渐变背景、视差滚动、打字效果和粒子特效
- 📝 **Markdown/MDX 支持** - 支持在 Markdown 中使用 React 组件
- 🔍 **全文搜索** - 基于 Pagefind 的静态搜索功能（待集成）
- 🌓 **暗黑模式** - 支持亮色/暗色主题切换
- 📱 **响应式设计** - 完美适配各种设备
- 👥 **多作者支持** - 支持多个作者贡献内容
- 🏷️ **分类和标签** - 完善的内容组织系统
- 🎯 **视图切换** - 列表视图和卡片视图自由切换
- ⚡ **极致性能** - 静态生成，零服务器成本

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **动画**: Framer Motion
- **内容**: MDX + Gray Matter
- **图片**: Next.js Image + Sharp
- **主题**: next-themes
- **搜索**: Pagefind (计划集成)

## 📦 安装

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

## 📝 写作指南


### 创建新文章或系列课程

#### 单篇文章
1. 在 `content/posts/` 下创建新文件夹，例如 `my-new-post`
2. 在文件夹中创建 `index.mdx` 文件
3. 添加 frontmatter 和内容：

#### 系列课程/多篇文章
1. 在 `content/posts/` 下创建系列文件夹，例如 `Compiler Principle`
2. 在系列文件夹下为每一讲新建子文件夹（如 `Lec0`、`Lec1` 等）
3. 每个子文件夹内创建 `index.mdx`，并添加 frontmatter 和内容
4. frontmatter 示例见下方

```mdx
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

内容...
```

### 添加图片


#### 图片管理
推荐将课程/系列文章的图片统一放在 `public/images/系列名/` 目录下，然后在 MDX 中引用：

```mdx
![图片描述](/images/系列名/图片名.png)
```

如：
```mdx
![实验流程图](/images/compiler-principle/image-20260302101830207.png)
```

### 添加作者

在 `content/authors/` 下创建 JSON 文件：

```json
{
  "name": "作者名",
  "bio": "作者简介",
  "avatar": "/avatars/author.jpg",
  "social": {
    "github": "username",
    "twitter": "username"
  }
}
```

## 🚀 部署

### Vercel 部署

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 自动构建和部署

### 静态导出

```bash
npm run build
```

生成的静态文件在 `out/` 目录，可以部署到任何静态托管服务。

## 📂 项目结构

```
blog/
├── app/                    # Next.js 应用路由
│   ├── blog/              # 博客相关页面
│   ├── authors/           # 作者页面
│   └── about/             # 关于页面
├── components/            # React 组件
│   ├── Hero/              # 首页动画组件
│   ├── layouts/           # 布局组件
│   └── ui/                # UI 组件 (shadcn/ui)
├── content/               # 内容目录
│   ├── posts/            # MDX 文章
│   └── authors/          # 作者信息
├── lib/                   # 工具函数
│   ├── posts.ts          # 文章处理
│   ├── authors.ts        # 作者处理
│   └── mdx.ts            # MDX 编译
├── types/                 # TypeScript 类型定义
└── public/               # 静态资源
```

## 🎨 自定义

### 修改主题颜色

编辑 `app/globals.css` 中的 CSS 变量。

### 修改首页动画

编辑 `components/Hero/AnimatedHero.tsx` 调整动画效果。

### 添加新页面

在 `app/` 目录下创建新的路由文件夹和 `page.tsx`。

## 📋 待办事项

- [ ] 集成 Pagefind 全文搜索
- [ ] 添加 Giscus 评论系统
- [ ] 实现 RSS 订阅功能
- [ ] 生成 sitemap.xml
- [ ] 添加阅读进度条
- [ ] 优化 SEO

## 📄 许可证

MIT License

---

如有问题或建议，欢迎提 Issue 或 PR！
