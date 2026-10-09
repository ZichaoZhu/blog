# 论文解析树验收记录

日期：2026-10-09（Asia/Shanghai）。实施分支：`feat/astro-firefly`。设计及任务依据见 [设计](../superpowers/specs/2026-10-08-paper-analysis-tree-design.md) 和 [计划](../superpowers/plans/2026-10-08-paper-analysis-tree.md)。

## 当前状态

代码及本地合成数据验收已完成。私人数据仓库、Actions 模板及 Studio 项目已经初始化；GitHub App、Studio DNS、完整运行凭据及首次线上发布尚待配置和验收；本记录中的模拟 API 测试不能代替真实 OAuth 或云端推广结果。原正式站点尚未切换到论文树版本。

## 本地检查

运行环境：macOS、Node 22.23.0、pnpm 11.22.0、Playwright 1.63.0 / Chromium。2026-10-09 的独立执行结果：

| 检查 | 结果 |
| --- | --- |
| `pnpm test` | 102/102，通过模型、鉴权、CAS、版本绑定、发布、故障恢复、回退、Git 读取及缓存检查 |
| `pnpm type-check` | 通过 |
| `pnpm lint:check` | 0 错误；模板既有 5 warnings / 36 infos |
| `pnpm check` | 331 文件，0 errors / warnings / hints |
| `pnpm check:studio` | 15 文件，0 errors / warnings / hints |
| `pnpm build:studio` | Vercel SSR 构建通过 |
| `pnpm build` | 静态博客及 Pagefind 构建通过 |
| `pnpm verify:site` | 80 条记录、72 篇公开内容、638 资源、558 引用，两个错误数组均为空 |
| `pnpm test:e2e` | 69/69，导航图标、搜索、专题、归档、移动端、下标、分式及图片居中均通过 |
| `pnpm test:authoring` | 3/3，并通过真实隔离构建的 Pagefind、可见性与内容更新检查 |
| `pnpm test:paper-trees -- --reporter=list,json` | 26/26；另有真实博客与 Studio 产物扫描及 500 篇合成论文检查 |

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

## 独立审查及修复

2026-10-09，独立 `gpt-6-astra` 审查 `81660f7..3c04feb` 全分支，分段检查并执行 49 项针对性单元测试。没有确认 Critical 或 Minor，发现 5 项 Important，均在一次修复轮次中处理，没有进行第二次审查：

| 问题 | 失败复现 → 修复证据 |
| --- | --- |
| 未提交的论文可见性被错误标记成 HEAD 版本 | 原生 Git 用例先因缺少检查失败；现拒绝 tracked / staged / untracked 变更，避免错误裁剪已发布树 |
| dispatch 错误记录覆盖 worker 新进度及部署 ID | 先观察 `building` 被退回 `queued`；现同一提交读取最新 job，仅注释仍未开始的 queued job，保留较新状态与两份部署 ID |
| 预览遗漏节点侧栏尚未应用的输入 | 直接输入标题 / 说明 / 链接后预览原先失败；现先本地应用并验证，预览不远程保存，发布结果与预览一致 |
| 保存后继续输入仍显示已保存 | 原先新输入仍显示已保存；现 dirty 优先，立即显示未保存 |
| 单论文页面的回退实际影响全站但没有明确提示 | 原先没有全站范围标题；现历史、数量和确认明确指出影响所有论文，新于该版本的图可能移除，草稿及正文保留 |

修复后的完整单元套件 **102/102**、论文树浏览器 **26/26**、500 篇实际构建及隐私扫描通过；TypeScript、Studio 15 文件检查、SSR 构建、Biome（0 错误）和 `git diff --check` 通过。原站点 69 项及写作回归未因这些仅限 worker / Studio 的修复重复执行，其上方结果保留。

审查明确留待云端验证：实际 OAuth、GitHub partial fetch、候选保护、prebuilt CLI、项目 Ignored Build Step 防止旧 main 自动覆盖的效果。当前公开源码模式是明确约束，改成私人源码时需额外只读凭据。

## 实施取舍记录

- Ruling: Execute read-only skill scripts from an identical executable copy under /private/tmp — installed script files lack executable permission and call sibling scripts directly — no product behavior changes; costs only runner setup if the copy drifts.
- Ruling: Translate canonical numeric fontSize/fontWeight to Mind Elixir CSS strings inside the shared canvas — installed SDK styles require strings while the accepted persistence contract permits only bounded numbers — without this conversion style round trips would fail or silently lose valid style. No persisted schema change.
- Ruling: Force a foreground Astro dev server via its ASTRO_DEV_BACKGROUND flag in Playwright — Astro 7 auto-backgrounds in agent environments and duplicates relative --root after changing child cwd; observed missing-pages log — prevents tests silently using the wrong app; test harness only.
- Ruling: Add root folding as a scoped CSS visibility state in the shared canvas — installed Mind Elixir expandNode assumes a non-root expander and throws for the root (observed keyboard RED) — data stays intact and all other branch folds use core API; must regression-test hidden descendants and undo state.
- Ruling: Generate an optional explicit snapshot-ids.json beside release.json — current entries alone cannot name retained historical successful snapshots, and arbitrary directory copying is forbidden — Task 8 preparation must write the explicit list; absent list reads current entries only. Unknown files are never copied.
- Ruling: Start the shared content-schema catalog reader in Task 3 rather than Task 4 — Astro build hooks cannot call astro:content outside its runtime; emission must recheck authored visibility with the same schema — Task 4 extends this reader instead of duplicating it.
- Ruling: Exclude specialized paper-tree fixtures from the original Playwright config — its default glob would run the new canvas tests against the production-blog preview where test-only routes must not exist — the paper-tree test command covers them separately; CI must run both suites.
- Ruling: Keep the Studio client session contract aligned with Task 4 API (authenticated, csrfToken, expiresAt), omitting the unused userId from Task 6 client signature — only the server validates numeric ownership and the UI needs no user identity field — a future account display would need an explicit API extension.
- Ruling: Resolve the current active job with authenticated GET /api/jobs when jobId is omitted — a reopened Studio has no persisted jobId and must recover from the server control pointer — adds one documented read variant; no arbitrary file selection or public access.
- Ruling: Extract publishing, preview and history controls into PaperTreePublication.svelte — this keeps the private editor lifecycle and publication polling separate while reusing the same canvas and API — requires testing the save/freeze callback and disposal boundary, covered by combined editor/publish browser tests.
- Ruling: Use the private Actions repository's short-lived GITHUB_TOKEN for worker data access instead of requiring Studio OAuth/session secrets — workers need only private Contents write and Actions read, and still validate the pinned job and live lock — repository token permissions must match the template; owner login remains unchanged.
- Ruling: Hold an uncertain promotion lock until exact formal deployment identity and a fresh matching receipt prove success — a finished workflow or old alias cannot prove an asynchronous promotion will not finish later — an ambiguous provider failure may require operator recovery rather than automatic unlocking.
- Ruling: Add a minimal public Studio /version.json deployment receipt while keeping the paper catalog server-only — coordinated switching needs independently verifiable code/release/job identities — only commit/release/job identifiers become public, never catalog entries or credentials.
- Ruling: Emergency full-site rollback reuses a previously successful code job and both archived deployment IDs, under an explicit --full-site operator flag and the same lock — it restores articles/resources and matching Studio together, while graph-only rollback keeps current code — its job status timestamp is updated and the successful release pointer returns to that historical chain; no automatic rollback to a pre-feature deployment lacking a matching Studio.
- Ruling: Cache validated immutable public inputs per release/list file state and recheck catalog visibility — 500 article lookups otherwise reread all snapshots quadratically — callers must prepare a fresh release/list for changed snapshots; mutable in-place snapshots are unsupported.
- Ruling: Use a pinned bare partial Git reader and batch selected blob fetches for worker public inputs — separate Contents requests for 500 snapshots exceed the installation token minimum API allowance — requires real GitHub partial-fetch acceptance; no working checkout or draft path is allowed.
- Ruling: Share short-lived GitHub installation tokens only within identical credentials/configuration and fetch provider, with a 60-second expiry margin — per-request stores otherwise mint tokens repeatedly — credential rotation and provider isolation must invalidate the cache.
- Ruling: Release the pointer outside the anchor before checking keyboard focus in the old topic card test — its mouseup navigated away before the assertion — test-only correction; actual navigation is covered separately.
- Ruling: Give blog and paper-tree suites separate output directories and run browser suites sequentially — concurrent runs removed each other's trace output — no runtime change; serial runs take longer.
- Ruling: Date the 499 synthetic scale fixtures one day before the primary reader fixture — equal dates pushed the Swup target off the first topic page — real authored dates are unchanged and all 500 snapshots remain asserted.
- Ruling: Run the single required fresh final code review at Task 11 Step 2, before any cloud switching — the approved plan explicitly puts this gate before account integration, while the generic skill places it after the last task — subsequent cloud verification must not introduce unreviewed product changes; no second reviewer.
- Ruling: Map approved Actions variable names BLOG_VERCEL_PROJECT_ID / STUDIO_VERCEL_PROJECT_ID to worker CLI VERCEL_PROJECT_ID / VERCEL_STUDIO_PROJECT_ID — preserve the approved setup interface and native CLI environment contract — existing private installations must use the documented Actions names.
- Final: Ruling: Real OAuth, GitHub partial fetch, candidate protection and prebuilt behavior require real-cloud acceptance — synthetic tests are recorded as local-only and Task 11 remains incomplete until evidence exists — incorrect configuration can still prevent first deployment.
- Final: Ruling: Keep Git production branch main and require project-level Ignored Build Step exit 0 before coordinated production enabling — old main code must not auto-deploy around the private lock; official Vercel docs confirm exit 0 skips remote builds — actual worker prebuilt and auto-deploy guard behavior must be verified before switching; not claimed verified.
- Final: Ruling: Current workflow supports the existing public source repository; document additional read-only credentials if source becomes private — data-repository GITHUB_TOKEN cannot read a different private source repo — changing source visibility without those credentials will fail closed.
- Ruling: Keep graph rollback scoped to the complete successful release as designed, label all-site scope, paper count and removal consequences in the author UI — release history maps all papers and per-paper rollback would change the accepted model — choosing an old release may remove newer public graphs, with explicit confirmation; private drafts and article bodies stay intact.

## 云端初始化进度（尚未发布功能）

- 私人数据仓库：`ZichaoZhu/paper-analysis-data`，GitHub 确认为 PRIVATE；初始提交 `dfac5d5`，包含空控制基线与已启用的 `publish.yml`。五个非敏感 Actions variables 已设置。
- Studio：`blog-studio` / `prj_wIgiZ1TmUmzMBn0rbE5hw3NXxc5N`，Root=`studio`、Node 22.x、共享根外源码开启、保护=`all_except_custom_domains`。
- 博客及 Studio 项目 Ignored Build Step 均已设置为 `exit 0`；博客 Git 生产分支仍为 `main`。实际 remote Git 取消与 worker prebuilt 路径尚待验收。
- Studio 子域名已关联项目并通过域名所有权核验，但 DNS 尚未配置。Vercel 实际推荐 CNAME：`studio` → `a0f5e2e31eb50535.vercel-dns-017.com`。该值来自本次项目 API，而不是通用示例。
- 正式博客 alias 重新核对仍为 `dpl_BDZ4F34Sj2eoURGJex9JoCikZhEa`，源码 `30241dbf3eb0daff6859d510522e2fc8cea0a93b`。当前部署没有论文树功能。
- GitHub App 注册准备页与仅监听本机的回调已备好，等待本人创建、安装到单一私人仓库。实际 OAuth、读写和图发布没有执行，不能标为通过。
