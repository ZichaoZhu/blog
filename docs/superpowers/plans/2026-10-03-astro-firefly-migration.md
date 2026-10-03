# Astro + Firefly Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在独立分支交付保全现有内容、启用 Firefly 媒体与装饰、适合 500+ 篇积累的 Astro 科研知识主页，以及可审阅预览、验收与回退材料。

**Architecture:** 直接使用锁定的 Firefly 应用，保留其布局、Svelte、Swup 与播放器；Astro Content Collections 承载唯一内容源。集中校验元数据、公开范围和课程关系，静态生成正文、集合及分页，Pagefind 对明确的公开正文建索引。原工作区只提供基线，应用改造全部位于迁移 worktree。

**Tech Stack:** Firefly `6.16.8` / Astro `7.3.2`，TypeScript、Markdown/MDX、Tailwind、Svelte、Swup、Pagefind、KaTeX、Expressive Code；复用 `tsx` + Node test runner，浏览器回归使用 `@playwright/test`。

**Spec:** [2026-10-03-astro-firefly-migration-design.md](../specs/2026-10-03-astro-firefly-migration-design.md)，书面规格已确认，基于设计提交 `e134ebe`。

## Global Constraints

- 实施分支 `feat/astro-firefly`，工作目录 `/Users/zzc/Desktop/一路成长/blog/.worktrees/astro-firefly`；原工作区 `/Users/zzc/Desktop/一路成长/blog` 保留 `main` 的未提交修改。
- 53 个源记录：44 公开、3 非空 unlisted、1 空讲义、5 集合介绍；578 张原图按字节保留，正文 hash 排除 frontmatter。47 篇非空正文不等于 47 篇公开结果。
- 正文 canonical 统一为 `/notes/[slug]`。一篇正文只有一个稳定地址；显式 ID/slug 从原工作区有效数据导出。
- 类型为 `course/paper/log/idea/experiment/note`，主题沿用 9 个受控 ID，课程沿用 5 个稳定 ID；日期可选，不使用 mtime 或迁移日期补齐。
- 音乐手动播放，初始音量约 `0.25`；樱花初始约 `8–12` 个。视频、打字机、波浪/渐变、毛玻璃和 Swup 过渡启用，并具有统一暂停与降级行为。
- 正文建议宽度 `720–780px`、中文 `17–18px`；首页横幅初始桌面 `300–420px`、手机 `180–240px`；分页约 `25` 项。最终使用真实长文验收。
- 无 JavaScript 正文、课程、分页和原生锚点仍可使用；媒体失败不阻塞正文与检索；draft 不输出，unlisted 排除公开发现入口并 noindex。
- 生产 origin、托管平台及项目、最终媒体清单提供前，交付预览和报告；不执行正式发布。正式配置使用真实 HTTP 301/308，页面/资源/索引/规则同版。
- 不新增 CMS、账户、AI 问答、知识图谱或文献数据库；不保留 Next.js 作为新站运行时，不将 React 页面逐个翻译。
- 本计划只在用户审阅并选定执行方法后执行。所有运行命令与期望结果是后续操作说明，不是已通过的检查。

## Review Focus

以下五类输入需要特别审查，其测试由对应任务负责：

1. 缺失日期、无效日历日期与时区：保留未知日期，不崩溃、不伪造时间；Task 2。
2. 集合、空正文、unlisted 和 draft：页面可访问性、公开计数、索引及 SEO 范围一致；Tasks 2、6、7、8。
3. 中文/空格/加号/百分号图片路径及越界路径：只解码必要的一次，保全有效资源，拒绝越界；Tasks 3、8。
4. 讲次 0、Lec2/Lec10、同名讲义和跨课程：数字排序、正确上下篇，不串课程；Task 4。
5. Swup 切页期间的媒体错误、减少动态与后台切换：单音频实例、状态连续、独立降级；Task 5。

## 工作基点、版本与交付顺序

Firefly 固定为 `6d82554bfe1cb3d4b43adb0969dad1d43ac6dee3`，核查日期 2026-10-03。[固定提交](https://github.com/CuteLeaf/Firefly/tree/6d82554bfe1cb3d4b43adb0969dad1d43ac6dee3)声明 Node `>=22.23.0`、pnpm `11.22.0`；本计划统一 Node `22.23.0`。执行时若该提交无法通过原生 smoke build，先记录实际失败并解决模板基线，不静默更换 master 或框架版本。

任务 1–5 形成代表文章原型，完成该阶段阅读与媒体验证后才执行任务 6 全量转换。任务 7–10 完成检索、链接、规模、CI 和发布准备；任何提交都不隐含线上发布。细节见[原迁移清单](../../../ASTRO_MIGRATION.md)。

## 文件结构与共享接口

下列应用文件来自所锁定模板；新增文件优先保持小型、单一用途，不建立独立组件框架。

| 文件 | 职责 / 所属任务 |
| --- | --- |
| `scripts/migration/backup.ts` | 原工作区可恢复快照、源文件/资产指纹；Task 1 |
| `scripts/migration/convert.ts` | 导出有效元数据、dry-run、选择性/全量转换；Tasks 2、6 |
| `migration/manifest.json` | 53 条内容归属、原图 hash、URL/锚点/资源映射；Tasks 2、3、6、8 |
| `docs/migration/UPSTREAM.md`、`docs/migration/ROLLBACK.md` | 上游来源及恢复流程；Tasks 1、10 |
| `src/data/catalog.ts` | 课程/主题定义，适配原 `lib/catalog.ts`；Task 2 |
| `src/content/schema.ts`、`src/content.config.ts` | schema 与模板展示字段派生；Task 2 |
| `src/utils/note-model.ts`、`src/utils/content-utils.ts` | 纯元数据规则与 Astro 集合查询；Tasks 2、4、7 |
| `src/utils/date-utils.ts`、`src/utils/url-utils.ts`、`src/utils/feed-utils.ts` | 日期、稳定正文 URL、订阅兼容；Tasks 2、7、8 |
| `src/pages/notes/[slug].astro` | 从模板文章页迁来，唯一正文；Tasks 2、3、4、7 |
| `src/plugins/remark-typora-compat.ts`、`src/plugins/remark-local-images.ts` | 必要 Typora 语法与 HTML 图片兼容；Task 3 |
| `src/pages/index.astro`、`src/pages/notes/index.astro`、`src/pages/notes/page/[page].astro` | 首页与静态列表；Task 4 |
| `src/pages/courses/index.astro`、`src/pages/courses/[id].astro`、`src/pages/papers.astro` | 课程与论文集合；Task 4 |
| `src/pages/research/index.astro`、`src/pages/research/[type].astro`、`src/pages/topics/index.astro`、`src/pages/topics/[id].astro` | 研究与主题集合；Task 4 |
| `src/components/knowledge/CourseNav.astro`、`src/components/knowledge/NoteList.astro` | 当前课程导航、基于模板卡片的共用列表；Task 4 |
| `src/utils/effects-state.ts`、`src/components/controls/EffectsToggle.astro` | 统一动效选择与控制；Task 5 |
| `src/config/siteContext.ts`、`scripts/migration/redirects.ts` | 预览/正式 origin 校验与平台规则；Task 8 |
| `scripts/verify-site.ts`、`scripts/benchmark-content.ts` | 内容/DOM/资源与规模报告；Tasks 6、9 |
| `tests/unit/*.test.ts`、`tests/e2e/*.spec.ts`、`tests/fixtures/notes.ts`、`playwright.config.ts` | 风险驱动的单元与真实浏览器回归；对应任务 |

共同数据约定（由 Task 2 定义，后续任务复用，不重复实现）：

- `NoteData`：`id, slug, title, description, contentKind, type, topics, visibility, author`，可选 `date, updatedAt`（真实日精度 `YYYY-MM-DD` 字符串）、`course:{id:string,order?:number}`、`paper:{title?:string,authors?:string[],year?:number,venue?:string,paperUrl?:string,arxivUrl?:string,doiUrl?:string,codeUrl?:string}`，保留现有 tags/category 等展示与历史字段。论文资料只录入已知值，不从笔记日期推断发表年。
- `NoteRecord = { entryId: string; data: NoteData; hasBody: boolean }`；`entryId` 是 Astro 集合 ID，不作为公开 slug。
- `NoteSummary = { id, slug, url, title, description, type, topics, date?, updatedAt?, course? }`，没有 body/content。
- `Catalog = { courses: CourseDefinition[]; topics: TopicDefinition[] }`，定义沿用原工作区；`MigrationManifest = { version:1; sourceHead:string; records:MigrationRecord[]; assets:AssetRecord[] }`。
- `MigrationRecord` 含 `sourcePath,targetPath,id,slug,contentKind,visibility,type,topics,course?,bodySha256,legacyPath,canonicalPath,anchorAliases:Record<string,string>`；`AssetRecord` 含 `sourcePath,sha256,width,height,publishedVariants:{url:string,width:number}[]`。初始锚点映射为 `{}`，初始发布变体为 `[]`，由真实渲染输出补齐。
- `tests/fixtures/notes.ts` 定义 `makeNote(data:Partial<NoteData>, hasBody=true):NoteRecord`：默认为有效 published note、topic `robotics`、日期未知；传入 ID/slug 覆盖默认值。所有测试中不同笔记显式使用不同 ID/slug。

---

### Task 1: 可恢复基线与可运行 Firefly 基础

**Files:** Create `scripts/migration/backup.ts`, `tests/unit/backup.test.ts`, `.nvmrc`, `docs/migration/UPSTREAM.md`, `docs/migration/ROLLBACK.md`; 取入固定模板的 `src/`, `public/`, `scripts/`, `astro.config.mjs`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.json`, `biome.json`, `postcss.config.mjs`, `svelte.config.js`, `pagefind.yml`, `LICENSE`；合并模板 `.gitignore`/`.gitattributes` 与本站 LFS/本地输出规则；移除新 worktree 中的 `app/`, `components/`, `lib/`, `types/`, `next.config.ts`, `next-env.d.ts`, `package-lock.json` 和旧 Next 专用配置；保留所有审计/设计/计划文档。

**Interfaces:** `backupWorkspace(sourceRoot:string, backupRoot:string):Promise<{files:{path:string,sha256:string}[];deletedTrackedFiles:string[];sourceHead:string}>`；CLI 接受 `--source-root`、`--backup-root`。备份目录使用原工作区 `.worktrees/_backups/astro-firefly-2026-10-03`，只作本地恢复材料，不提交；不复制 `.git`、node_modules、.next 缓存。

- [ ] **Step 1：核对工作区并选择 Node 22.23.0。** 在本地已有版本管理方式中切换 Node；运行 `git branch --show-current`、`node --version`，应分别为 `feat/astro-firefly`、`v22.23.0`。记录原工作区状态与 HEAD；禁止 reset/stash 原工作区。
- [ ] **Step 2：先写备份失败测试。** 用临时 Git fixture 包含已修改文件、已删除文件、未跟踪文档和实际 PNG；断言：

```ts
test('backup restores authored files and deletions', async () => {
  const result = await backupWorkspace(sourceRoot, backupRoot);
  assert.ok(result.deletedTrackedFiles.includes('deleted.md'));
  assert.equal(sha256(await readFile(backupRoot + '/files/note.md')), originalNoteHash);
  assert.equal(sha256(await readFile(backupRoot + '/files/untracked.md')), untrackedHash);
});
test('backup rejects LFS pointers used as actual images', async () => {
  await assert.rejects(backupWorkspace(pointerRoot, backupRoot), /LFS pointer/);
});
```

Fixture 创建与 `sha256` 使用 Node fs/crypto，定义在该测试文件。运行 `node --experimental-strip-types --test tests/unit/backup.test.ts`，确认因实现不存在失败；随后实现 backupWorkspace，重跑应通过。
- [ ] **Step 3：执行真实备份。** `node --experimental-strip-types scripts/migration/backup.ts --source-root /Users/zzc/Desktop/一路成长/blog --backup-root /Users/zzc/Desktop/一路成长/blog/.worktrees/_backups/astro-firefly-2026-10-03`。Git 文件列表与删除清单须保留 NUL 安全路径；原内容应为 53 个 Markdown、578 张实际原图。记录当前已提交及未提交文件，检查备份 hash。备份目录已存在时拒绝覆盖。
- [ ] **Step 4：建立模板 smoke baseline。** 临时 staging 目录取入固定提交，先读取其 AGENTS.md 和相关贡献说明，再取入应用；不复制 `.git`，不继承示例托管项目配置。设置 `.nvmrc=22.23.0`，使用 `pnpm@11.22.0`，运行 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm type-check`、`pnpm build`。应可用 `pnpm preview --host 127.0.0.1 --port 4321` 访问模板首页且无构建阻断；此时只核验模板，不宣称本站内容兼容。
- [ ] **Step 5：提交基础。** 检查差异只在迁移 worktree；显式暂存模板与本任务文件，排除 staging、备份和缓存，提交 `chore: establish pinned Firefly migration baseline`。UPSTREAM 记录完整提交、版本、许可证与取入范围。

### Task 2: 内容 schema、迁移事实与代表文章

**Files:** Create `src/content/schema.ts`, `src/data/catalog.ts`, `src/utils/note-model.ts`, `scripts/migration/convert.ts`, `migration/manifest.json`, `tests/fixtures/notes.ts`, `tests/unit/note-model.test.ts`, `tests/unit/migration.test.ts`; Modify `src/content.config.ts`, `src/utils/content-utils.ts`, `src/utils/date-utils.ts`, `src/utils/url-utils.ts`, `src/components/layout/PostMeta.astro`, `src/components/layout/BannerPostMetaOverlay.astro`, `src/components/layout/PostCard.astro`, `src/layouts/MainGridLayout.astro`, `src/utils/feed-utils.ts`, `src/pages/rss.xml.ts`, `src/pages/atom.xml.ts`; Move `src/pages/posts/[...slug].astro` to `src/pages/notes/[slug].astro`。

**Interfaces:** `noteDataSchema` 派生 optional `published/updated:Date`、`draft:boolean` 和课程系列展示，源 frontmatter 只保留一份事实。纯函数 `isPublicNote(note:NoteRecord):boolean`, `getPublicNotes(notes:readonly NoteRecord[]):NoteRecord[]`, `getRoutableNotes(notes:readonly NoteRecord[]):NoteRecord[]`, `toSummary(note:NoteRecord):NoteSummary`, `assertCatalog(notes:readonly NoteRecord[],catalog:Catalog):void`；查询入口仍复用模板 `getSortedPosts/getSortedPostsList`，加 `getRoutablePosts():Promise<CollectionEntry<'posts'>[]>`。

`compareNoteDates(a:NoteRecord,b:NoteRecord):number` 按真实 date 降序、未知在后、同日按 slug 稳定排序；`formatDateToYYYYMMDD(date:Date|undefined):string` 与 `formatDateI18n(dateInput:Date|string|undefined,includeTime?:boolean):string` 延续模板名称，未知返回空字符串且调用者省略 time 元素。无时间部分的源日期按 UTC 日精度展示，不随机器或站点时区变成前一天；完整时间戳保留模板时区功能。

`buildManifest(sourceRoot:string):Promise<MigrationManifest>`、`convertContent(manifest:MigrationManifest,options:{sourceRoot:string;targetRoot:string;selectedPaths?:string[];dryRun:boolean}):Promise<{written:string[];unchanged:string[]}>`。初始 canonical 使用原迁移清单，metadata 使用原 `lib/posts.ts` 的有效值与 `lib/catalog.ts` 的分类定义，不把旧 HEAD 作为数据源。

- [ ] **Step 1：编写核心行为测试并验证失败。** 新增 `test` 脚本为 `tsx --test tests/unit/*.test.ts`，复用模板已有 tsx。写出这些断言后运行 `pnpm exec tsx --test tests/unit/note-model.test.ts tests/unit/migration.test.ts`：

```ts
test('unknown dates stay unknown and invalid days fail', () => {
  const data = noteDataSchema.parse(makeNote({}).data);
  assert.equal(data.date, undefined);
  assert.equal(data.published, undefined);
  assert.throws(() => noteDataSchema.parse({...data, date:'2026-02-30'}));
});
test('calendar days and unknown-date ordering are stable', () => {
  const known = makeNote({id:'dated',slug:'dated',date:'2026-10-03'});
  const unknown = makeNote({id:'unknown',slug:'unknown'});
  assert.equal(formatDateToYYYYMMDD(noteDataSchema.parse(known.data).published), '2026-10-03');
  assert.equal(formatDateToYYYYMMDD(undefined), '');
  assert.equal(formatDateI18n(undefined), '');
  assert.deepEqual([unknown,known].sort(compareNoteDates).map(n=>n.data.slug), ['dated','unknown']);
});
test('public and direct-access scopes differ', () => {
  const all = [makeNote({id:'a',slug:'a'}), makeNote({id:'b',slug:'b',visibility:'unlisted'}),
    makeNote({id:'c',slug:'c',visibility:'draft'}), makeNote({id:'d',slug:'d',contentKind:'collection'}),
    makeNote({id:'e',slug:'e'},false)];
  assert.deepEqual(getPublicNotes(all).map(n=>n.data.slug), ['a']);
  assert.deepEqual(getRoutableNotes(all).map(n=>n.data.slug), ['a','b']);
  assert.equal('body' in toSummary(all[0]), false);
});
```

迁移测试另外断言：缺日期不写回日期、CRLF/代码围栏正文 hash 不变、第二次转换输出字节相等、重复 ID/slug/未知 topic 报源文件。日期需校验真实日历，不能只匹配正则。分别以 `TZ=UTC` 与 `TZ=America/Los_Angeles` 重跑日期测试；日精度格式化不跨日。
- [ ] **Step 2：实现集中模型和展示适配。** 移入 5 课程/9 主题定义；metadata 可选日期在各模板消费者中有明确分支，JSON-LD 不调用 undefined.toISOString()。RSS/Atom 暂只取有日期的公开笔记。更新全部正文链接调用为 `entry.data.slug`，`getPostUrlBySlug(slug:string):string` 返回 `/notes/<slug>/`；集合 entry ID 不用作 URL。先统一 `trailingSlash:'always'`，旧链接直接进入最终形式。
- [ ] **Step 3：建立完整 manifest，选择性导入原型。** CLI 为 `pnpm exec tsx scripts/migration/convert.ts --source-root /Users/zzc/Desktop/一路成长/blog --target-root src/content/posts --dry-run`。清单必须包含全部 53 记录/578 原图。正式 apply 支持 `--apply --select <相对源路径列表>`；原型至少包括 Compiler Lec1/Lec10、Operating Lec0/Lec12、RL Lec2/Lec5、InfiniDepth、日志、日语 Lec2、callouts-demo、typora-test，以及需要的集合介绍与相邻资产。源路径从原清单读取，不能猜文件名。
- [ ] **Step 4：验证原型数据与日期。** 重跑两个测试、`pnpm check`、`pnpm build`；访问 `/notes/infinidepth-reading/`，无虚构日期、无日期格式异常；`/posts` 不生成第二份正文。此步只验数据和路由，渲染完整性在 Task 3 判定。`rg -n 'data\.published|data\.updated|toISOString|\.getTime\(' src` 逐项核对相关调用，不以只修文章页替代全局适配。
- [ ] **Step 5：提交。** 显式暂存本任务文件和选定内容/资源，提交 `feat: add canonical note model and migration prototype`；不提交全部旧 Next 源码或备份。

### Task 3: 代表文章的渲染与图片兼容

**Files:** Create `src/plugins/remark-typora-compat.ts`, `src/plugins/remark-local-images.ts`, `tests/unit/markdown-compat.test.ts`, `tests/unit/local-images.test.ts`, `tests/fixtures/markdown/compat.md`; Modify `astro.config.mjs`, `src/pages/notes/[slug].astro`, `src/components/common/Markdown.astro`, `src/styles/main.css`, `migration/manifest.json`。

**Interfaces:** `remarkTyporaCompat(): (tree:MdastRoot)=>void`，`remarkLocalImages(options:{contentRoot:string}): (tree:MdastRoot,file:VFile)=>Promise<void>`，使用 unified 的标准节点/VFile 类型；图片插件提供 `resolveLocalImage(src:string,sourceFile:string,contentRoot:string):string`，返回已验证的源文件绝对路径。manifest 的 `publishedVariants` 在实际构建后补为真实 URL/宽度；TOC 使用 `render(entry).headings`，不另写 heading 正则。

- [ ] **Step 1：先固定兼容和路径断言。** `markdown-compat.test.ts` 通过实际 AST 管线验证高亮/上标/下标、折叠 Callout、重复中文标题、`[toc]`；代码与公式内容不能被 Typora 替换。图片测试使用临时 fixture：

```ts
test('local images preserve valid names and reject escape', () => {
  assert.equal(resolveLocalImage('./assets/%E5%9B%BE%20a%2Bb.png',sourceFile,contentRoot), imagePath);
  assert.throws(()=>resolveLocalImage('../../../../outside.png',sourceFile,contentRoot), /outside|escape/);
  assert.throws(()=>resolveLocalImage('./assets/missing.png',sourceFile,contentRoot), /missing/);
});
```

其中 fixture 创建实际 `图 a+b.png`；补充含 `%` 的文件名、双重编码及 HTML img 缩放案例。运行 `pnpm exec tsx --test tests/unit/markdown-compat.test.ts tests/unit/local-images.test.ts`，确认实现前失败。
- [ ] **Step 2：复用上游渲染，补最小兼容。** KaTeX、Expressive Code、Callout 和静态 SVG 沿用模板；Callout 使用 obsidian 主题。Typora 插件不改 code/math。HTML img 解析后转换为可进入 Astro 图片处理的节点，保留 zoom/缩放含义；采用现有 HTML 解析能力，没有直接依赖时仅增加 `hast-util-from-html`，不使用整篇字符串替换。开启受支持的响应式 Markdown 图片配置，验证生成固有尺寸与真实 srcset；保留原图入口。
- [ ] **Step 3：验证实际构建输出。** 单元测试、`pnpm check`、`pnpm build`；检查代表文章 DOM、深浅色、320/390px、长公式、宽表格、HTML 图片和原图。页面仅一个 h1，正文与 TOC 使用同一规范化 headings；变化的旧锚点登记 manifest 留给 Task 8 兼容。保存图表/图片/TOC 验证结果到 `docs/migration/PROTOTYPE.md`；SVG 出错即记录并修复，不用 build=0 放行。若静态 SVG 确实不兼容，记录原因后改为按页面使用一种浏览器引擎。
- [ ] **Step 4：提交。** 提交 `fix: preserve research markdown and image rendering`，附该批正文/原图 hash 核对；不批量整理或重写 Markdown。

### Task 4: 首页、课程与集合导航

**Files:** Create 文件结构表中的首页/Notes/Courses/Papers/Research/Topics 页面与 `src/components/knowledge/CourseNav.astro`, `NoteList.astro`, `tests/unit/course-navigation.test.ts`, `tests/e2e/navigation.spec.ts`, `playwright.config.ts`; Modify `src/config/navBarConfig.ts`, `profileConfig.ts`, `sidebarConfig.ts`, `siteConfig.ts`, `src/layouts/MainGridLayout.astro`, `src/components/layout/SidebarColumn.astro`, `SideBar.astro`, `PostCard.astro`, `src/pages/notes/[slug].astro`, `src/pages/about.astro`, `src/pages/projects/index.astro`, `src/content.config.ts`, `src/utils/content-utils.ts`; Remove `src/pages/[...page].astro` 被明确首页与 Notes 分页替代的路径，以及模板示例项目/关于身份。

**Interfaces:** `orderCourseNotes(notes:readonly NoteRecord[],courseId:string):NoteRecord[]`, `getCourseNeighbors(notes:readonly NoteRecord[],slug:string):{previous?:NoteSummary;next?:NoteSummary}`, `paginateNotes(notes:readonly NoteSummary[],page:number,pageSize=25):{items:NoteSummary[];totalPages:number}`。CourseNav props 为 `{courseId,currentSlug,notes:NoteSummary[]}`；MainGridLayout/SidebarColumn/SideBar 传递仅当前课程的上下文，空侧栏不留下列。NoteList props `{notes:NoteSummary[]}`，复用模板 PostCard 外观。

- [ ] **Step 1：写讲次与分页失败测试。** `makeNote` 分别构造课程 c 的 order `10/0/2` 和课程 d 的 Lec2；下例 notes 与 summaries 在该测试内构造，summaries 为 44 个不同 ID/slug。再断言 unlisted/draft 不成为公开上下篇，重复 course/order 在目录校验时报错；越界分页函数抛 RangeError，页面不生成该静态路径并返回404。运行 `pnpm exec tsx --test tests/unit/course-navigation.test.ts` 验证失败。

```ts
test('lecture zero and double-digit neighbors stay in their course', () => {
  assert.deepEqual(orderCourseNotes(notes,'c').map(n=>n.data.course?.order), [0,2,10]);
  const neighbors = getCourseNeighbors(notes,'c-lec2');
  assert.equal(neighbors.previous?.slug, 'c-lec0');
  assert.equal(neighbors.next?.slug, 'c-lec10');
  assert.equal(paginateNotes(summaries,1).items.length, 25);
  assert.equal(paginateNotes(summaries,2).items.length, 19);
  assert.throws(()=>paginateNotes(summaries,3), RangeError);
});
```
- [ ] **Step 2：实现公开集合与导航。** 内容路径采用规格表；`research/[type]` 只生成 logs/ideas/experiments，主题/课程 ID 只生成真实定义。Projects 使用模板已有独立 collection，去除示例项目，日期可选，并适配 `getSortedProjects` 和项目页日期消费者；有真实资料时才生成详情，未知项目不生成虚构成果。论文资料由 NoteData.paper 呈现真实来源按钮。关闭当前不使用的分类栏/碎片动态与扩展页，课程上下文加入已有侧栏体系。首页横幅后紧接主要入口、真实精选与最近公开记录；标题与资料来自原工作区真实内容。
- [ ] **Step 3：加入必要浏览器回归。** 增加并锁定开发依赖 `@playwright/test`；Playwright webServer 使用生产 build 后的 `pnpm preview --host 127.0.0.1 --port 4321`，环境 `SITE_MODE=preview`，不使用 dev server 代替索引/输出测试。`navigation.spec.ts` 验证：首页进入课程讲义、返回课程、上下讲；原型重复 Lec 标题显示课程上下文；Research/Projects 空状态；手机菜单与目录键盘焦点。运行 `pnpm test`、`pnpm check`、`pnpm exec playwright test tests/e2e/navigation.spec.ts` 应通过。
- [ ] **Step 4：提交。** 提交 `feat: add research navigation and course reading flow`；PROTOTYPE 更新首页/课程/长文预览及界面核验。实际 44 项分页在 Task 6 全量后再验证，原型测试使用 fixtures，不伪造真实库存。

### Task 5: 视频、音乐与统一动效控制

**Files:** Create `src/utils/effects-state.ts`, `src/components/controls/EffectsToggle.astro`, `tests/unit/effects-state.test.ts`, `tests/e2e/media.spec.ts`; Modify `src/config/backgroundWallpaper.ts`, `musicConfig.ts`, `effectsConfig.ts`, `sidebarConfig.ts`, `siteConfig.ts`, `fontConfig.ts`, `pioConfig.ts`, `src/layouts/Layout.astro`, `src/components/layout/WallpaperSection.astro`, `BannerHomeTextOverlay.astro`, `Navbar.astro`, `src/components/features/MusicManager.astro`, `MusicPlayer.astro`, `MusicPlayerView.astro`, `SakuraEffect.astro`, `WavesEffect.astro`, `src/utils/swup-transitions.ts`, `src/styles/main.css`。

**Interfaces:** 复用现有 `window.__fireflyMusic.getState()/togglePlay()/setVolume()/toggleMute()`，不创建第二个音频管理器。`resolveEffectsState(input:{savedChoice:'on'|'off'|null;reducedMotion:boolean;saveData:boolean;visible:boolean}):{enabled:boolean;allowVideoPreload:boolean}`；统一 localStorage key `firefly-effects`，改变选择派发 `firefly:effects-change`，各动效复用自身启停/清理机制。

- [ ] **Step 1：固定动效优先级测试。** savedChoice=off 始终关；没有选择且 reducedMotion=true 关；savedChoice=on 可覆盖系统减少动态，但 saveData=true 仍不预取视频；visible=false 暂停背景视频/粒子，音乐不受该状态控制。运行 `pnpm exec tsx --test tests/unit/effects-state.test.ts` 确认失败，再实现纯状态解析。

```ts
test('system and background conditions independently lower effects', () => {
  assert.deepEqual(resolveEffectsState({savedChoice:null,reducedMotion:true,saveData:false,visible:true}),
    {enabled:false,allowVideoPreload:false});
  assert.deepEqual(resolveEffectsState({savedChoice:'on',reducedMotion:true,saveData:true,visible:true}),
    {enabled:true,allowVideoPreload:false});
  assert.deepEqual(resolveEffectsState({savedChoice:'on',reducedMotion:false,saveData:false,visible:false}),
    {enabled:false,allowVideoPreload:false});
});
```
- [ ] **Step 2：配置已确认风格并接入控制。** banner/playerEnable 开启；音乐导航/侧栏入口开启、local 模式、volume `0.25`；樱花取 `10` 个作为首个原型值，移动降低密度；开启打字机/波浪及模板渐变、导航毛玻璃和 Swup。字体初版使用系统字体，关闭区域覆盖与无用字体构建。视频 muted/playsinline/loop，有 poster 和播放/暂停；统一按钮名称“暂停动态效果”/“启用动态效果”，音乐保持独立控制。保留模板全局播放器守卫和 preload=none，减少重复初始化；清理实际动态容器中的事件与粒子。
- [ ] **Step 3：真实浏览器验证媒体故障与切页。** `media.spec.ts` 使用保留的模板本地音频/明确媒体 fixture，外部错误由路由拦截稳定触发；断言初载 `audio.paused=true`，点击音乐后播放，连续站内导航 10 次 `document.querySelectorAll('audio').length===1`、currentTime 不重置，刷新后 paused=true。检查视频请求失败仍有封面/正文，reducedMotion 与 saveData 不请求背景视频，统一暂停不暂停音乐；后台暂停与恢复以浏览器可观测事件验证。测试手机播放器不挡正文与按钮键盘操作。
- [ ] **Step 4：验收原型后提交。** `pnpm test`、`pnpm check`、`pnpm exec playwright test tests/e2e/media.spec.ts tests/e2e/navigation.spec.ts`；记录启用/暂停/播放三种状态资源和截图到 PROTOTYPE。代表文章读取正确、已确认风格具备、媒体生命周期通过后，提交 `feat: enable controllable Firefly media and effects`，再进入全量迁移。

### Task 6: 全量转换与内容完整性报告

**Files:** Modify `scripts/migration/convert.ts`, `migration/manifest.json`, `src/content/posts/**`; Create `scripts/verify-site.ts`, `tests/unit/full-migration.test.ts`, `docs/migration/CONTENT_REPORT.md`; Remove 新 worktree 的旧 `content/posts` 副本与未使用模板演示正文，保留新的唯一正文源和本地恢复快照。

**Interfaces:** `verifyMigration(manifest:MigrationManifest,targetRoot:string):Promise<{records:number;published:number;assets:number;errors:string[]}>`；`verifyRenderedSite(siteRoot:string,manifest:MigrationManifest):Promise<{errors:string[]}>` 检查 DOM/引用/公开归属。CLI `pnpm exec tsx scripts/verify-site.ts --manifest migration/manifest.json --content-root src/content/posts --site-root dist`，以模板 site-root 工具解析最终输出根。空讲义在 `contentKind/visibility/正文` 判断下进入课程说明，集合介绍在对应集合渲染。

- [ ] **Step 1：写全量核对失败测试。** 对完整 manifest 与临时副本断言 records=53、published=44、assets=578；故意改一张图片、漏一个源记录、将演示改成 published 时分别给出路径及错误。转换两次后全部字节一致，dry-run 不写目标文件。运行 `pnpm exec tsx --test tests/unit/full-migration.test.ts` 确认失败。

```ts
test('full manifest preserves every source and original asset', async () => {
  assert.deepEqual(await verifyMigration(manifest,targetRoot),
    {records:53,published:44,assets:578,errors:[]});
});
```
- [ ] **Step 2：执行 dry-run 与全量 apply。** `pnpm exec tsx scripts/migration/convert.ts --source-root /Users/zzc/Desktop/一路成长/blog --target-root src/content/posts --dry-run`；核对清单后改用 `--apply`，不带 select。正文按原字节边界保留，frontmatter 单独写入；80 张未扫描引用图保留在源库。新增正文修正记录 source/target/body hash 和 diff，不自动删重排段落。
- [ ] **Step 3：核对实际文章、输出与资产。** `pnpm test`、`pnpm check`、`pnpm build`、上述 verify-site 命令；正文路由应为 47 非空 note，公开集合数基于 44，空讲义与5集合不混入文章结果。核对全部10个含 Mermaid文件、10个 HTML 图片文件、资源实际 src/srcset/尺寸及锚点；由渲染标记关联源资产补 manifest，不能猜 `_astro` hash 文件名。验证 `/notes/` 第二页19项、所有原图 hash。
- [ ] **Step 4：提交全量内容。** 提交 `feat: migrate all research notes and assets`，附 CONTENT_REPORT；删除旧副本前确认恢复快照及新完整性报告。原 `main` 内容仍保留。

### Task 7: Pagefind、公开计数与订阅

**Files:** Modify `src/pages/notes/[slug].astro`, `src/pages/search.astro`, `src/components/pages/AdvancedSearch.svelte`, `src/components/controls/Search.svelte`, `src/pages/api/allPostMeta.json.ts`, `src/utils/content-utils.ts`, `src/utils/feed-utils.ts`, `src/pages/rss.xml.ts`, `src/pages/atom.xml.ts`, `pagefind.yml`, `scripts/run-pagefind.ts`, `scripts/site-root.ts`; Create `tests/e2e/search.spec.ts`, `tests/unit/feed-scope.test.ts`, `tests/fixtures/search-queries.json`。

**Interfaces:** `getPublicNotes/toSummary` 是所有计数和索引范围来源；Pagefind 元数据标记为 type/topic/course，标题/摘要/章节/正文可检索；查询 URL 保留 q/type/topic/course。`getFeedNotes(notes:readonly NoteRecord[]):NoteRecord[]` 仅返回具有真实 date 的公开非空正文。继续复用模板 site-root 解析，静态首版索引在 `dist/pagefind`。

- [ ] **Step 1：写公开范围与检索失败测试。** feed-scope 断言未知日期/演示/draft/集合/空正文不进入 RSS，已知日期为真实 ISO 时间。search.spec 在生产构建上搜索 InfiniDepth、DeepMimic、Bellman、法线、蒙特卡洛、进程、编译原理、五十音、ピッチ等20个实际词；准确标题/缩写目标前5，缺日期 InfiniDepth 能找到，演示查不到，点击结果进唯一正文。类型+主题+课程筛选、刷新与后退恢复，空 query/无结果可操作。先运行指定测试记录现有缺口。
- [ ] **Step 2：实现单一索引范围与 URL 状态。** 仅公开正文具有 Pagefind body，unlisted 无该标记且 noindex；导航、TOC、音乐、相关推荐忽略。列表 API 返回真实摘要对象，没有 body/content；侧栏统计共用公开计数。使用 Pagefind extended 构建，`pagefind.yml` 初版设 `force_language: zh` 合成一个索引；页面 lang 保持真实。以20个中英日查询验证分词与跨语言召回，如日语实际查询失败，记录语料与产物证据后调整分词配置，不以 YAML 存在视为通过。RSS 摘要模式，Atom 保持同一日期与公开范围。
- [ ] **Step 3：验证索引和订阅。** `pnpm build` 后 `pnpm exec playwright test tests/e2e/search.spec.ts`、`pnpm exec tsx --test tests/unit/feed-scope.test.ts`；确认索引文件请求200、结果 URL 无 `/client/` 假前缀。核对 RSS/Atom、全部计数、44公开结果归属与至少20查询报告。
- [ ] **Step 4：提交。** 提交 `feat: add filtered multilingual search and feeds`，CONTENT_REPORT 增加检索数据与范围检查。

### Task 8: 旧链接、资产地址与正式 origin

**Files:** Create `src/config/siteContext.ts`, `src/data/legacy-routes.json`, `scripts/migration/redirects.ts`, `src/pages/blog/index.astro`, `tests/unit/legacy-routes.test.ts`, `tests/unit/site-context.test.ts`, `tests/e2e/legacy-links.spec.ts`; Modify `astro.config.mjs`, `src/config/siteConfig.ts`, `src/layouts/Layout.astro`, `src/pages/notes/[slug].astro`, `src/pages/robots.txt.ts`, `migration/manifest.json`；平台规则按本任务所列条件创建。

**Interfaces:** `resolveSiteContext(env:{SITE_MODE?:string;SITE_ORIGIN?:string}):{mode:'preview'|'production';origin:URL;noindex:boolean}`，preview 默认 `http://127.0.0.1:4321`；production 必须给出已确认的非 localhost HTTPS origin。`resolveLegacyLocation(pathname:string,query:URLSearchParams,manifest:MigrationManifest):string|null`；`writeRedirects(platform:'vercel'|'cloudflare'|'nginx',manifest:MigrationManifest,origin:URL):Promise<string[]>` 只写所选平台的文件。客户端 `/blog` 查询兼容仅携带可公开的路由/筛选映射，不发布完整含 hash 的迁移 manifest。

- [ ] **Step 1：固定映射和部署输入失败测试。** 用 manifest 真记录验证原编译原理讲义/集合、中文论文路径、空讲义、author/area、folder/category/tag、notes page=2；路径加号与 `%2B` 指向同一真实记录，错误编码不能抛500，不二次 decode 或全部跳首页；未知条件提供可理解的搜索/集合入口。图片旧接口及宽度参数映射到真实静态变体，路径越界拒绝。断言 production 缺 origin 或 localhost 时 throws，preview 为 noindex。运行 `pnpm exec tsx --test tests/unit/legacy-routes.test.ts tests/unit/site-context.test.ts` 确认失败。

```ts
test('production cannot silently use preview metadata', () => {
  assert.throws(()=>resolveSiteContext({SITE_MODE:'production'}), /origin/i);
  assert.throws(()=>resolveSiteContext({SITE_MODE:'production',SITE_ORIGIN:'https://localhost'}), /origin/i);
  assert.equal(resolveSiteContext({SITE_MODE:'preview'}).noindex, true);
});
```
- [ ] **Step 2：实现单一 canonical 与映射。** 从 manifest 生成53内容路径和公开旧资产映射；标题变化保留旧锚点别名，稳定 heading 不变。修正 preview/production canonical、JSON-LD、RSS、sitemap、robots 的 origin；sitemap 的 filter 只收公开正文与真实集合，不收 unlisted/draft/旧兼容页，未知日期不写 lastmod。unlisted noindex，集合介绍不成为重复正文。禁止模板默认域名/作者残留为本站元数据。
- [ ] **Step 3：验证本地兼容并生成平台规则。** `legacy-links.spec.ts` 检查全部目标内容、图片及 hash 定位。未提供平台时只输出平台无关映射和报告；正式信息提供后：Vercel 创建 `vercel.json`（路径及查询）；Cloudflare 创建 `public/_redirects` 并为查询兼容创建唯一 `functions/blog.ts`；Nginx 创建 `deploy/nginx-redirects.conf`。仅实施当前平台，不并行维护三套。普通静态 meta-refresh 仅作预览回退，正式端点必须逐项返回真实301/308并正确 Location。
- [ ] **Step 4：提交。** 提交 `fix: preserve legacy URLs and canonical metadata`；未提供正式输入时报告明确仅完成预览/映射，不标记正式重定向已通过。

### Task 9: 500 篇规模与跨设备验收

**Files:** Create `scripts/benchmark-content.ts`, `tests/e2e/accessibility.spec.ts`, `docs/migration/ACCEPTANCE.md`; Extend `scripts/verify-site.ts`, `tests/e2e/navigation.spec.ts`, `media.spec.ts`, `search.spec.ts`。

**Interfaces:** CLI `pnpm exec tsx scripts/benchmark-content.ts --count 500 --output-dir <临时目录>`，只在临时应用副本生成样本/构建/索引，输出 JSON/Markdown 指标；不修改真实正文库。verify-site 复用 manifest 检查渲染输出，报告 errors 非空退出1。

- [ ] **Step 1：写验收用例。** accessibility.spec 验证320/390/768/1280px、200%等效视口缩放、键盘菜单/主题/目录/搜索/媒体/动效开关；隐藏菜单无可聚焦链接，页面无横向溢出，宽公式/代码/表格只在局部容器滚动。no-JS context 验证正文、分页、课程和 hash；搜索有集合入口与说明。记录首屏文字/封面先出现、媒体失败不阻塞、暂停后无粒子任务/视频预取。
- [ ] **Step 2：实施规模工具与执行。** 临时副本沿用真实渲染/图片，生成总计500公开正文：200 course、180 paper、50 log、30 idea、20 experiment、20 note；保留演示/集合过滤场景。覆盖中文长标题、同名 Lec、缺日期、长数学、代码、不同原图，分组变化正文，不复制同一短文500次。记录构建时间、峰值内存、JS/CSS/图片/媒体/索引体积、分页总数和查询；500项分页20页，筛选/计数与源记录一致。
- [ ] **Step 3：运行真实全套检查。** `pnpm test`、`pnpm check`、`pnpm build`、`pnpm exec playwright test`、verify-site、上述 benchmark 命令。ACCEPTANCE 分别记静态封面、正常效果、视频/音乐播放条件，并在同条件下比较原 Next 与 Astro；不以模板演示分数作为本站结论。任何语法/资源/旧链接阻断先修复归属任务再重跑受影响检查。
- [ ] **Step 4：提交。** 提交 `test: verify content scale and reading accessibility`；临时样本、产物和机器测量缓存不提交真实知识库，报告仅引用实测结果。

### Task 10: CI、维护交付与发布准备

**Files:** Create/Modify `.github/workflows/ci.yml`, `package.json`, `README.md`, `docs/migration/ROLLBACK.md`, `docs/migration/ACCEPTANCE.md`, `scripts/new-post.js`; Remove 旧 `.github/workflows/deploy.yml` 的 Next/GitHub Pages 自动发布配置以及确实不再使用的构建资源任务，保留使用中的媒体资产和许可。

**Interfaces:** package scripts：`test` 运行单元、`check` 运行 Astro check、`type-check` 保留模板的 TypeScript `--noEmit`、`lint:check` 为只读 Biome、`build` 包含实际所需预处理/Astro/Pagefind，`verify:site` 与 `test:e2e` 指向上述检查。new-post 产生含显式 ID/slug/type/topics/visibility 的同一 schema 文档；改标题不会再自动改地址。

- [ ] **Step 1：收口构建任务和 CI。** CI checkout `lfs:true`、Node `22.23.0`、pnpm `11.22.0`、唯一锁文件；执行 frozen install、单元、只读 lint、check、type-check、build、verify-site，浏览器回归安装所需 Chromium 后运行。当前 GitHub 卡片/LQIP/VNDB/看板娘/字体任务逐项按使用决定保留，不凭关闭页面推断脚本无影响。不得用带 `--write` 的上游 lint 做校验。
- [ ] **Step 2：更新写作和恢复说明。** README 给出新文档命令、课程讲次/主题/未知日期/公开状态、图片与旧链接说明、预览方法及模板升级差异维护；ROLLBACK 给出备份位置、恢复原改动/删除/未跟踪文件的步骤、原 HEAD、原发布版本或可恢复旧产物、对应规则/索引恢复方法。用临时目录实际试恢复并核对 hash，不直接覆盖 main。
- [ ] **Step 3：验证交付包。** `pnpm install --frozen-lockfile`、`pnpm test`、`pnpm lint:check`、`pnpm check`、`pnpm type-check`、`pnpm build`、`pnpm verify:site`、`pnpm test:e2e`、`git diff --check`。检查没有 Next/React 正文运行时、旧 npm lockfile、示例身份、draft 产物或重复 `/posts`。正式输入齐全时重建同一提交的 production 包并验证 origin/HTTP重定向；否则交付预览与未执行的发布步骤。
- [ ] **Step 4：提交与整分支评审。** 提交 `chore: finalize Astro CI and migration handoff`；按用户选择的执行方法完成独立评审，修复实质问题后提供分支差异、可访问预览、内容/检索/媒体/规模报告和恢复证据。main 的未提交修改妥善保存、正式输入齐全且用户安排发布后再合并/切换；本任务不自动 push、部署或改 DNS。

## 自审覆盖与执行交接

规格覆盖：目标/隔离/基线 → Tasks 1、2、6；内容模型 → Task 2；页面/导航 → Task 4；媒体 → Task 5；构建/渲染/图片 → Tasks 1–3；搜索/规模 → Tasks 7、9；URL/SEO → Task 8；故障/验收/回退 → Tasks 6、8–10。Review Focus 五类输入均在各归属任务有明确测试。

文件名、共享类型和函数使用本计划 Interfaces；后续实现发现上游路径或行为有差异时，先核对锁定提交及相关调用者，再以最小范围修正计划并记录理由。确认生产环境输入是发布条件，不阻止前面预览任务。

执行推荐 **Native（在当前会话由主代理逐项实施，结束后独立整分支评审）**：这些任务共享 schema、slug、图片与播放器生命周期，顺序交接比并行改动更直接。也可选择 Subagent-driven：每个任务由独立实现者和评审者完成，逐任务审查，成本更高。当前只写计划，两种执行方式都尚未开始。

参考：[锁定 Firefly](https://github.com/CuteLeaf/Firefly/tree/6d82554bfe1cb3d4b43adb0969dad1d43ac6dee3)、[Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)、[Pagefind 索引范围](https://pagefind.app/docs/indexing/)、[Pagefind 多语言与 CJK](https://pagefind.app/docs/multilingual/)。
