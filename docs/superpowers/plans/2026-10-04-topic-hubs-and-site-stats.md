# Goongmly 专题聚合与站点统计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用四个专题聚合入口、随页面更新的主题导航和真实站点统计，让 500+ 篇科研记录仍能按课程或研究方向发现、连续阅读。

**Architecture:** 保留 Astro 静态内容集合和 Firefly 页面框架。在服务端统一公开判断、集合分组与统计，页面复用聚合结果；Swup 只更新专题上下文，音乐和全站统计保持稳定实例。Pagefind 继续索引唯一公开正文。

**Tech Stack:** 当前已安装的 Firefly 6.16.8、Astro 7.3.2、TypeScript、Tailwind、Svelte、Swup、Pagefind、Markdown/MDX、reading-time；Node 22.23.0、pnpm 11.22.0；Node test runner 与 Playwright。

**Spec:** [已确认的专题聚合、主题导航与站点统计设计](../specs/2026-10-04-topic-hubs-and-site-stats-design.md)。实施者先读规格，再读本计划。

**Execution:** 延续用户此前选择的 **Native**，由当前实现者逐项执行；完成后按执行技能进行整体审查。本计划等待用户审阅，当前没有应用代码改动。

## Global Constraints

- 取消 Notes 顶层入口，保留 Courses、Papers、Research、Projects 四个入口；站点名称仍为 Goongmly Notes。
- 工作区仍为 `.worktrees/astro-firefly`，分支为 `feat/astro-firefly`；不包含部署、合并或修改原 main 工作区。
- 保留 `/notes/[slug]/`、`/projects/[slug]/`、`/notes/` 和现有分页、旧 `/blog/...`、作者兼容页、原图地址与旧标题锚点。
- 公开范围：文章须非空、`contentKind=note`、`visibility=published`；项目须非空且非 draft；介绍、draft、unlisted、空正文不进入发现入口、统计或搜索。
- 主题使用 `src/data/catalog.ts` 的受控 ID；不根据标题或文件路径猜分类，不批量修改正文、原图、主题、日期或业务 ID。
- 列表每页 **25** 项；配置中的零篇课程和已有 Research 空用途页仍有效，未知集合与越界页为 404。
- 运行时长从 **2025-01-01** 起算，采用 **Asia/Shanghai** 的自然日，建站当天为第 0 天。
- 分类统计为公开内容实际使用的受控主题 ID 去重；多主题文章只汇总一次；最后活动只取真实发布／更新日期。
- 保留蓝色主题、自定义背景媒体、装饰控制、已修复的 KaTeX 与图片居中；不新增渐变、玻璃效果或装饰动画。
- 不引入 CMS、数据库、搜索后端、UI 框架或新的依赖；客户端不下载整站正文计算指标。

## Review Focus

1. 同一正文出现在多个主题，或项目与文章同名：成员数可重叠，全站文章与字数不重复、不跨集合覆盖（Task 1）。
2. 删除仍被引用的主题、缺少课程引用：错误指出源条目；无主题项目仍可发现，公开改为 draft 后开发预览及时移除发现入口与计数（Tasks 1、2、5）。
3. 初始打开论文页后连续切换十次再返回课程文章：主题、讲次、目录均正确，音乐节点及播放位置保留，不增加监听器（Task 4）。
4. 浏览器时区不同、上海跨零点、未来或未知活动日期、禁用 JavaScript：日期口径一致，保留实际日期和构建数值（Task 3）。
5. 320px、长中文标题、课程超过 25 讲、主题集合误判成项目详情：完整导航可达、无横向溢出、分页自有 canonical、目录只服务正文（Tasks 2、4、5）。

## 文件与职责

| 文件 | 职责／归属 |
| --- | --- |
| `src/content/schema.ts`、`src/content.config.ts`、`src/utils/note-model.ts`、`src/utils/content-utils.ts` | 项目主题／更新日期扩展、公开边界和课程校验；Task 1 |
| 新建 `src/utils/knowledge-model.ts`、`src/utils/knowledge-index.ts` | 纯分组／统计模型与 Astro 加载适配；Task 1 |
| 新建 `src/components/knowledge/TopicGroups.astro`、`CollectionPage.astro`、`CollectionPagination.astro` | 专题集合入口、混合正文列表、静态分页；Task 2 |
| 现有四个专题索引、课程详情、Research 用途页、全站主题页、Notes 兼容总览 | 改为使用共享集合和分页；Task 2 |
| 新建 `src/pages/[hub]/topics/[id]/[...page].astro`、`src/pages/courses/[id]/page/[page].astro`、`src/pages/research/[type]/page/[page].astro`、`src/pages/topics/[id]/page/[page].astro` | 三个专题内主题详情及各集合后续页；Task 2 |
| `src/components/knowledge/NoteList.astro`、`src/components/knowledge/CollectionIntro.astro`、`src/components/layout/PostCard.astro` | 真实主题元信息、可展开介绍；Task 2 |
| 新建 `src/utils/site-stats.ts`，修改 `src/components/widget/SiteStats.astro`、`src/config/sidebarConfig.ts` | 日期纯函数、SSR 指标与轻量客户端更新时间，先挂载宽屏统计；Task 3 |
| 新建 `src/components/knowledge/TopicNav.astro`、`KnowledgeContext.astro` | 当前专题导航与课程讲次的共享展示；Task 4 |
| `src/layouts/KnowledgeLayout.astro`、`MainGridLayout.astro`、`src/components/layout/SidebarColumn.astro`、`SideBar.astro`、`src/components/knowledge/CourseNav.astro` | 上下文传递、Swup 动态区、稳定音乐与统计；Task 4 |
| `src/config/sidebarConfig.ts`、`src/utils/responsive-utils.ts`、`src/utils/grid-layout-utils.ts`、`src/utils/url-utils.ts`、`src/styles/layout-base.css`、`src/styles/main.css` | 列几何、详情判定、响应式位置；Task 4 |
| `src/config/navBarConfig.ts`、`src/pages/index.astro`、`src/pages/search.astro`、`src/components/pages/AdvancedSearch.svelte`、两种正文页、`src/pages/sitemap.xml.ts` | 导航收口、项目搜索、SEO 与兼容；Task 5 |
| 现有单元／浏览器／authoring 检查，新建必要的专题与统计行为检查 | 验证非平凡分组、日期、切页、分页、公开范围；Tasks 1–6 |
| `scripts/benchmark-content.ts`、`README.md`、新建 `docs/migration/TOPIC-HUBS-ACCEPTANCE.md` | 同规模基线、500 篇验收、维护说明；Task 6 |

以上路径相对当前 worktree。纯模型不运行 `astro:content`，便于 Node 测试；Astro 适配层不维护另一套归属／计数规则。

## 运行约定与改造前基线

在 worktree 中运行命令，先确认 `node --version` 为 `v22.23.0`、`pnpm --version` 为 `11.22.0`。当前机器可使用 `/tmp/node-v22.23.0-darwin-arm64/bin/node` 与 `/tmp/astro-firefly-tools/bin/pnpm`，不改系统安装或原工作区工具配置。

应用基线为 `efe01f2`，本次设计文档提交为 `b34e393`。开始应用改动前记录 HEAD、干净状态、现有验证结果，并运行一次原版 `scripts/benchmark-content.ts`；它只在新建的临时目录生成 500 篇样本。把输出日志与报告保留到验收时比较，不在真实内容库生成样本，不重复导入旧 Next 内容。

```bash
node --import tsx scripts/benchmark-content.ts --count 500 --output-dir /tmp/goongmly-hubs-before-20261004
```

该命令的目录必须不存在；已存在时换一个新目录，不删除或覆盖已有结果。构建与浏览器验证保持 preview/noindex。长命令分段等待并继续报告进展。

---

### Task 1：统一公开内容、专题分组和统计输入

**Files:** Create `src/utils/knowledge-model.ts`、`src/utils/knowledge-index.ts`、`tests/fixtures/knowledge.ts`、`tests/unit/knowledge-model.test.ts`；Modify `src/content/schema.ts`、`src/content.config.ts`、`src/utils/note-model.ts`、`src/utils/content-utils.ts`、`tests/unit/note-model.test.ts`。读取现有 `src/plugins/remark-reading-time.mjs`，直接复用其输出，不重写字数算法。

**Interfaces:** 在 `knowledge-model.ts` 导出以下类型与函数；`ProjectData`／`projectDataSchema` 与 `PostData` 一同从 `src/content/schema.ts` 导出，保持现有项目字段。

```ts
type HubId = 'courses' | 'papers' | 'research' | 'projects';
type PostInput = NoteRecord & { pinned: boolean; words: number };
type ProjectInput = { entryId: string; url: string; filePath?: string; hasBody: boolean; data: ProjectData; words: number };
type KnowledgeItem = { kind: 'post'; key: string; url: string; post: PostInput } | { kind: 'project'; key: string; url: string; project: ProjectInput };
type CollectionGroup = { id: string; title: string; description: string; url: string; items: KnowledgeItem[] };
type HubGroup = CollectionGroup & { groups: CollectionGroup[] };
type SiteStatsData = { articleCount: number; categoryCount: number; tagCount: number; totalWords: number; lastActivityISO: string | null };
type KnowledgeIndex = { publicItems: KnowledgeItem[]; hubs: Record<HubId, HubGroup>; lists: Record<string, CollectionGroup>; stats: SiteStatsData };
buildKnowledgeIndex(input: { posts: readonly PostInput[]; projects: readonly ProjectInput[] }, catalog: Catalog): KnowledgeIndex;
isPublicProject(project: Pick<ProjectInput, 'data' | 'hasBody'>): boolean;
// knowledge-index.ts，唯一的 Astro 内容加载入口：
getKnowledgeIndex(): Promise<KnowledgeIndex>;
```

`lists` 以带尾斜杠的集合地址为键，包括课程、专题内主题、Research 用途、跨专题主题和 `/notes/` 兼容总览。`KnowledgeItem` 只含元数据、正文是否存在和字数，没有正文文本或组件。

- [ ] **Step 1：完成改造前基线。** 核对分支／状态，运行上方 500 篇基线命令并记录报告路径。之后写测试，不在此阶段先改应用。
- [ ] **Step 2：写分组与边界失败测试。** fixture 导出 `makePost(id: string, data?: Partial<NoteData>, hasBody?: boolean, words?: number): PostInput`，复用现有 `makeNote` 并默认 `entryId=id`、`data.id=id`、`data.slug=id`、`pinned=false`、`words=4`；`makeProject(id: string, data?: Partial<ProjectData>, hasBody?: boolean, words?: number): ProjectInput` 用 `projectDataSchema` 填齐默认元数据，默认公开非空、`entryId=id`、`/projects/<id>/`、`words=4`。核心断言如下，其他断言放在同一行为测试文件中：

```ts
const index = buildKnowledgeIndex({ posts: [makePost('same', {type:'paper', topics:['robotics','3d-vision']})], projects: [makeProject('same', {topics:['robotics']})] }, {courses, topics});
assert.equal(index.stats.articleCount, 2);
assert.equal(index.stats.totalWords, 8);
assert.equal(index.stats.categoryCount, 2);
assert.equal(index.lists['/papers/topics/robotics/'].items.length, 1);
assert.equal(index.lists['/papers/topics/3d-vision/'].items.length, 1);
assert.equal(index.hubs.courses.groups.length, courses.length);
assert.throws(() => buildKnowledgeIndex({posts:[makePost('bad', {type:'course', course:undefined})], projects:[]}, {courses,topics}), /bad/);
assert.throws(() => buildKnowledgeIndex({posts:[], projects:[makeProject('bad-project', {topics:['missing']})]}, {courses,topics}), /bad-project/);
```

同时断言 draft、unlisted、介绍、空正文不计数；重复 topic／空标签不增量；未知日期排后、置顶优先；课程沿用讲次顺序；项目 `order=0` 有效。无主题论文／项目进入各自 `uncategorized`，该集合不增加分类数；目录禁用保留 ID `uncategorized`。通用 `note` 只出现在兼容总览／全站主题及全局公开内容中。另从 `readCurrentManifest('src/content/posts')` 构造真实 PostInput（此计数检查统一 `words=0`、`pinned=false`），断言 44 篇、31／12／1／0、9 主题、21 标签；字数由独立 AST 检查验证。
- [ ] **Step 3：确认失败。** 运行 `node --import tsx --test tests/unit/knowledge-model.test.ts tests/unit/note-model.test.ts`；新测试因缺少模型或新增校验失败，保留失败原因。
- [ ] **Step 4：实现纯模型与项目 schema。** 项目新增 `topics: string[]` 默认 `[]`、`updated?: Date`；既有 `published` 继续使用 Date schema。`assertCatalog` 增加公开课程正文必须有合法 course 引用，保留已有未知引用校验。`buildKnowledgeIndex` 用文章稳定 `data.id` 与项目既有 URL 加集合命名空间；复用公开／日期／课程排序函数，项目沿用现有排序。主题按目录顺序，三个主题入口不生成空组，课程及现有 Research 用途空组保留；全站主题页保留已配置入口并容纳公开项目。
- [ ] **Step 5：实现 Astro 适配。** `getKnowledgeIndex` 加载两集合，先校验并筛选，再从 `render(entry).remarkPluginFrontmatter.words` 读取公开正文的字数，交给纯模型。每篇只汇总一次；缺少有效字数时明确报错到条目，不静默记零。生产构建复用一个 Promise；开发模式重新读取／聚合，避免跨 HMR 缓存旧结果；拒绝的构建 Promise 不伪装成功。`getSortedProjects` 改为在 dev/prod 均应用同一公开、非空边界；调用方不再发布 draft 项目。
- [ ] **Step 6：验证并提交。** 上述单元通过，运行 `pnpm check`、`pnpm type-check` 确认类型接口；用真实内容核对 44 篇、31／12／1／0、9 主题、21 标签。提交本任务显式文件：`feat: unify public knowledge hubs and statistics`。

### Task 2：四个专题聚合页与可直接访问的静态分页

**Files:** Create 文件表中的 `TopicGroups.astro`、`CollectionPage.astro`、`CollectionPagination.astro` 和四个分页／主题路由文件、`tests/unit/knowledge-pagination.test.ts`、`tests/e2e/topic-hubs.spec.ts`；Modify `src/utils/knowledge-model.ts`、`src/components/knowledge/NoteList.astro`、`CollectionIntro.astro`、`src/components/layout/PostCard.astro`、`src/styles/main.css`、`src/pages/courses/index.astro`、`src/pages/courses/[id].astro`、`src/pages/papers/index.astro`、`src/pages/research/index.astro`、`src/pages/research/[type].astro`、`src/pages/projects/index.astro`、`src/pages/topics/index.astro`、`src/pages/topics/[id].astro`、`src/pages/notes/index.astro`、`src/pages/notes/page/[page].astro`、`tests/e2e/navigation.spec.ts`。

**Interfaces:** 消费 Task 1 的 index／groups。在纯模型追加 `CollectionRoute = {url:string; group:CollectionGroup; page:number; items:KnowledgeItem[]; totalPages:number}`，以及 `collectionPageUrl(baseUrl:string,page:number):string`、`getCollectionPage(group:CollectionGroup,page:number):CollectionRoute`、`buildCollectionRoutes(index:KnowledgeIndex):CollectionRoute[]`。`TopicGroups` props `{groups:CollectionGroup[]}`；`CollectionPage` props `{route:CollectionRoute; backUrl:string; backLabel:string}`；`CollectionPagination` props `{baseUrl:string;page:number;totalPages:number}`。`NoteList` props 扩展为 `{notes:NoteSummary[];hub?:HubId}`，全站列表不传 hub；ProjectCard 沿用现有 props。

- [ ] **Step 1：写分页与页面失败测试。** 单元覆盖 0、25、26、50、51 条，0 条仅在已登记的合法集合保留第一页；非法 0／负数／小数／NaN／越界页抛 `RangeError`。使用 26 条公开课程和一个多主题论文 fixture 验证：

```ts
const group = {id:'fixture', title:'Fixture', description:'', url:'/courses/operating-systems/', items:Array.from({length:26}, (_, i) => ({kind:'post' as const,key:`posts:${i}`,url:`/notes/lecture-${i}/`,post:makePost(`lecture-${i}`,{type:'course',course:{id:'operating-systems',order:i}})}))};
assert.equal(getCollectionPage(group, 1).items.length, 25);
assert.equal(getCollectionPage(group, 2).items.length, 1);
assert.equal(getCollectionPage(group, 2).url, '/courses/operating-systems/page/2/');
assert.equal(collectionPageUrl(group.url, 1), group.url);
assert.throws(() => getCollectionPage(group, 3), RangeError);
```

浏览器检查 Papers／Research 索引显示主题名、简介、真实篇数和可点击整行；主题页成员属于当前用途；未知主题 404；零篇课程和空 Projects 显示真实空状态。修改原测试对 `.collection-list` 的“有项目就有项目卡”假设为新专题入口／空状态行为，不删除空状态断言。
- [ ] **Step 2：确认失败。** 运行 `node --import tsx --test tests/unit/knowledge-pagination.test.ts`，以及基线 preview 上 `pnpm exec playwright test tests/e2e/topic-hubs.spec.ts`；分别应因缺少分页接口／专题路由而失败。
- [ ] **Step 3：实现共享集合页面。** 所有列表从 `index.lists` 与同一分页函数取数据，`CollectionPage` 显示返回入口、标题／说明／篇数、当前页正文卡和前后页链接。`TopicGroups` 每项只放一个主链接，包含完整标题、简介、数量，不嵌套交互链接。长介绍在 `CollectionIntro` 使用原生 `details/summary`，继续先判断公开可见性。
- [ ] **Step 4：接入路由。** `/[hub]/topics/[id]/[...page]` 仅生成 papers、research、projects；rest 参数第一页为 `undefined`，后续为 `page/2` 等，生成真实成员／真实分页。现有课程、Research 用途、全站主题、Notes 首页保持路径；新增后续页只从登记集合生成。先用 build 验证动态层级没有吞掉 `/research/logs/` 或既有项目正文。
- [ ] **Step 5：修正卡片主题元信息。** `NoteList` 展示真实课程、用途和受控主题链接；为 PostCard 增加可选命名 slot `metadata`，默认仍用原 PostMeta，NoteList 提供该 slot 替代固定 `category=null` 的“未分类”。主题链接按当前专题进入对应主题页，全站集合／通用 note 进入 `/topics/[id]/`。不将主题文字硬塞进旧 category URL。
- [ ] **Step 6：验证并提交。** 单元通过；`pnpm build` 后专题浏览器检查通过。检查课程首／后页讲次连续、未知页 404、公开列表至多 25 项，现有 `/notes/` 25＋19 项仍有效。提交：`feat: organize knowledge collections as paginated topic hubs`。

### Task 3：真实的六项站点统计与日期更新

**Files:** Create `src/utils/site-stats.ts`、`tests/unit/site-stats.test.ts`、`tests/e2e/site-stats.spec.ts`；Modify `src/components/widget/SiteStats.astro`、`src/config/sidebarConfig.ts`。本任务先挂载并验证宽屏统计；窄屏位置由 Task 4 改造，不复制统计到移动端。

**Interfaces:** 消费 `KnowledgeIndex.stats`。日期工具导出 `getStatDates(startDay:string,lastActivityISO:string|null,now?:Date): {runningDays:number;lastActivityDay:string|null;state:'missing'|'past'|'today'|'future';daysSinceActivity:number|null}`。`SiteStats` 保留现有 `class/style/widgetConfig` props，追加可选 `stats:SiteStatsData`；没有 props 时读取共享 index。

- [ ] **Step 1：写日期失败测试。** 上海日期由 `Intl.DateTimeFormat` 指定时区，测试固定时刻，避免依赖测试机器时区：

```ts
assert.equal(getStatDates('2025-01-01', null, new Date('2026-10-03T16:00:00Z')).runningDays, 641);
assert.equal(getStatDates('2025-01-01', null, new Date('2026-10-03T15:59:59Z')).runningDays, 640);
assert.equal(getStatDates('2025-01-01', null, new Date('2025-01-01T00:00:00Z')).runningDays, 0);
assert.equal(getStatDates('2025-01-01', null, new Date('2024-12-31T00:00:00Z')).runningDays, 0);
assert.equal(getStatDates('2025-01-01', null).state, 'missing');
assert.equal(getStatDates('2025-01-01', '2026-10-05T00:00:00Z', new Date('2026-10-04T00:00:00Z')).state, 'future');
```

另覆盖更新老文章成为最后活动、项目更新日期。无效 startDay／now 抛 `RangeError`，无法解析的活动日期返回 missing，不显示 NaN。调用现有 `remarkReadingTime()`，用 mdast 文本节点“中文 hello world”断言 `words=4`，证明统计输入与正文阅读算法一致。
- [ ] **Step 2：确认失败。** 运行 `node --import tsx --test tests/unit/site-stats.test.ts`，应因新日期接口缺失失败。
- [ ] **Step 3：实现纯日期函数。** 将上海日历日期转换为日序号后相减；运行天数 `max(0,差值)`，不使用绝对值或 ceil。返回实际活动日期、状态和有符号日期差；无可信日期显示“日期未记录”，未来显示实际日期及“日期待核实”，当天显示“今天”。
- [ ] **Step 4：改造并挂载 SiteStats。** 移除组件内原始 Markdown 扫描和旧 category／tag 汇总，六项读取共享结果；构建输出真实数值及活动 `time datetime`，数字用千位分隔。数据写在组件 `data-*` 属性中；一个打包脚本读取现有节点，只更新时间文案，每分钟检查自然日变化，注册一次 Swup 切页／可见性恢复处理，避免内联闭包保存过期 props。在现有 rightComponents 中于 SidebarTOC 后启用 stats，全局显示。
- [ ] **Step 5：验证组件并提交。** 单元通过，`pnpm check`、`pnpm type-check`、`pnpm build` 通过；运行 `pnpm exec playwright test tests/e2e/site-stats.spec.ts`，先用 1440px 验证六项真实 SSR、44／9／21、字数汇总、无 JS 构建天数及实际日期、模拟浏览器时区。Task 4 再扩展窄屏位置检查。提交：`fix: render accurate site statistics and Shanghai calendar dates`。

### Task 4：左侧专题上下文、右侧目录／统计与响应式布局

**Files:** Create `src/components/knowledge/TopicNav.astro`、`KnowledgeContext.astro`、`tests/unit/knowledge-context.test.ts`、`tests/e2e/knowledge-sidebar.spec.ts`；Modify Task 4 文件表中的布局／网格文件，`src/utils/knowledge-model.ts`、`src/components/widget/SidebarTOC.astro`、`src/pages/notes/[slug].astro`、`src/pages/projects/[slug].astro`、`tests/e2e/accessibility.spec.ts`。保留 `astro.config.mjs` 现有两个 sidebar dynamic 容器，不增加整侧栏替换容器。

**Interfaces:** 导出 `NavItem = {id:string;title:string;url:string;count:number;state:'none'|'current'|'related'}`、`SidebarContext = {hub:HubId|null;title:string;items:NavItem[];course?:{courseId:string;currentSlug:string;notes:NoteSummary[]}}`，以及 `getSidebarContext(index:KnowledgeIndex,pathname:string,article?:{url:string;type:NoteType|'project';topics:string[];course?:NoteData['course']}):SidebarContext`。`TopicNav` props `{context:SidebarContext;id:string}`；`KnowledgeContext` props `{context:SidebarContext;location:'sidebar'|'inline'}`。MainGridLayout 接收可选 `sidebarContext`，缺省按路径与共享 index 推导；KnowledgeLayout 将上下文传递给它。

- [ ] **Step 1：写上下文与切页失败测试。** 单元断言课程集合／分页选中同一课程，课程文章讲次来自公开有序成员，论文多主题为 `related` 且无多个 `aria-current=page`，Research 用途页仍属 Research，Projects 空状态提供其标题，首页／搜索／通用 note 显示四入口。unlisted 正文只传自身的用途／主题 ID，不将未公开标题加入导航。运行 `node --import tsx --test tests/unit/knowledge-context.test.ts` 确认接口缺失失败。
- [ ] **Step 2：写浏览器流程并确认旧布局失败。** 初始访问 `/papers/`，通过真实链接进入论文主题和正文，切 Research、Courses、课程讲义，连续往返十次并后退／刷新；断言上下文及目录跟随变化，`#swup-container`、`#left-sidebar-dynamic`、`#right-sidebar-dynamic`、`#floating-toc-wrapper` 始终各一个，没有重复 ID。保留已有 banner 替换容器。用本地短音频拦截音乐请求并由真实点击开始播放，记录 audio DOM 引用，检查切页后相同节点、未暂停、播放位置未回到零；视频／音乐偏好继续由原控制器管理。
- [ ] **Step 3：接入动态导航和稳定区域。** `#left-sidebar-dynamic` 仅包含 TopicNav 与当前课程讲次，之后才是 Profile／Music。保留 SidebarTOC 在前、stats 在后的右侧配置，保持 `#right-sidebar-dynamic` 占位。SSR 传入当前 headings，现有 TOCManager 继续在内容替换后从当前正文重建；从无目录页进入正文也要正确初始化。统计在稳定区域，侧栏均 `data-pagefind-ignore`。
- [ ] **Step 4：实现响应式位置。** 侧栏宽度设为 250px（`15.625rem`），主内容轨道使用 `minmax(0,1fr)`。小于 1024px 单栏；1024–1359px 左栏＋正文，统计在内容底部；1360px 起三栏，验证正文宽度至少约 640px。对应修改现有 CSS 与 SSR／客户端共用的列几何，保留导航栏自己的断点。右侧统计只渲染一个实例，用 CSS 在窄屏排到主体末尾；窄屏目录改用原生可展开入口。
- [ ] **Step 5：接入标题后的窄屏上下文。** 在 KnowledgeLayout 标题后、正文页标题／元信息后放原生可展开主题和课程讲次；宽屏侧栏版本与窄屏版本使用不同 id，纯链接无额外控制器，隐藏版本不可接收焦点。长标题换行，侧栏长列表可滚动。保留一份音乐和一份统计。更新正文目录原 `xl:hidden` 条件，使 1280px 的两栏布局仍能访问目录。
- [ ] **Step 6：修正共享详情判定。** `isArticleDetailPage(pathname:string)` 不再把 `/notes/page/2/` 或 `/projects/topics/<id>/[page/n/]` 当正文；真正文章／项目详情和旧详情模式仍正确。MainGridLayout 用同一判定设置页型，不仅凭 `postSlug`，避免项目详情在 SSR 时被当集合。加入有针对性的纯函数断言；查阅所有调用者，保持侧栏、沉浸阅读、目录和几何一致。
- [ ] **Step 7：验证并提交。** 单元通过；`pnpm build` 后运行 `pnpm exec playwright test tests/e2e/knowledge-sidebar.spec.ts tests/e2e/site-stats.spec.ts tests/e2e/accessibility.spec.ts`。测试 320／390／768／1024／1280／1440px、明暗色、键盘和无 JS；导航及统计各断点可达，无横向溢出，宽屏目录在统计上方。提交：`feat: add contextual sidebars while preserving media playback`。

### Task 5：导航收口、项目全文搜索、SEO 和旧地址兼容

**Files:** Modify `src/config/navBarConfig.ts`、`src/pages/index.astro`、`src/pages/search.astro`、`src/components/pages/AdvancedSearch.svelte`、`src/pages/notes/[slug].astro`、`src/pages/projects/[slug].astro`、`src/pages/sitemap.xml.ts`、`scripts/test-authoring.ts`、`tests/integration/authoring-output.test.ts`、`tests/e2e/search.spec.ts`、`tests/e2e/navigation.spec.ts`；Create `tests/unit/knowledge-routes.test.ts`。复用 Task 2 的集合路由登记，不另写 sitemap 分页算法。

**Interfaces:** `buildCollectionRoutes(index)` 是新集合与分页 URL 的共同来源；搜索继续 `q/type/topic/course` URL 与 Pagefind API。项目正文使用 `data-pagefind-body`、`type:project`、受控 `topic:<id>`；已有文章 URL 和筛选值不变。

- [ ] **Step 1：写导航／SEO／项目索引失败测试。** 桌面和手机导航仅首页＋四专题；首页四入口显示 31／12／1／0，最近记录入口为“搜索记录”到 `/search/`；搜索备用入口四专题＋全站主题。在独立 authoring 副本加入有真实主题／更新日期的公开项目及 draft、空项目，断言项目只有公开非空正文进入主题、统计、sitemap 与 Pagefind。
- [ ] **Step 2：调整既有项目契约并确认失败。** 将 `authoring-output.test.ts` 中“projects remain outside the public-note Pagefind index”替换为“public project body shares the public-content index”，明确断言索引数等于公开文章数＋公开非空项目数；断言实际项目正文标记、类型／主题标记及私有项目缺席，保留原项目图片渲染检查。运行 `pnpm test:authoring`，应因旧项目正文 `data-pagefind-ignore`／缺少标记失败，不能只调高期望计数。
- [ ] **Step 3：实现导航与正文搜索。** 删除 Notes 导航项，首页读取真实 index 数量；保留精选及最近公开记录。项目正文加入唯一 Pagefind body，将标题改为可见 h1，同时向 MainGridLayout 传 `hideHeading=true`，保留封面和已有正文组件；返回链接／来源／导航／侧栏忽略索引。AdvancedSearch 增加项目类型，文案覆盖公开内容；保留原 URL 恢复、popstate、分页加载及过期请求保护，单一 Pagefind 索引。
- [ ] **Step 4：完善集合 sitemap 与 canonical。** sitemap 从登记的集合路径输出真实专题主题／分页和公开正文，项目 lastmod 取真实发布／更新日期；公共主题含项目但仍只生成一个正文 URL。`getCanonicalUrl` 保持当前页路径，第二页不 canonical 到第一页。本地 preview 继续 noindex；不修改生产域名、legacy 映射或 feed 的既有文章范围。
- [ ] **Step 5：验证旧地址、刷新和搜索。** `pnpm build`、`pnpm test:authoring`、`pnpm verify:site`、`pnpm audit:migration` 通过；运行 `pnpm exec playwright test tests/e2e/search.spec.ts tests/e2e/legacy-links.spec.ts tests/e2e/navigation.spec.ts`。既有 20 个真实查询、类型／主题／课程筛选、后退／刷新、延迟旧请求继续正确；项目 fixture 内容可由 Pagefind 构建后查询，当前真实库仍无虚构项目。验证新第二页 canonical／sitemap、自有分页链接、未知页 404。
- [ ] **Step 6：验证开发内容更新。** 在同一临时 authoring 副本启动 Astro dev 独立端口，将 fixture 从公开改成 draft，再改正文或主题；轮询服务端响应，确认计数和发现入口更新、不复用旧字数。测试结束停止自己启动的进程；不编辑真实内容库，不影响 4321 预览。将此检查接入 `scripts/test-authoring.ts`，失败必须传播退出码。
- [ ] **Step 7：提交。** 仅加入本任务明确文件：`feat: connect hub navigation and public project discovery`。

### Task 6：完整回归、500 篇规模与维护交付

**Files:** Modify `scripts/benchmark-content.ts`、`tests/unit/benchmark.test.ts`、`README.md`；Create `docs/migration/TOPIC-HUBS-ACCEPTANCE.md`。使用现有媒体／公式／图片回归，不复制同类测试。

**Interfaces:** 保留 CLI `node --import tsx scripts/benchmark-content.ts --count 500 --output-dir <不存在的临时目录>`，`benchmarkContent(outputDir:string):Promise<Record<string,unknown>>`；扩展报告记录集合分页与代表页面传输体积。样本仍为 course 200、paper 180、log 50、idea 30、experiment 20、note 20；公开项目新增能力由隔离 authoring fixture 验证，不悄悄改变同规模基线分布。

- [ ] **Step 1：为规模报告新增有意义的断言。** 在 500 篇副本中核对全站 500、六种用途数量、各课程顺序和各主题成员，多主题成员不增加全站数；每页最多 25 项，无越界产物。draft sentinel 不出现在公开集合、统计或 Pagefind；index／侧栏不携带正文或全站文章数组，当前课程导航只含当前课程。报告保留真实构建秒数／峰值 RSS，并记录代表集合、文章、搜索首屏的 HTML／JS／Pagefind 实际网络传输字节（效果关闭、冷缓存，媒体单独记录）。
- [ ] **Step 2：运行全部检查一次。** 依次运行 `pnpm test`、`pnpm lint:check`、`pnpm check`、`pnpm type-check`、`pnpm build`、`pnpm verify:site`、`pnpm audit:migration`、`pnpm test:authoring`、`pnpm test:e2e`、`git diff --check`。浏览器用 build 后 preview；本机 Chromium 已在 `/tmp/astro-firefly-browsers`，可设 `PLAYWRIGHT_BROWSERS_PATH` 复用。针对新增失败回到归属任务修复，检查通过后不无理由重复全部构建。
- [ ] **Step 3：运行改造后 500 篇构建并比较。** 使用新目录 `/tmp/goongmly-hubs-after-20261004`。与 Task 1 基线使用相同 Node／pnpm、样本、preview 配置、机器和测量方式，分别报告构建耗时、峰值内存、传输体积及变化。测量基线传输时运行基线副本独立 preview，退出该任务自己的服务，不影响现有 4321 预览。任何显著回退定位到新增聚合／路由／布局，不凭装饰效果掩盖性能问题。
- [ ] **Step 4：记录视觉与内容验收。** 保存六种宽度下首页、Papers 聚合／主题、课程正文的截图并逐张检查；确认统计／目录位置、主题状态、长标题、英文词数、无 JS 数值。运行原 `reading-rendering.spec.ts`、媒体和蓝色主题检查，保持下标、分子不裁切、图片居中、自定义媒体及失败降级；迁移审计继续证明正文／原图保全。
- [ ] **Step 5：写维护说明与交付记录。** README 更新四入口、受控主题配置、项目 `topics/updated` 示例、统计口径与 25 项分页；旧 Notes 路由作为兼容入口。验收记录列明实际结果、前后规模指标、截图位置及真实限制，不写预期结果冒充完成。按 Native 执行技能完成整体代码审查，修复发现后只重跑受影响检查；确认原 main 工作区未受改动。
- [ ] **Step 6：提交并交付本地预览。** 提交：`docs: verify topic hubs at 500-note scale`。最终说明当前分支、真实检查结果和本地预览；用户可检查专题／统计效果。本计划不合并、不推送、不部署。

## 规格覆盖与执行顺序

| 规格要求 | 承接任务 |
| --- | --- |
| 四入口、受控主题、多主题去重、公开项目与未知引用 | 1、2 |
| 专题页层级、真实摘要、静态分页、零篇／未设置主题 | 2 |
| 六项统计、共享正文词数、上海自然日、未来／未知日期、SSR | 1、3 |
| 左侧上下文、课程讲次、右侧目录优先、Swup 与音乐实例 | 4 |
| 手机可展开导航、统计末尾、完整标题、键盘与阅读宽度 | 4 |
| 首页与主导航、Pagefind 项目搜索、canonical、sitemap、兼容链接 | 5 |
| 500 篇性能、媒体／公式／图片回归、原文／原图保全、维护文档 | 6 |

按 1 → 2 → 3 → 4 → 5 → 6 执行。Task 3 验证已挂载的宽屏统计，Task 4 完成响应式位置与上下文切页；Task 1 只建立正确数据接口，不以“数据存在”声称用户已能看到统计。实施前先完成用户对本计划的审阅，继续采用 Native。
