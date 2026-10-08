# Paper Analysis Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Paper 笔记提供可折叠的论文解析树，并让唯一作者通过 GitHub 登录保存私人草稿、手动发布及回退。

**Architecture:** 主博客保持 Astro 静态构建，树模型、模板、内容解析和 Svelte 画布共享。`studio/` 是同一 pnpm workspace 中独立部署的 Astro 作者服务，使用官方 Vercel 适配器和 Node 接口；GitHub 私有仓库存储草稿与发布记录，私有 Actions 构建受保护的候选部署，验证后切换正式域名。

**Tech Stack:** Node 22.23.0、pnpm 11.22.0、Astro 7.3.2、Svelte 5、TypeScript、Mind Elixir；复用 marked、KaTeX 0.16.47、sanitize-html、node:test 和 Playwright。

**Spec:** [已确认的书面设计](../specs/2026-10-08-paper-analysis-tree-design.md)，基线提交 `5f8fe10`。本计划等待审阅，所有实施步骤尚未执行。

本文的文件路径以 Astro worktree 根目录为起点；同一清单中的短文件名沿用最近一个完整路径的目录，`studio/` 下的文件特别标明，避免误改主博客配置。

## Global Constraints

- 第一阶段聚焦论文解析树，一篇 Paper 研读笔记关联一棵树；流程图留到之后。
- 使用 GitHub 登录，只有作者本人可以读取草稿、编辑、保存和发布；身份使用 GitHub 数字 ID。
- 使用独立 GitHub 私有仓库保存草稿和修改历史；无额外数据库。
- 保存私人草稿，手动发布；读者继续看到上一次成功发布的版本。
- 模板标识 `pengsida-paper-analysis-v1`，完整内容按设计第 3 节，不缩减成五个空节点。
- 沿用微软雅黑字体栈和 `22 / 18 / 14 / 12px`，复用蓝色、白色容器、暗色变量及现有按钮交互。
- 根节点深度为 0，默认显示深度 0、1、2；深度 2 的后续子树初始收起。
- `schemaVersion=1`；单棵树 JSON 最大 1 MiB、最多 500 个节点、最大深度 32；topic 最多 1,000 字符，note 最多 20,000 字符。
- 本阶段图数据不接受内嵌图片、附件或文件上传；不实现任意 Markdown、XMind 或 draw.io 文件互转。
- 生产会话默认有效期 2 小时；Cookie 使用 HttpOnly / Secure / SameSite=Lax，写入验证 CSRF 和同源。
- 作业状态为 `queued / building / validating / deploying / published / failed`；全站一次只有一个活动发布。
- 暂存及失败部署必须限制匿名访问；正式回执 `/paper-trees/release.json` 使用 `no-store`。
- 当前源分支是 `feat/astro-firefly`；固定提交构建，不默认取 `main`，不改 Vercel Git 生产分支设置。
- 正式构建使用 `PUBLIC_SITE_MODE=production` 和 `PUBLIC_SITE_ORIGIN=https://blog.blessingworld.cn`；预览保持 noindex。
- 原 main 工作区有用户未提交改动：禁止 reset、stash、覆盖或全仓库暂存。

## Review Focus

1. 作者服务、论文清单与线上代码版本不一致：不能用旧代码发布覆盖新站点。Task 4 / 7 / 9 验证版本绑定和拒绝条件。
2. 保存请求返回前又修改节点，或重复点击发布：新修改仍是未保存状态，发布版本固定，不能误显示为已经公开。Task 6 / 7 验证。
3. 中英文 ID、特殊字符、跨论文导入及分支复制：关联依据稳定 ID，存储路径由服务端生成，复制不能产生重复节点 ID。Task 1 / 5 验证。
4. 含代码、转义美元符号、下标、高分式或坏公式的节点：正确区分 Markdown 与数学，单个错误不破坏其他节点。Task 2 验证。
5. 工作流触发结果不明、promote 已成功但记录失败、普通代码发布同时进行：先核对真实部署，不能超时解锁或发布失败候选。Task 7 / 8 / 9 验证。

---

## 实施方式与文件边界

沿用此前选择的 Native：实施者逐项实现、验证并提交，结束时按对应执行技能进行独立分支审查。当前已有隔离的 Astro worktree，执行前重新核查可复用，不在 main 工作区施工。浏览、编辑、存储和发布依赖同一数据契约，共用这一份计划，按下列可验收任务顺序推进。

| 文件或目录 | 职责 |
| --- | --- |
| `src/features/paper-trees/model.ts`、`template.ts` | 浏览器和服务端共享的版本化数据、边界校验、导入复制与截图模板 |
| `src/features/paper-trees/render.ts`、`PaperTreeCanvas.svelte`、`paper-tree.css` | 安全节点解析、一个 Mind Elixir 画布、节点详情和共享主题 |
| `src/features/paper-trees/public-build.ts`、`PaperTreeSection.astro`、`PaperTreeOutline.astro` | 只读取公开构建输入，生成图 JSON、静态文字大纲与文章锚点 |
| `src/pages/notes/[slug].astro` | 论文页接入；其余文章结构保持原有行为 |
| `scripts/paper-trees/catalog.ts` | 从现有内容 schema 生成受信任论文清单，供作者服务端与发布验证使用 |
| `studio/package.json`、`astro.config.mjs`、`tsconfig.json`、`vercel.json` | 独立作者部署配置；不把主博客改成 SSR |
| `studio/src/layouts/StudioLayout.astro`、`middleware.ts` | 复用样式、无缓存、noindex；不静态输出私人内容 |
| `studio/src/pages/studio/paper-trees/index.astro`、`[paperKey].astro` | 工作区列表与编辑页面外壳 |
| `studio/src/pages/api/[...path].ts`、`studio/src/server/api.ts` | Astro API 入口与有限路由，统一权限、错误及返回格式 |
| `studio/src/server/config.ts`、`auth.ts`、`github-store.ts`、`release.ts` | 服务端配置、作者身份、具体 GitHub 存储与发布事务 |
| `studio/src/components/PaperTreeStudio.svelte`、`studio/src/client/api.ts` | 作者操作与请求状态；复用公共树组件 |
| `scripts/paper-trees/prepare.ts`、`publish.ts`、`reconcile.ts` | 私有作业构建输入、部署、回执核验与故障恢复 |
| `ops/paper-trees/publish.yml` | 要安装到私有仓库的工作流模板，不在公开代码仓库自动发布 |
| `tests/unit/paper-tree-*.test.ts`、`tests/e2e/paper-tree-*.spec.ts` | 数据、权限、发布事务和真实交互回归 |
| `tests/fixtures/paper-tree-app/`、`playwright.paper-trees.config.ts`、`scripts/test-paper-trees.ts` | 独立画布和复制工作区中的合成文章测试；不生成生产测试路由 |
| `docs/paper-trees/SETUP.md`、`ACCEPTANCE.md` | 配置步骤、真实验收与恢复记录 |

只增加必要的新依赖：Mind Elixir 和作者服务的官方 Vercel 适配器；其他依赖使用现有版本，不引入 ORM、通用绘图库适配层、状态框架或新测试框架。运行时使用原生 `fetch` 与 Node `crypto` 调用 GitHub 和签名，私钥只在服务端使用。

### Task 1: 版本化数据与完整模板

**Files:** Create `src/features/paper-trees/model.ts`、`template.ts`；Test `tests/unit/paper-tree-model.test.ts`、`tests/fixtures/paper-trees.ts`。

**Interfaces:**
- `TreeNode = {id:string; topic:string; note?:string; hyperLink?:string; expanded?:boolean; children?:TreeNode[]; style?:NodeStyle}`；NodeStyle 只允许四种字号、400 / 700 字重及十六进制颜色，拒绝 URL 和任意 CSS。
- `TreeData = {nodeData:TreeNode; direction:1}`；`DraftTree = {schemaVersion:1; paperId:string; templateId:string|null; updatedAt:string; tree:TreeData}`。
- `PublicSnapshot = {schemaVersion:1; snapshotId:string; paperId:string; publishedAt:string; tree:TreeData}`。
- 产出 `validateDraft(input:unknown, paperId:string):DraftTree`、`toPublicSnapshot(draft:DraftTree, snapshotId:string, publishedAt:string):PublicSnapshot`、`importDraft(input:unknown, paperId:string):DraftTree`。
- 产出 `createPaperTree(paperId:string, mode:'template'|'empty'):DraftTree`、`cloneBranch(node:TreeNode):TreeNode`、`flattenTree(tree:TreeData):Array<{node:TreeNode; depth:number; parentId?:string}>`。
- 单一 `TreeValidationError` 带 `code`、可选 `nodeId` 和可读消息；大小用 UTF-8 字节计算，字符长度按 Unicode 码点计算。图片、附件、原始 HTML 字段在导入及写入时拒绝；公开投影另外丢弃任意未知私有字段，不能仅靠 UI 隐藏。

- [ ] **Step 1: 写边界和模板的失败测试。** 验证截图完整路径与多行说明；两次创建、整组复制和跨论文导入的节点 ID 不重复。覆盖 500 / 501 节点、深度 32 / 33、topic 1,000 / 1,001、note 20,000 / 20,001、UTF-8 1 MiB 边界、重复 ID、循环引用、图片、未知 schema、危险 URL、原始 HTML 字段以及伪造 paperId。

```ts
const d = createPaperTree('paper/中文', 'template');
assert.deepEqual(d.tree.nodeData.children?.map(n => n.topic),
  ['Abstract', 'Introduction', 'Method', 'Experiments', 'Limitation']);
assert.equal(importDraft(d, 'paper-B').paperId, 'paper-B');
assert.throws(() => validateDraft(oversizedUtf8Draft, 'paper/中文'), TreeValidationError);
```

- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-model.test.ts`。** 应因目标能力缺失失败，不能把环境或拼写错误当成 RED。
- [ ] **Step 3: 实现上述接口。** 模板逐项转录设计第 3 节；用全局 `crypto.randomUUID()` 生成 ID。持久化白名单移除 parent、任意 metadata、arrows、summaries、图片和 HTML；导入重绑定论文并重建所有 ID，不保留发布状态。节点说明在发布预览中明确属于公开内容。
- [ ] **Step 4: 重跑该文件和 `pnpm type-check`。** 全部断言通过；人工逐路径对照截图，不能只检查五个主标题。
- [ ] **Step 5: 只暂存本任务文件，提交 `feat: add paper tree schema and reading template`。**

### Task 2: 树引擎实测、安全内容和共享画布

**Files:** Create `src/features/paper-trees/render.ts`、`PaperTreeCanvas.svelte`、`paper-tree.css`、`tests/fixtures/paper-tree-app/astro.config.mjs`、`tests/fixtures/paper-tree-app/src/pages/index.astro`、`playwright.paper-trees.config.ts`；Modify `src/features/paper-trees/model.ts`、根 `package.json`、`pnpm-lock.yaml`；Test `tests/unit/paper-tree-render.test.ts`、`tests/e2e/paper-tree-canvas.spec.ts`。

**Interfaces:**
- 消费 Task 1 的 TreeData 和 TreeNode；`renderNodeMarkdown(source:string):string` 输出经过清理的 HTML。
- 画布 Props：`tree:TreeData`、`editable:boolean`、`onchange?:(tree:TreeData)=>void`、`onselect?:(nodeId:string)=>void`。
- 组件暴露 `exportData():TreeData`、`replaceData(tree:TreeData):void`、`command(action:TreeCommand):Promise<void>`；TreeCommand 定义于 model.ts，为 `{type:'addChild'|'addSibling'|'remove'|'clone'; nodeId:string}`、`{type:'move'; nodeId:string; parentId:string; index:number}`、`{type:'edit'; nodeId:string; patch:Partial<Pick<TreeNode,'topic'|'note'|'hyperLink'>>}` 或 `{type:'undo'|'redo'}`。新增初始标题为“新节点”，复制为同级分支；根不能删除或新增同级，移动不能进入自身后代。
- 测试配置先提供 canvas 项目，服务命令 `pnpm exec astro dev --root tests/fixtures/paper-tree-app --host 127.0.0.1 --port 4322`，baseURL `http://127.0.0.1:4322`。

- [ ] **Step 1: 写解析和浏览器失败测试。** 断言 `$r_{bound}=1$`、`$\frac{1}{a-1}$` 有正确 KaTeX；转义美元和代码中的美元保持原文；坏公式局部回退。检查脚本、事件属性、危险链接、原始 HTML 和 KaTeX trust 命令不会执行。完整模板在只读模式可折叠，禁止编辑和写请求；父节点说明可读，链接不误触折叠。
- [ ] **Step 2: 先运行 unit 文件，再运行 `pnpm exec playwright test --config playwright.paper-trees.config.ts --project=canvas`，确认缺失能力导致失败。**
- [ ] **Step 3: 核验并固定依赖。** 候选为 `mind-elixir@5.15.1`；先运行 `pnpm view mind-elixir@5.15.1 version`，确认可安装再 `pnpm add --workspace-root --save-exact mind-elixir@5.15.1`。这是本轮[上游 package.json](https://raw.githubusercontent.com/SSShooter/mind-elixir-core/master/package.json)的版本，尚未在此项目实测；不可用时先报告，不改成浮动 latest。
- [ ] **Step 4: 实现 render 与画布。** 使用现有 marked 的数学 token 扩展和 KaTeX `trust:false`，禁用原始 HTML，并以 sanitize-html 保留公式所需标签。动态导入 `mind-elixir`，使用包内 `mind-elixir/style.css`，方向 RIGHT；使用实际安装版本的 init / getData / reshapeNode / undo / redo / destroy，不从旧博客复制已废弃 API。关闭自由连线及图片入口，导出仍经 Task 1 白名单。[上游使用说明](https://github.com/SSShooter/mind-elixir-core)
- [ ] **Step 5: 验证编辑模式和生命周期。** 原生引擎处理增删、移动、复制及历史；移动到自身后代被拒绝，说明修改能撤销。只读初始折叠作用于深拷贝；有子节点点击切换，所有节点保留详情入口。onMount 使用同步回调登记清理，并取消尚未完成的异步初始化；清理销毁实例、监听器和观察器。映射主站主题变化，父容器约束溢出，不复用 SVG pan/zoom。
- [ ] **Step 6: 重跑 unit / canvas 检查，实测 390、1440px，100 / 500 节点，记录包大小和操作耗时。** 公式不裁切、节点不丢失、无整页横向溢出、折叠及编辑历史有效；关键能力不满足则停下修订选型，不能继续堆建后端。
- [ ] **Step 7: 提交 `feat: add shared interactive paper tree canvas`。**

### Task 3: 公开构建输入、文章布局与大纲搜索

**Files:** Create `src/features/paper-trees/public-build.ts`、`PaperTreeSection.astro`、`PaperTreeOutline.astro`、`scripts/test-paper-trees.ts`；Modify `src/features/paper-trees/model.ts`、根 `astro.config.mjs`、`src/pages/notes/[slug].astro`、`.gitignore`、`package.json`、`playwright.paper-trees.config.ts`；Test `tests/unit/paper-tree-public.test.ts`、`tests/e2e/paper-tree-reader.spec.ts`。

**Interfaces:**
- `ReleaseManifest = {schemaVersion:1; releaseId:string; parentReleaseId:string|null; codeSha:string; createdAt:string; entries:Record<string,string>}`；entries 是 paperId → snapshotId，存储于私有仓库。
- `PublicTreeInput = {release:ReleaseManifest; snapshots:PublicSnapshot[]}`，只含经过投影的公开数据。
- `loadPublicTrees(input:unknown, notes:readonly NoteRecord[]):Map<string,PublicSnapshot>` 校验版本、关联、snapshotId 唯一性及快照完整性；同一论文可以有多个历史成功快照，entries 只选择当前版本。移除不同时满足 type=paper 和 isPublicNote 的文章及其所有历史图。
- `readPublicTreeInput(dir:string|undefined, enabled:boolean, mode:'preview'|'production'):Promise<PublicTreeInput|null>`；配置目录默认 `.paper-trees/public-input/`，从非 PUBLIC 环境变量 `PAPER_TREE_INPUT_DIR` / `PAPER_TREES_ENABLED` 读取。
- 输入目录内使用 `release.json` 存当前 ReleaseManifest、`snapshots/<snapshotId>.json` 存白名单图；快照文件由私有准备步骤明确列出，不能递归复制未知文件。ReleaseManifest 定义于 model.ts，PublicTreeInput 定义于 public-build.ts，Task 3 同步扩展 model.ts。
- `PaperTreeSection` 消费 PublicSnapshot；HTML 内只序列化当前论文的白名单图数据，大纲和画布引用同一 snapshotId。快照 JSON 命名 `/paper-trees/snapshots/<snapshotId>.json`。

- [ ] **Step 1: 写失败测试。** 缺输入、缺快照、重复映射、伪造论文、非公开文章和原始私人字段被拒绝或按公开状态移除；启用功能的生产构建缺输入必须失败。验证页面图 / 大纲同版本、搜索能找到公开说明、私人标记不出现在任何输出。

```ts
const visible = loadPublicTrees(publicInput, [publishedPaper, unlistedPaper, draftPaper]);
assert.deepEqual([...visible.keys()], [publishedPaper.data.id]);
assert.throws(() => loadPublicTrees(missingSnapshotInput, [publishedPaper]));
```

- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-public.test.ts`，确认失败。**
- [ ] **Step 3: 接入构建生命周期。** Astro 构建只读取公开输入，build:done 在 Pagefind 执行前输出回执和 JSON；开发服务器用同一验证函数。`.paper-trees/`、studio 生成目录和实际 env 均忽略。关闭功能且无输入的本地构建保留原有能力，生产开启后不静默降级。
- [ ] **Step 4: 接入论文页。** 依据 entry.data.id 查图，在论文资料后、正文前显示；生成唯一的 `paper-analysis-tree` 锚点，合并到 MainGridLayout 与 ArticleContents 共用 headings，若正文已有同名锚点则生成稳定的不冲突 ID。大纲用递归 ol / li 或原生 details，保留全部公开文字；画布 `client:visible`，图形区域 data-pagefind-ignore，不重复索引，工具和编辑链接也不索引。
- [ ] **Step 4a: 接入作者入口。** 仅当 `PUBLIC_PAPER_TREE_STUDIO_ORIGIN` 指向已准备好的 HTTPS 作者服务时，为 Paper 页提供复用样式的“编辑解析树”，用服务端生成的 paperKey 进入对应工作区；无公开树也可以创建私人草稿。未配置时不显示链接，主站不获取作者会话或私人清单。
- [ ] **Step 5: 实现隔离测试构建。** `scripts/test-paper-trees.ts` 仿照现有 `scripts/test-authoring.ts` 的临时副本方式生成合成 Paper、unlisted、draft 与版本输入，构建及启动副本，不写源文章。测试 config 增加 public 项目及 env 指定副本 preview 命令；提供 `pnpm test:paper-trees` 入口。
- [ ] **Step 6: 运行 public unit 和 `pnpm test:paper-trees -- --project=public`。** 验证有图 / 无图 / 非 Paper、Pagefind、无 JS 大纲、手机、返回导航及反复 Swup 进入退出；不要用测试路由或测试文章污染正式站点。
- [ ] **Step 7: 提交 `feat: publish paper trees with searchable article outlines`。**

### Task 4: 独立作者服务与 GitHub 身份

**Files:** Create `studio/package.json`、`studio/astro.config.mjs`、`studio/tsconfig.json`、`studio/vercel.json`、`studio/src/layouts/StudioLayout.astro`、`studio/src/middleware.ts`、`studio/src/pages/api/[...path].ts`、`studio/src/server/config.ts`、`studio/src/server/auth.ts`、`studio/src/server/api.ts`、`scripts/paper-trees/catalog.ts`；Modify `pnpm-workspace.yaml`、`pnpm-lock.yaml`、根 `package.json`；Test `tests/unit/paper-tree-auth.test.ts`。

**Interfaces:**
- `PaperRef = {id:string; paperKey:string; slug:string; title:string; visibility:Visibility; contentKind:'note'|'collection'; hasBody:boolean}`；仅来自 schema 已验证的 type=paper。
- `PaperCatalog = {codeSha:string; papers:PaperRef[]}`；`buildPaperCatalog(contentRoot:string, codeSha:string):Promise<PaperCatalog>`。paperKey 为服务端对 id 的 SHA-256 十六进制摘要，客户端不指定文件名。
- 构建时生成 `studio/.generated/papers.json`，只打包到服务器；不得置入 public、客户端 import 或首页内联脚本。作者服务使用清单的 codeSha 发布；Task 9 防止其回退线上代码。
- `AuthorConfig = {appId:string; clientId:string; clientSecret:string; privateKey:string; installationId:string; ownerUserId:string; sessionSecret:string; origin:string; dataRepo:string; dataBranch:string; blogRepo:string; blogBranch:string}`；`readAuthorConfig():AuthorConfig` 映射 Task 11 的受限 env 并校验，repo 使用 owner/name，GitHub origin 固定，不允许请求参数覆盖。可在服务端测试传入配置，不在产品中提供绕过身份的开关。
- `AuthorSession = {userId:string; expiresAt:number; csrfToken:string}`；`signSession(session:AuthorSession, secret:string):string`、`readSession(request:Request, config:AuthorConfig):AuthorSession|null`、`requireAuthor(request:Request, config:AuthorConfig, write:boolean):AuthorSession`。
- `handleApi(request:Request, config?:AuthorConfig):Promise<Response>`，默认读服务端配置，先实现 GET `/api/auth/login`、GET `/api/auth/callback`、GET `/api/session`、POST `/api/logout`。写入统一使用 `X-CSRF-Token`；生产 issuer 使用 `AUTHOR_ORIGIN`；会话时长 7,200 秒，OAuth state 300 秒。

- [ ] **Step 1: 写失败测试。** 其他数字 ID、签名篡改、过期会话、缺 / 错 state、回调失败、缺 CSRF、跨源写入均被拒绝；失败响应无 token。验证匿名 session 只返回未登录，Cookie 属性与 no-store 正确；returnTo 仅接受工作区本地路径，外域及编码外域跳转被拒绝。测试 fetch 注入模拟 GitHub 返回，生产入口没有 auth bypass。
- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-auth.test.ts`，确认缺失行为导致失败。**
- [ ] **Step 3: 创建 workspace 子项目。** 目录 `studio`、包名 `@goongmly/paper-tree-studio`；Astro / Svelte 与主项目同版本，官方 `@astrojs/vercel@11.0.12` 先核验可安装后精确固定。`output:'server'`，Node 运行、不使用 ISR 或数据库会话；普通 Astro API route 调 handleApi。共享源文件在 repo 内 import，Vercel 配置允许构建读取 root 外的共享文件。[适配器说明](https://docs.astro.build/en/guides/integrations-guide/vercel/)
- [ ] **Step 4: 实现作者清单、配置和登录。** 清单复用 gray-matter、noteDataSchema 及 hasBody 判定；codeSha 从真实构建提交取得，不能由浏览器传入。OAuth 服务端换码，GET GitHub user 核对唯一数字 ID，随后丢弃用户 OAuth token。state 同时绑定经过白名单验证的 returnTo，登录后返回原论文编辑页或工作区首页。以 Node crypto 签会话，常数时间比较签名；logout 清 Cookie，密钥轮换失效所有会话。Cookie 不设置父域 Domain，生产使用 `__Host-paper-tree-session`；本地仅 loopback 显式开发配置允许非 Secure 测试 Cookie。
- [ ] **Step 5: 添加 `dev:studio`、`check:studio`、`build:studio` 根脚本，并运行它们及 auth 测试。** 脚本先生成绑定当前 codeSha 的服务端清单，dev 端口 4323；检查 Astro / TS，构建时客户端产物无私人标题、密钥或草稿。布局引入共享 CSS、variables.styl 和必要图标，初始化当前 themeColor.hue 及亮暗模式，不复用会加载音乐、搜索及全站内容的 MainGridLayout。
- [ ] **Step 6: 提交 `feat: add GitHub authenticated paper tree studio`。**

### Task 5: 私有 GitHub 草稿存储与冲突保护

**Files:** Create `studio/src/server/github-store.ts`；Modify `studio/src/server/api.ts`；Test `tests/unit/paper-tree-store.test.ts`。

**Interfaces:**
- `Versioned<T> = {value:T; blobSha:string}`；`GitHead = {sha:string; treeSha:string}`。
- 具体 `GitHubTreeStore` 构造器 `(config:AuthorConfig, fetchImpl?:typeof fetch)`：`getFile<T>(path:string, ref:string):Promise<Versioned<T>|null>`、`getHead():Promise<GitHead>`、`saveDraft(paper:PaperRef, draft:DraftTree, expectedBlobSha:string|null):Promise<Versioned<DraftTree>>`、`commitFiles(base:GitHead, files:Record<string,string>):Promise<{commitSha:string}>`、`dispatchPublish(jobId:string, dataSha:string, codeSha:string):Promise<void>`。
- Store 内部固定仓库 / 分支 / GitHub API origin，安装 token 使用 GitHub App JWT 换取；不暴露任意路径代理。`commitFiles` 一次创建 tree、单父 commit、非 force 更新 ref，不盲目重放冲突。
- GET `/api/papers`；GET / PUT `/api/draft?paperKey=...`。保存 body `{draft:unknown, expectedBlobSha:string|null}`，身份、清单、paperId 三方核对后调用 Store。

- [ ] **Step 1: 写失败测试。** 创建和更新使用正确 SHA；两标签页保存只有一个成功，另一个 409；GitHub 401 / 403 / 429 / 网络失败不返回成功，旧草稿保留。伪造 paperId、`../`、编码路径、未知 key、读他人账号草稿均拒绝；中文 ID 映射到安全摘要。模拟并发 ref 更新，原子提交不覆盖已提交内容。

```ts
assert.equal(saved.value.paperId, paper.id);
await assert.rejects(store.saveDraft(paper, newerDraft, staleSha), {code:'VERSION_CONFLICT'});
assert.equal(conflictingRequest.method, 'PATCH');
assert.equal(JSON.parse(conflictingRequest.body).force, false);
```

- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-store.test.ts`，确认失败。**
- [ ] **Step 3: 实现 Store 和草稿 API。** 请求、响应均限制大小；匿名先鉴权再访问存储；入口不信任 body 里的更新时间、路径或发布状态。写入用 expectedBlobSha，创建以 null 表示不存在，不能无条件覆盖。GitHub 错误映射稳定 code 和中文摘要，重试等待只处理明确未完成且可安全重试的请求。
- [ ] **Step 4: 重跑 store / auth 检查及 `pnpm check:studio`。** 同时验证 API no-store、未知路由 404、错误方法 405、缺配置 503，错误无私人文件内容或凭据。
- [ ] **Step 5: 提交 `feat: store private paper tree drafts with version checks`。**

### Task 6: 作者编辑、大纲操作、导入和保存状态

**Files:** Create `studio/src/pages/studio/paper-trees/index.astro`、`[paperKey].astro`、`studio/src/components/PaperTreeStudio.svelte`、`studio/src/client/api.ts`；Modify `playwright.paper-trees.config.ts`；Test `tests/e2e/paper-tree-editor.spec.ts`。

**Interfaces:**
- `getSession():Promise<{authenticated:false}|{authenticated:true; userId:string; csrfToken:string}>`、`getPapers():Promise<PaperCatalog>`、`getDraft(paperKey:string):Promise<Versioned<DraftTree>|null>`、`saveDraft(paperKey:string, draft:DraftTree, expectedBlobSha:string|null):Promise<Versioned<DraftTree>>`；调用 Task 4 / 5 的固定 API。
- `PaperTreeStudio` 使用 Task 2 的画布和 TreeCommand，不另实现树布局。编辑版本用递增 revision；开始保存时固定 revision 与内容，返回后只有版本未继续变化才能清除 dirty。
- Playwright 添加 studio 项目，baseURL `http://127.0.0.1:4323`，用 page.route 模拟 API 响应验证 UI；服务端鉴权由 auth / store 测试及 Task 11 真实 GitHub 登录验证，不把 UI mock 当成身份验证结果。

- [ ] **Step 1: 写失败测试。** 登录、选论文、空树 / 模板、选中、文字 / 说明 / 链接编辑、增删移动、复制、撤销重做、Ctrl/Cmd+S 和刷新读取可用。保存成功 / 失败 / 409 时标记正确；模拟延迟保存后再编辑，最新修改仍 dirty，旧响应不覆盖新内容。退出登录清除私人数据与画布。
- [ ] **Step 2: 运行 `pnpm exec playwright test --config playwright.paper-trees.config.ts --project=studio tests/e2e/paper-tree-editor.spec.ts`，确认失败。**
- [ ] **Step 3: 实现页面和编辑操作。** 原生 input / textarea / dialog 与共享 btn-plain、knowledge-action、toc-item；返回按钮直接复用 BackLink。删除子树明确列出影响并确认；手机提供同级 / 子节点 / 上移下移 / 改父节点等显式按钮，不只靠拖动。本阶段不自动保存每个键入。
- [ ] **Step 4: 实现版本化 JSON 导入导出和离开提醒。** 导入先按大小限制和 Task 1 校验，重生成 ID，替换内存需确认并另行保存；导出包含当前未保存内容但不含会话。离开有未保存修改时提供原生确认，409 提供导出备份及手动载入，不自动丢弃本地修改。
- [ ] **Step 5: 重跑编辑器检查和 `pnpm check:studio` / `pnpm build:studio`。** 390 / 1440px、亮暗主题、键盘可操作；独立服务与共享组件能一起构建，未认证页面没有私人数据。
- [ ] **Step 6: 提交 `feat: edit and save private paper analysis trees`。**

### Task 7: 发布事务、冻结版本与私有历史

**Files:** Create `studio/src/server/release.ts`；Modify `studio/src/server/api.ts`、`studio/src/client/api.ts`、`studio/src/components/PaperTreeStudio.svelte`；Test `tests/unit/paper-tree-release.test.ts`、`tests/e2e/paper-tree-publish.spec.ts`。

**Interfaces:**
- `JobState = 'queued'|'building'|'validating'|'deploying'|'published'|'failed'`；`ReleaseJob = {jobId:string; releaseId:string; codeSha:string; state:JobState; createdAt:string; mode:'tree'|'code'|'rollback'; deploymentId?:string; studioDeploymentId?:string; error?:{code:string; message:string}}`；快照及清单不可变，状态写入可以增加更新时间。
- `ReleaseControl = {schemaVersion:1; activeReleaseId:string|null; activeCodeSha:string; activeDeploymentId:string; activeStudioDeploymentId:string|null; activeJobId:string|null; baselineDeploymentId:string}`；首图前 activeReleaseId=null 表示空清单，首次作者服务部署前 activeStudioDeploymentId=null。
- `requestPublish(paperKey:string, draftSha:string):Promise<ReleaseJob>`、`requestRollback(releaseId:string):Promise<ReleaseJob>`、`getJob(jobId:string):Promise<ReleaseJob>`、`getHistory(cursor:string|null, limit:number=20):Promise<{items:ReleaseManifest[]; cursor:string|null}>`，仅返回作者有权限的数据。历史沿成功清单父链分页，limit 限制 1–20，不依赖 Contents 目录列表。
- API：POST `/api/publish` body `{paperKey,draftSha}`；GET `/api/jobs?jobId=...`；GET `/api/history?cursor=...`；POST `/api/rollback` body `{releaseId}`。cursor 只接受服务端返回的成功清单 ID；成功创建返回 202，有活动发布返回 409 并带当前 jobId。

- [ ] **Step 1: 写失败测试。** 保存不改公开指针，发布冻结精确 blob SHA，旧草稿 SHA 返回 409；两次并发申请只有一个活动作业；从最近成功清单生成候选，只替换当前论文，不携带失败快照。回退只接受历史成功版本且保留当前草稿。过期作者清单与不允许的源码版本不得触发工作流。
- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-release.test.ts`，确认失败。**
- [ ] **Step 3: 实现原子事务。** 一次非 force Git 提交写快照、清单、queued 作业及 control.activeJobId，数据 SHA 使用返回 commitSha，不试图在同一提交中存储它自己的 SHA。以最新成功指针为唯一默认基线，快照 ID / jobId / releaseId 使用服务端 UUID。用户输入不能选择代码分支、数据 SHA、部署项目或 Git ref。
- [ ] **Step 4: 实现触发失败分类。** 明确未接受的失败才可安全标 failed 并清锁；连接中断或 5xx 等结果不明时保留 queued，按 jobId 查询工作流再恢复，不能按浏览器轮询超时解锁。私有历史只展示已成功版本与当前作业，不把所有候选作为可公开回退目标。
- [ ] **Step 5: 接入预览、发布和历史 UI。** 预览展示精确公开投影并提示标题与说明均将公开；发布先等待当前编辑版本保存成功，再提交 draftSha。请求期间禁用重复按钮，保存与发布状态分开，轮询可关闭后恢复；发布期间继续编辑只影响新草稿。回退确认范围，沿用既有交互。
- [ ] **Step 6: 重跑 release / store 测试及 studio 的 publish 项目。** 断言保存后继续编辑、重复点击、202 后关闭页面、失败后再次发布、回退及未登录全部符合设计。
- [ ] **Step 7: 提交 `feat: create versioned manual paper tree publish jobs`。**

### Task 8: 私有发布工作流、受保护候选与成功回执

**Files:** Create `scripts/paper-trees/prepare.ts`、`publish.ts`、`reconcile.ts`、`ops/paper-trees/publish.yml`；Modify `scripts/generate-vercel-config.mjs`、`vercel.json`、根 `package.json`；Test `tests/unit/paper-tree-workflow.test.ts`、既有 `tests/unit/vercel-config.test.ts`。

**Interfaces:**
- `prepareRelease(job:ReleaseJob, dataSha:string, outDir:string):Promise<PublicTreeInput>`；只读取固定清单及白名单快照，输入必须与私有作业绑定。
- `runPublish(jobId:string, dataSha:string):Promise<void>`；读取固定源码 SHA，调用 Task 3 构建，检查、部署、promote、核验，再写成功指针。
- `reconcileRelease(jobId:string):Promise<ReleaseJob>`；核对工作流运行、部署项目 / ID、正式域名回执以及作业目标，处理结果不明；不能用普通 HTTP 200 当成目标版本成功。
- 公开 `PublicationReceipt = {schemaVersion:1; releaseId:string; codeSha:string; publishedAt:string}`；其 JSON 与部署元数据一起核验，里面没有私人仓库或凭据。

- [ ] **Step 1: 写失败注入测试。** 构建、验收、上传或 promote 失败不改成功指针；promote 后私有写入失败由回执恢复。错误 releaseId、codeSha、部署项目、缓存旧回执均拒绝；匿名可读候选或失败部署必须停止发布。重复工作流只服务同一个作业，不能再次切换正式版本。
- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-workflow.test.ts tests/unit/vercel-config.test.ts`，确认新能力失败、旧映射仍通过。**
- [ ] **Step 3: 实现私有 Actions 模板。** 仅 workflow_dispatch，输入 job_id / data_sha / code_sha 通过 Store 和作业记录验证；run-name 含唯一 jobId，固定源码 checkout、Git LFS、Node / pnpm，concurrency 不取消运行中的作业。私有仓库不 checkout 全部 drafts，公共附件与缓存仅包含明确允许的构建内容，日志不打印节点全文或 env。
- [ ] **Step 4: 实现公开输入、构建和部署。** 用候选清单及其快照生成 `.paper-trees/public-input/`；历史保留仅沿最新成功清单父链取成功快照并去重，不能读失败作业作为历史输入，最后按源码当前公开状态过滤。Vercel CLI 沿用项目已用的精确版本 `62.2.0`，实施时验证 `--help` 支持所需选项；生产 pull → `vercel build --prod` 调用完整 pnpm build → 检查产物 → `vercel deploy --prebuilt --prod --skip-domain`，验证完成才 promote。使用原生平台命令，不自己写资源上传协议。[build](https://vercel.com/docs/cli/build)、[deploy](https://vercel.com/docs/cli/deploy)
- [ ] **Step 5: 保护候选并核验正式结果。** 部署前检查平台保护配置，部署后匿名 HTML / 图 JSON 必须被拒绝；受限自动化凭据只用于验收。回执 no-store；快照内容不可变。保留仍公开论文的已成功快照引用，失败候选不进入归档；文章不再公开时移除其所有公开图。保留过往 HTML 所需的版本数据，并用文章中同版本数据 / 完整大纲保证浏览回退，不能混入新图。
- [ ] **Step 6: 修改生成配置而非只手改 vercel.json。** 为回执增加 Cache-Control:no-store，为不可变快照增加合适缓存；保持现有全部旧页面 / 图片跳转及公开域名。执行生成命令后重跑 vercel-config 回归。恢复操作使用真实部署 ID、作业 ID和回执；未确定失败不清发布资格。
- [ ] **Step 7: 重跑 workflow / release / 配置检查，提交 `feat: publish paper trees through protected versioned deployments`。** 此时仍用模拟提供方验收，不宣称真实账号已接通。

### Task 9: 普通代码部署、作者清单更新与回退协调

**Files:** Modify `scripts/paper-trees/publish.ts`、`prepare.ts`、`reconcile.ts`、`studio/src/server/release.ts`；Create `scripts/paper-trees/create-code-job.ts`；Test `tests/unit/paper-tree-code-release.test.ts`。

**Interfaces:**
- `createCodeRelease(codeSha:string):Promise<ReleaseJob>` 是受限运维 CLI，不添加在线“编辑博客源码”功能；调用同一个 GitHubTreeStore 与全站发布资格。
- tree / rollback 作业的源码是作者清单绑定的 SHA，必须与 control.activeCodeSha 相同；不相同时返回 `SOURCE_VERSION_MISMATCH`，提示更新作者服务或完成匹配的代码发布，不能回退新版站点。
- mode=code 保留最后成功图清单，固定允许源分支中的提交，重新生成清单及作者服务端目录。普通代码发布同步更新作者服务到相同源码 / 目录版本；协调过程失败时禁止树发布，保留可恢复部署，明确哪一个服务已更新。

- [ ] **Step 1: 写失败测试。** 新代码保留原图及搜索，改 title / slug 不失关联，改 draft / unlisted 从当前图、成功历史图和搜索移除。旧 Studio 请求不能部署旧代码；普通代码发布与树发布只能一个活动。两个服务切换只成功一个时状态可恢复，不误清锁。
- [ ] **Step 2: 运行 `node --import tsx --test tests/unit/paper-tree-code-release.test.ts`，确认失败。**
- [ ] **Step 3: 实现 code 模式。** CLI 只能选明确允许源分支的提交，拒绝其他仓库及任意 ref；固定最后成功图输入，输出当前公开关联，执行同一构建验证与保护流程。先验证两边候选再切换，记录每个部署 ID；更新公开回执与 control.activeCodeSha 后允许匹配版本的树发布。
- [ ] **Step 4: 完善恢复和回退。** 历史图回退使用当前有效源码，过滤现有非公开文章；完整 Vercel 部署回退是受限运维行为，明确同时回退正文 / 资源，并同步 control 与 Studio 版本。生产缺图输入始终 fail closed；Vercel Git 默认分支设置不变，普通手动发布转用 create-code-job。
- [ ] **Step 5: 重跑 code-release / workflow / release 检查，提交 `fix: preserve paper trees across code releases and rollback`。**

### Task 10: 全链路回归、隐私检查与规模验收

**Files:** Modify `scripts/test-paper-trees.ts`、`playwright.paper-trees.config.ts`、`.github/workflows/ci.yml`；Create `tests/integration/paper-tree-output.test.ts`、`docs/paper-trees/ACCEPTANCE.md`；Extend 本计划各项既有检查。

**Interfaces:**
- `pnpm test:paper-trees` 统一运行隔离产物检查和 canvas / public / studio 的相关项目；支持 `-- --project=...` 筛选，并在 finally 清理测试副本及进程。
- 集成检查读取复制工作区的真实 dist、Pagefind 与作者客户端产物，不只搜索源字符串。公开 CI 使用合成数据及 mocked provider；不提供私人仓库或发布凭据给 PR。

- [ ] **Step 1: 写未满足设计时会失败的集成断言。** 私人草稿及失败快照放入不同独特标记，断言公开 HTML、JSON、JS、Pagefind、feeds、sitemap 和附件中都不存在；公开说明能全文检索，图形文本不重复索引。文件列表也不能含 drafts、jobs、control 或私人作者清单。
- [ ] **Step 2: 执行 `node --import tsx --test tests/integration/paper-tree-output.test.ts`，验证断言确实检查产物；临时向副本公开产物注入标记应失败，移除后通过。** 不改真实作者数据做泄露测试。
- [ ] **Step 3: 扩展浏览器覆盖。** 390 / 1440px、亮暗、无 JS、画布失败、全屏退出、焦点、链接、Swup 多次切页及重复监听；500 篇合成论文清单不把全站 JSON 发给单页。100 / 500 节点操作实测，记录包体积、初始化及展开耗时、峰值页面溢出；没有未测量的性能承诺。
- [ ] **Step 4: 运行新功能检查和现有适用检查。** `pnpm test`、`pnpm lint:check`、`pnpm check`、`pnpm type-check`、`pnpm check:studio`、`pnpm build:studio`、`pnpm build`、`pnpm verify:site`、`pnpm test:e2e`、`pnpm test:authoring`、`pnpm test:paper-trees`、`git diff --check`。保留已有导航、搜索、归档、课程、下标 / 分式 / 图片回归，记录既有告警与新增错误的区别。
- [ ] **Step 5: 把 Studio 检查及合成功能测试加入 CI，写真实验收结果到 ACCEPTANCE.md，并提交 `test: verify paper tree privacy editing and publication`。** 不因测试绿色就把尚未配置的真实 OAuth / 私有 Actions 标为通过。

### Task 11: 真实配置、作者试用、首次上线与交接

**Files:** Create `docs/paper-trees/SETUP.md`；Update `docs/paper-trees/ACCEPTANCE.md`、`docs/migration/DEPLOYMENT.md`；私有仓库初始化文件按设计第 5 节；公开源码不保存实际凭据。

**Interfaces:**
- 配置项目的名称如下，值只写受限平台设置。`AUTHOR_GITHUB_USER_ID` 为允许的数字 ID；`AUTHOR_ORIGIN` 推荐 `https://studio.blessingworld.cn`；博客正式 origin 保持现有值。
- 作者服务：`GITHUB_APP_ID`、`GITHUB_APP_CLIENT_ID`、`GITHUB_APP_CLIENT_SECRET`、`GITHUB_APP_PRIVATE_KEY`、`GITHUB_APP_INSTALLATION_ID`、`PAPER_TREE_DATA_REPO`、`PAPER_TREE_DATA_BRANCH`、`AUTHOR_SESSION_SECRET`、`AUTHOR_GITHUB_USER_ID`、`AUTHOR_ORIGIN`、`BLOG_SOURCE_REPO`、`BLOG_SOURCE_BRANCH`。source SHA 来自实际构建清单。
- 私有发布工作流：所需数据读写 / 状态权限、博客源码只读凭据（仅私有源码时）、`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`BLOG_VERCEL_PROJECT_ID`、`STUDIO_VERCEL_PROJECT_ID`、`VERCEL_AUTOMATION_BYPASS_SECRET`。公开博客只有功能开关 / 已准备的公开输入和 `PUBLIC_PAPER_TREE_STUDIO_ORIGIN`，无写入私钥。
- 根部署路径与 legacy 路由不变；作者 Vercel 项目 Root Directory=`studio`，启用共享 root 外源码的构建能力，runtime Node 22.x。App 在所需仓库安装，数据 Contents / Actions 读写，普通运行无工作流编辑和仓库管理权限。

- [ ] **Step 1: 写 SETUP.md 的可执行操作顺序和检查。** 包含 App 注册与 callback、数字 ID 核对、私有仓库、发布模板安装、秘密位置、初始化空成功清单和当前正式基线、两个项目、候选保护与域名。实际作者入口未准备好前，不在公开文章添加不可用编辑链接。
- [ ] **Step 2: 完成 Native 的独立分支审查并处理发现的问题，再重复受影响检查。** 重点审查 private / public 边界、源码与清单版本、Git 原子性、访问保护、结果不明及回退；保留审查结论和证据。
- [ ] **Step 3: 在代码、模拟检查和配置步骤可审阅后接入真实账号。** 注册 GitHub App、安装私有工作流并填受限 secrets，创建 Studio 项目与入口；需要本人首次 OAuth 登录或平台无法由工具完成的输入时，在该步骤请求协作，不能把虚构凭据写入配置。不要替换 main 工作区或改变既有 Git 生产分支。
- [ ] **Step 4: 用一篇真实 Paper 做作者验收。** 用户本人登录 → 完整模板 → 编辑 / 复制 / 保存 → 退出重新登录并读取草稿。另一账号及匿名读取私人 API 被拒绝；发布预览版本准确，保存和失败候选均不会让匿名读取到新内容。
- [ ] **Step 5: 完成受保护候选及首次上线核验。** 记录旧正式部署 ID；首次用 code 作业发布带空成功图清单的功能代码，使主站和作者服务版本一致，再发布真实论文的树。每个作业检查候选保护、生产 metadata、树 / 大纲版本、公开资源及代表页面，按执行时已有的上线授权 promote，核验回执并同步指针。不得重复申请已授予的授权；若确实缺少最终切换授权，先提供已验收的具体候选和结果再请求。
- [ ] **Step 6: 验证发布 / 故障 / 回退闭环。** 新草稿保存时读者继续旧版；一次安全的候选失败仍保留旧版；再发布另一论文不会带入失败图。以历史成功清单回退，草稿不变；普通代码发布保留树并更新匹配作者清单，暂存失败不改公开域名。
- [ ] **Step 7: 提交 SETUP / ACCEPTANCE / DEPLOYMENT 记录，按分支收尾技能完成集成。** 报告真实功能地址、部署版本、检查结果和实际未完成配置；撤销一次性验收凭据，保留运行发布作业所需的受限凭据。

## 计划自查与交接

| 设计要求 | 实施任务 |
| --- | --- |
| 截图完整模板、自由结构、版本化导入和复制 | 1、2、6 |
| 浏览折叠、详情、Markdown / LaTeX、共享风格 | 2、3、6 |
| 静态大纲、Pagefind、无脚本、手机、Swup | 2、3、10 |
| 稳定论文 ID、服务器清单、非公开处理 | 1、3、4、5、9 |
| GitHub 单作者、Cookie / CSRF、私人读写 | 4、5、10、11 |
| Git 冲突、原子快照、单作业、失败基线隔离 | 5、7、8、9 |
| 手动发布、受保护候选、回执、回退与代码部署 | 7、8、9、11 |
| 500+ 论文、单页数据、规模与性能测量 | 3、10 |
| 配置、真实平台验证、恢复和部署交接 | 8、9、11 |

书面设计已经用户确认；本计划的任务分解、接口和配置交接仍需用户审阅。确认计划后按 Native 逐项实施，本轮不安装依赖、不创建云资源、不修改产品代码、不部署。
