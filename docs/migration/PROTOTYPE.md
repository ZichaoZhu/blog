# Firefly 迁移原型验收

当前阶段：代表文章完成；导航、媒体和全量内容的验收在后续阶段补充。

- 16 个原型文档：5 个集合说明、9 个公开笔记、2 个 unlisted 演示。正文 SHA256 与来源一致。
- 使用原有 KaTeX、Expressive Code、Callout、静态 Mermaid SVG。Typora `[toc]` 移除、h1 降为正文 h2、高亮/上下标兼容；代码与公式不替换。
- HTML img 和 Markdown 图片进入 Astro 响应式优化。28 张引用图片的真实输出 URL/宽度已登记 manifest；原图 SHA256 一致，含 zoom 的图片保留缩放。
- 图片说明插件修复无效的 center/paragraph 嵌套；图片属性不经二次归一化，保留构建核验标记。
- 实际 Chromium 验证操作系统 Lec0：320、390、1280px × light/dark，均仅一个 h1、无页面横向溢出、4 张图片有固有尺寸/srcset/原图入口。已人工查看 390 light 与 320 dark 截图。
- 构建前强制刷新 Astro 内容缓存，避免 renderer 插件更改后旧 HTML 被复用。

复验：`pnpm test && pnpm check && pnpm type-check && pnpm build`。浏览器回归与最终截图见后续加入的 `tests/e2e` 和最终验收报告。

## 导航验收

- 首页身份、GitHub、头像来自原工作区；入口为 Notes/Courses/Papers/Research/Projects，主题与搜索另有入口。
- 课程的 Lec0/2/10 排序、跨课程隔离、unlisted/draft 排除与 44 项分页 fixture 已通过单元验证。
- Chromium 生产预览通过：首页 → 操作系统 → Lec0 → 下一讲 → 返回课程；研究想法/实验和项目空状态；未知课程返回 404。
- 390px 菜单支持 Enter、Tab 焦点留在模态内、Esc 返回触发按钮；原生 details 目录支持键盘与正文锚点。
- CourseNav 置于现有侧栏 Swup 动态容器，保持播放器持久存在并更新当前课程上下文；Article 复用模板布局/Markdown/TOC，移除分享、赞助和全站时间线邻接。

## 媒体与效果验收

- 视频保持 muted/playsinline/loop，有 poster、失败回退和播放控制；首页按允许的效果状态播放，阅读页暂停。初版沿用模板视频地址，最终媒体清单由发布前确认。
- 统一 `firefly-effects` 选择、`firefly:effects-change` 事件；默认尊重减少动态，SaveData 禁止自动请求视频，后台暂停视频/樱花/波浪/打字机。音乐独立。
- 樱花桌面 10、手机 5；打字机、波浪、渐变、导航毛玻璃和 Swup 开启。系统字体，无字体 API 请求；导航固定，长页控制可达；关闭动效时新页正文仍可见。
- 音乐沿用模板全局单例，local 播放列表、默认音量 0.25、preload=none，初载/刷新暂停；连续 10 次站内导航音频实例和播放进度保持。
- Chromium 9 项导航/媒体测试通过，含真实 MP4 fixture 验证后台暂停恢复，外部错误拦截验证封面与正文不受影响。
- 390px cover/effects/playing 三状态均无横向溢出，audio=1；请求数分别 41/43/43。完整测量见 `PROTOTYPE_RESOURCES.json`，截图见 `screenshots/`。playing 使用明确测试 fixture，不将测试色块作为正式视频。
