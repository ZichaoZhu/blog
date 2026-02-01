# 🚀 快速开始指南

恭喜！你的博客已经成功搭建完成。

## 当前状态

✅ 开发服务器正在运行：http://localhost:3000

## 立即查看

1. **首页** - 包含精美的动画效果（渐变、视差、打字、粒子）
2. **博客列表** - http://localhost:3000/blog
3. **示例文章**：
   - http://localhost:3000/blog/hello-world
   - http://localhost:3000/blog/nextjs-blog
   - http://localhost:3000/blog/typescript-tips

## 下一步操作

### 1. 自定义内容

#### 修改首页文本
编辑 `components/Hero/AnimatedHero.tsx`：
```tsx
<TypingEffect 
  text="欢迎来到我的博客"  // 修改这里
  speed={150}
/>

<motion.p>
  分享技术，记录成长  // 修改这里
</motion.p>
```

#### 修改关于页面
编辑 `app/about/page.tsx` 更新你的个人信息。

#### 修改导航栏标题
编辑 `components/Navigation.tsx`：
```tsx
<Link href="/" className="text-2xl font-bold">
  我的博客  // 修改这里
</Link>
```

### 2. 添加你的第一篇文章

```bash
# 创建文章文件夹
mkdir content/posts/my-first-post

# 创建文章文件
cat > content/posts/my-first-post/index.mdx << 'EOF'
---
title: "我的第一篇文章"
date: "2024-02-01"
description: "这是我在新博客上发布的第一篇文章"
tags: ["博客", "个人"]
category: "随笔"
author: "zhangsan"
draft: false
---

## 开始

这是我的第一篇文章...
EOF
```

### 3. 添加你的作者信息

编辑 `content/authors/zhangsan.json`：
```json
{
  "name": "你的名字",
  "bio": "你的简介",
  "avatar": "/avatars/your-avatar.jpg",
  "social": {
    "github": "your-github",
    "twitter": "your-twitter",
    "website": "https://your-website.com"
  }
}
```

### 4. 自定义主题颜色

编辑 `app/globals.css` 中的 CSS 变量：
```css
:root {
  --primary: 263 70% 50%;  /* 主题色 */
  /* 其他颜色... */
}
```

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 构建生产版本

# 检查
npm run lint             # 代码检查

# 工具
npm run generate-blur    # 生成图片模糊占位符
```

## 功能测试清单

- [ ] 访问首页，查看动画效果
- [ ] 测试暗黑模式切换
- [ ] 切换列表/卡片视图
- [ ] 浏览示例文章
- [ ] 测试响应式布局（调整浏览器窗口）
- [ ] 点击标签/分类筛选
- [ ] 查看作者页面

## 部署到生产环境

### 方式 1: Vercel（推荐，最简单）

1. 推送代码到 GitHub：
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. 访问 [vercel.com](https://vercel.com)
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库
5. 点击 "Deploy"

完成！你的博客将在几分钟内上线。

### 方式 2: GitHub Pages

1. 启用 GitHub Actions（已配置）
2. 在仓库 Settings -> Pages 中选择 "GitHub Actions"
3. 推送代码即可自动部署

### 方式 3: 静态托管

```bash
npm run build
```

将 `out/` 目录部署到任何静态托管服务（Netlify、Cloudflare Pages 等）。

## 进阶功能（可选）

### 集成全文搜索（Pagefind）

1. 更新 `package.json`：
```json
"build": "next build && pagefind --site out"
```

2. 在 `components/SearchDialog.tsx` 中加载 Pagefind UI

### 添加评论系统（Giscus）

1. 访问 [giscus.app](https://giscus.app)
2. 配置你的仓库
3. 在文章详情页添加脚本

### 实现 RSS 订阅

参考 `lib/rss.ts` 中的注释实现。

## 问题排查

### 端口被占用
```bash
# 使用其他端口
npm run dev -- -p 3001
```

### 构建错误
```bash
# 清除缓存
rm -rf .next
npm run dev
```

### TypeScript 错误
```bash
# 重新生成类型
npm run build
```

## 获取帮助

- 查看 `README.md` - 完整文档
- 查看 `IMPLEMENTATION.md` - 实现细节
- 提交 Issue - 报告问题
- 参考示例文章 - 学习 MDX 语法

## 资源链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MDX 文档](https://mdxjs.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

🎉 **开始创作吧！你的博客之旅从这里启航。**

有任何问题，随时查阅文档或寻求帮助。祝你写作愉快！
