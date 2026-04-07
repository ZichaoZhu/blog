# Markdown 同步工具使用指南

本博客系统支持从 `.md` 文件自动同步到 `.mdx` 文件，方便你在熟悉的 Markdown 编辑器（如 Typora）中编辑笔记。

## 文件结构

```
content/posts/Compiler Principle/
├── Lec0/
│   └── index.mdx       # 博客系统使用（自动生成）
├── Lec0.md             # 你的源笔记（在此编辑）
├── Lec1/
│   └── index.mdx
├── Lec1.md
├── Lec2/
│   └── index.mdx
└── Lec2.md

public/images/compiler-principle/  # 图片统一存放位置
└── *.png
```

## 编辑工作流

### 方式一：自动监视（推荐用于开发时）

1. 启动监视脚本：
   ```bash
   npm run watch:md
   ```

2. 在 Typora 或其他编辑器中编辑 `.md` 文件（如 `Lec0.md`）

3. 保存后，脚本会自动同步到 `Lec0/index.mdx`

4. 浏览器自动刷新，查看更新后的博客效果

5. 按 `Ctrl+C` 停止监视

### 方式二：手动同步

1. 在编辑器中编辑并保存 `.md` 文件

2. 运行同步命令：
   ```bash
   npm run sync:md              # 同步所有 .md 文件
   # 或
   npm run sync:md Lec0.md      # 只同步指定文件
   ```

3. 刷新浏览器查看效果

## 图片路径规则

在 `.md` 文件中使用相对路径引用图片：

```markdown
![图片描述](./assets/image-name.png)
```

同步脚本会自动转换为：

```markdown
![图片描述](/images/compiler-principle/image-name.png)
```

**注意**：
- 在 `.md` 中仍然使用 `./assets/` 相对路径（便于在 Typora 等编辑器中预览）
- 同步脚本会自动转换为 `/images/compiler-principle/` 绝对路径（符合 Next.js 静态资源规范）
- 图片实际存放在 `public/images/compiler-principle/` 目录

## MDX 语法自动修复

同步脚本会自动修复 MDX 不兼容的语法：

### 高亮标记转换

在 `.md` 中：
```markdown
这是 ==重点内容==
```

自动转换为 `.mdx` 中的加粗：
```markdown
这是 **重点内容**
```

## Frontmatter 处理

### 自动生成 Frontmatter

如果你的 `.md` 文件没有 frontmatter，同步脚本会自动生成：

```markdown
---
title: "从第一个标题提取"
date: "文件修改日期"
description: "从前几行提取"
tags: ["编译原理", "课程笔记", "计算机科学"]
category: "编译原理"
author: "zhuzichao"
draft: false
---
```

### 自定义 Frontmatter

你也可以在 `.md` 文件开头手动添加 frontmatter：

```markdown
---
title: "编译原理 - Lec3: 语法分析"
date: "2026-03-04"
description: "介绍上下文无关文法、语法树等概念。"
tags: ["编译原理", "语法分析"]
category: "编译原理"
author: "zhuzichao"
draft: false
---

# 语法分析

内容...
```

同步时会保留你的自定义 frontmatter。

## 常见问题

### Q: 我可以直接编辑 `.mdx` 文件吗？

A: 可以，但不推荐。如果你直接编辑 `.mdx`，下次运行同步脚本时会被 `.md` 的内容覆盖。

### Q: 同步脚本会修改 `.md` 文件吗？

A: 不会。`.md` 文件是你的源文件，同步脚本只读取它，不会修改。

### Q: 如果我删除了 `.md` 文件会怎样？

A: `.mdx` 文件仍然存在并继续工作。但你无法再使用同步功能。

### Q: 可以同步其他目录的笔记吗？

A: 可以。同步脚本会扫描 `content/posts/` 下所有的 `.md` 文件。

## 开发建议

### 日常开发流程

```bash
# 终端 1：启动开发服务器
npm run dev

# 终端 2：启动 markdown 监视
npm run watch:md

# 然后在 Typora 中愉快地编辑笔记
# 保存后自动同步，浏览器自动刷新
```

### 提交代码前

```bash
# 确保所有 .md 都已同步到 .mdx
npm run sync:md

# 提交
git add .
git commit -m "更新编译原理笔记"
```

## 技术细节

- **同步脚本**: `scripts/sync-md-to-mdx.ts`
- **监视脚本**: `scripts/watch-md.ts`
- **依赖**: `chokidar` (文件监视)
- **运行环境**: `tsx` (TypeScript 执行器)
