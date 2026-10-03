# ZZC Research Notes

个人科研知识主页，采用 Astro 静态构建、Markdown Content Collections、Svelte 交互和 Pagefind 搜索。基于真实 [Firefly](https://github.com/CuteLeaf/Firefly/tree/6d82554bfe1cb3d4b43adb0969dad1d43ac6dee3) 模板 6.16.8，锁定提交 `6d82554bfe1cb3d4b43adb0969dad1d43ac6dee3`；保留上游 MIT 许可与致谢。

迁移在 `feat/astro-firefly` 分支实施，原 Next 工作区保留。内容与验收证据见 [ACCEPTANCE](docs/migration/ACCEPTANCE.md)，恢复步骤见 [ROLLBACK](docs/migration/ROLLBACK.md)。本地预览已完成，生产域名、托管平台与个人媒体尚待确定。

## 运行与检查

使用 Node **22.23.0** 和 pnpm **11.22.0**。只有 `pnpm-lock.yaml`；首次 checkout 需要 Git LFS 取得真实图片，CI 设置了 `lfs: true`。

```bash
pnpm install --frozen-lockfile
pnpm dev                       # 开发预览，不含生产 Pagefind 索引
pnpm test
pnpm lint:check                 # 只读；主动格式化使用 pnpm format
pnpm check
pnpm type-check
pnpm build                     # 默认 preview，全站 noindex
pnpm verify:site                # 当前内容、渲染与本地链接检查
pnpm audit:migration            # 单独核对不可变的迁移快照
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:authoring             # 隔离副本中验证合集隐私与真实项目图片/发现范围
pnpm preview --host 127.0.0.1 --port 4321
```

Astro 7 的 preview 会启动后台服务；可用 `pnpm preview stop` 停止。搜索验收必须使用 build 后的 preview。CI 验证相同步骤，**不会自动发布**。

## 写作

正文保存在 `src/content/posts/`，可以继续使用 Typora 和嵌套文件夹。文件夹影响编辑组织；地址由 frontmatter 的显式 `slug` 决定，改标题或移动文件不会改 URL。

```bash
pnpm new-post "进程调度" --slug process-scheduling --type course --course operating-systems --order 14 --topics operating-systems
pnpm new-post "论文阅读" --slug paper-reading-name --type paper --topics 3d-vision
pnpm new-post "实验日志" --slug experiment-log-name --type log --topics robotics
```

迁移快照及其 hash 保留为历史证据，日常 CI 按当前内容验证。旧笔记可正常更新正文、日期、可见性和移动目录；修改 slug 是地址变更，需要显式更新兼容映射。`audit:migration` 在已修改原文后失败表示与迁移时的内容不同，不阻止日常 CI。

默认生成 draft，不会公开。`--visibility published` 公开，`unlisted` 可凭地址访问但不进入公开列表、搜索、订阅和 sitemap；它不是访问控制，勿用于秘密内容。`--id` 可另设稳定标识，省略时等于 slug。重复 ID/slug、未知分类和重复课程讲次会报错。

```yaml
---
id: process-scheduling
slug: process-scheduling
title: 进程调度
description: 调度策略与权衡
type: course
topics: [operating-systems]
visibility: draft
course: { id: operating-systems, order: 14 }
# date: 2026-10-03       # 只填真实日期；未知时省略
# updatedAt: 2026-10-04  # 不使用文件 mtime 代替真实日期
---
```

类型为 `course / paper / log / idea / experiment / note`；课程和主题在 [catalog.ts](src/data/catalog.ts) 维护。课程讲次允许 0，按数字排序，只连接同课程上下篇。合集简介使用 `contentKind: collection`，不冒充文章。空正文不计入公开笔记。未知日期保持未知，RSS/Atom 只收录有真实日期的公开文章。

论文可添加 `paper: { title, authors, year, venue, paperUrl, arxivUrl, doiUrl, codeUrl }`；只填已核实信息。研究日志、想法和实验使用各自类型；项目尚无公开条目，保留真实空状态。

## 图片、渲染与搜索

图片继续和 Markdown 放在一起，例如 `![示意](./assets/图 + 1.png)`。构建时安全解析原路径并生成响应式图片；保留原始字节和原图查看链接，支持中文、空格、加号与百分号路径，拒绝越界。Typora 高亮/上下标、zoom 图片、数学公式、代码和 Mermaid 通过构建时插件兼容；原文不做批量改写。

旧 `/blog/...`、筛选查询、标题锚点和 `/api/images/...` 在静态预览提供兼容访问。旧地址映射见 [legacy-routes.json](src/data/legacy-routes.json) 和 [LINK_REPORT](docs/migration/LINK_REPORT.md)。正式 HTTP 301/308 规则需选定托管平台后生成和验证；静态兼容页不是 HTTP 重定向。

Pagefind 索引仅含公开且非空的文章正文。`/search/` 支持关键词、类型、主题和课程筛选，以及返回/刷新状态。分页每页 25 条，搜索每批 20 条。无 JS 时仍可阅读、按课程/主题和分页导航；全文搜索需要 JS。检索的实际多语言限制见验收报告。

## 风格与媒体

`src/config/` 配置 Firefly 导航、侧栏、主题、首页背景视频、音乐、樱花和波浪。导航上的动效按钮保存用户选择；减少动态和省流量偏好默认阻止背景视频，后台标签暂停装饰。音乐失败后停止，点击播放可重试；音乐需用户点击播放，单实例跨 Swup 切页保持状态，刷新后不自动播放。替换 `backgroundWallpaper.ts` 的演示视频与 `musicConfig.ts` 的模板音频后，应重新测量媒体传输体积。主页人物头像使用共享 WebP 小图，原 PNG 保留。

## 构建与模板升级

构建保留实际使用的头像优化、LQIP、Astro、未启用看板娘资源裁剪、内联脚本压缩与 Pagefind。当前无 GitHub 指令卡片、VNDB 页面或自定义字体子集，默认流程省略其任务；启用后分别运行 `pnpm github-cards`、`node --import tsx scripts/generate-vndb-covers.ts`、`node --import tsx scripts/subset-fonts.ts`，再将必要步骤加回 build。OG 图片生成关闭。

升级 Firefly 时另建分支对比锁定上游，重点核对内容 schema/公开判定、课程导航、搜索摘要与筛选、Markdown 插件顺序、SEO/旧链接和 Swup 媒体生命周期。保留本站适配，而不复制新示例内容或全量覆盖 config。升级 Node/Astro/pnpm 时同时更新锁文件、CI 和验收记录，再运行全部检查及 500 篇临时压力构建：

```bash
node --import tsx scripts/benchmark-content.ts --count 500 --output-dir /tmp/firefly-scale-new
```

压力数据只写入新的临时目录，绝不进入真实内容目录。实测结果代表本机与当时语料，不能承诺部署后的 CDN 性能。

## 发布准备

默认产物为 `dist/` 静态预览，全站 noindex。确认生产域名后，以 `SITE_MODE=production SITE_ORIGIN=https://已确认域名 pnpm build` 在同一提交重建；缺少有效 HTTPS origin 时直接失败。检查 canonical/OG/sitemap/RSS/Atom/robots 的域名一致性，再按所选平台设置旧地址永久重定向、验证旧链接及媒体。

发布前需保存当前线上 release/产物与规则、执行 [回滚步骤](docs/migration/ROLLBACK.md)。本次交付没有 push、merge、部署或 DNS 操作。
