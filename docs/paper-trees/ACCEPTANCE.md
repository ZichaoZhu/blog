# 论文解析树验收记录

日期：2026-10-09（Asia/Shanghai）。实施分支：`feat/astro-firefly`。设计及任务依据见 [设计](../superpowers/specs/2026-10-08-paper-analysis-tree-design.md) 和 [计划](../superpowers/plans/2026-10-08-paper-analysis-tree.md)。

## 当前状态

代码及本地合成数据验收已完成。真实 GitHub App、私人数据仓库、Actions、Studio 域名及首次线上发布尚待配置和验收；本记录中的模拟 API 测试不能代替真实 OAuth 或云端推广结果。原正式站点尚未切换到论文树版本。

## 本地检查

运行环境：macOS、Node 22.23.0、pnpm 11.22.0、Playwright 1.63.0 / Chromium。2026-10-09 的独立执行结果：

| 检查 | 结果 |
| --- | --- |
| `pnpm test` | 100/100，通过模型、鉴权、CAS、版本绑定、发布、故障恢复、回退、Git 读取及缓存检查 |
| `pnpm type-check` | 通过 |
| `pnpm lint:check` | 0 错误；模板既有 5 warnings / 36 infos |
| `pnpm check` | 331 文件，0 errors / warnings / hints |
| `pnpm check:studio` | 15 文件，0 errors / warnings / hints |
| `pnpm build:studio` | Vercel SSR 构建通过 |
| `pnpm build` | 静态博客及 Pagefind 构建通过 |
| `pnpm verify:site` | 80 条记录、72 篇公开内容、638 资源、558 引用，两个错误数组均为空 |
| `pnpm test:e2e` | 69/69，导航图标、搜索、专题、归档、移动端、下标、分式及图片居中均通过 |
| `pnpm test:authoring` | 3/3，并通过真实隔离构建的 Pagefind、可见性与内容更新检查 |
| `pnpm test:paper-trees -- --reporter=list,json` | 24/24；另有真实博客与 Studio 产物扫描及 500 篇合成论文检查 |

论文树浏览器覆盖：只读伸缩、父节点说明、链接、方向键、编辑快捷键与焦点、唯一 ID、非法后代移动、保存中继续编辑、冲突、导入导出、退出和重新挂载、390px / 1440px、亮暗、全屏退出、无 JavaScript、画布加载失败、Pagefind、重复 Swup 导航。作者界面的 API 响应在这些浏览器测试中被模拟。

既有构建提示包括原文章的无效 KaTeX 输入、中文 Pagefind 不提供词干处理，以及 Studio 编辑器分块超过 500 kB。它们不构成测试通过或真实云端验证的替代证据。

## 隐私与规模

测试在独立临时副本中加入草稿、unlisted、普通笔记及失败快照的独特标记。扫描真实 HTML、JSON、JS、feeds、sitemap、Pagefind 二进制片段和附件字节，禁止这些标记以及 `drafts`、`jobs`、`control.json`、`papers.json` 文件进入公开输出。先注入标记确认扫描失败，再移除确认通过。Studio 服务端可持有私人论文清单，但其静态客户端产物不能含清单标记。

500 篇公开论文各自输出一个图快照；第一篇完整模板页面为 **186,972 bytes**，不包含其余 499 篇节点文本；每个页面只接收本篇数据。页面仍含完整可索引文字大纲。公开输入按不可变快照及 release 缓存，500 次页面关联不重复读取整份清单。该缓存检查是本地实现检查，并非线上延迟承诺。

私人 worker 使用固定数据提交的 bare partial Git reader，不 checkout 数据仓库；仅允许 control / jobs / releases / snapshots 路径，拒绝 drafts，并批量预取选中的快照。原生 Git 测试证明固定版本和路径约束；本地文件传输不能证明 GitHub 实际网络的 partial-clone 行为，首次真实发布需另验。

## 性能样本

以下为本机开发模式的独立画布 fixture，各一次样本。`loadMs` 包括导航和操作检查，不是 SDK 独立初始化基准；展开耗时包括两帧等待；不应外推为生产或移动设备保证。

| 节点 | 视口宽 | loadMs | 收起再展开 ms | 页面 scrollWidth |
| --- | --- | --- | --- | --- |
| 100 | 390 | 571 | 3.4 | 390 |
| 500 | 390 | 976 | 12.3 | 390 |
| 100 | 1440 | 557 | 18.0 | 1440 |
| 500 | 1440 | 976 | 9.6 | 1440 |

四项分式可见高度均为 22px，没有整页横向溢出。Chromium 返回相同的粗粒度 heap 读数 23,100,000 bytes，不能据此认定内存峰值或两种规模的真实差异。

Studio 生产构建：共享 `MindElixir` chunk **91,242 bytes / gzip 28,709 bytes**；`PaperTreeStudio` entry **508,259 bytes / gzip 165,760 bytes**（包含 Markdown / KaTeX 等）。gzip 使用本地 Python 标准库重新压缩；图形模块按需载入，公开页面保留静态大纲。

## 上线前尚待真实验证

- GitHub 数字 ID 限制、首次登录、保存后重新登录读取、另一账户及匿名拒绝。
- 两个 Vercel 项目的 Node 22、候选访问保护、自动化绕过、域名及实际构建环境。
- 私人 Actions 固定数据 / 代码提交、partial Git 读取、500 快照的真实网络路径。
- 空清单 bootstrap、真实论文首次手动发布、正式域名部署 ID 与新鲜回执一致。
- 候选安全失败、失败图不带入下一次发布、历史回退不修改私人草稿、普通代码发布保留图。

独立代码审查、处理记录和真实部署结果将在相应步骤完成后追加，不能提前标为通过。
