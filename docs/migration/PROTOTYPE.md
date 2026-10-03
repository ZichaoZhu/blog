# Firefly 迁移原型验收

当前阶段：代表文章完成；导航、媒体和全量内容的验收在后续阶段补充。

- 16 个原型文档：5 个集合说明、9 个公开笔记、2 个 unlisted 演示。正文 SHA256 与来源一致。
- 使用原有 KaTeX、Expressive Code、Callout、静态 Mermaid SVG。Typora `[toc]` 移除、h1 降为正文 h2、高亮/上下标兼容；代码与公式不替换。
- HTML img 和 Markdown 图片进入 Astro 响应式优化。28 张引用图片的真实输出 URL/宽度已登记 manifest；原图 SHA256 一致，含 zoom 的图片保留缩放。
- 图片说明插件修复无效的 center/paragraph 嵌套；图片属性不经二次归一化，保留构建核验标记。
- 实际 Chromium 验证操作系统 Lec0：320、390、1280px × light/dark，均仅一个 h1、无页面横向溢出、4 张图片有固有尺寸/srcset/原图入口。已人工查看 390 light 与 320 dark 截图。
- 构建前强制刷新 Astro 内容缓存，避免 renderer 插件更改后旧 HTML 被复用。

复验：`pnpm test && pnpm check && pnpm type-check && pnpm build`。浏览器回归与最终截图见后续加入的 `tests/e2e` 和最终验收报告。
