# 论文解析树功能设计

- 日期：2026-10-08（Asia/Shanghai）
- 状态：对话中的方案已确认；本书面设计等待用户审阅。
- 适用项目：Goongmly Research Notes，Astro / Firefly 分支 feat/astro-firefly。

## 1. 目标与已确认的选择

作者读论文时使用彭思达老师的论文解析树，把阅读过程组织为对具体问题的回答。网站需要把这份思考过程作为可展开、可收起的树展示给读者，并允许作者在线编辑。

用户已确认：

- 第一阶段聚焦论文解析树，一篇 Paper 研读笔记关联一棵树；流程图留到之后。
- 使用 GitHub 登录，只有作者本人可以读取草稿、编辑、保存和发布。
- 使用独立 GitHub 私有仓库保存草稿和修改历史。
- 保存私人草稿，手动发布；读者继续看到上一次成功发布的版本。
- 树的默认模板按用户提供的两张截图，保留完整层级、问题和提示文字。
- 单侧向右布局，节点可以自由编辑、增删、移动和复制分支。
- 沿用博客已有字体、字号、蓝色主题与按钮交互，尽可能复用公共组件。

工程选择：优先采用 Mind Elixir 核心库；作者接口单独部署；发布后的图文件和文字大纲随博客构建。以下工程细节随本书面设计一起接受审阅。

成功标准：作者可以按模板整理一篇真实论文，跨设备继续编辑私人草稿，发布后读者能逐层浏览；保存、构建或部署失败均不会使未发布内容出现在公开站点。

## 2. 现有项目与选型

当前博客是 Astro 静态网站，使用 Svelte 客户端组件；Paper 笔记使用现有 posts 内容集合中的 type=paper，经 src/pages/notes/[slug].astro 渲染。NoteData 已有稳定 id、slug、visibility 和 paper 资料字段。

现有 Mermaid / Merman 管线在构建时生成 SVG，适用于正文中的静态图；本功能增加可编辑的树组件。现有 marked、KaTeX、sanitize-html 可以用于节点内容解析。共享样式使用微软雅黑字体栈和 22 / 18 / 14 / 12px 字号。

当前正式网站托管于 Vercel。现有 .github/workflows/ci.yml 负责检查，正式发布仍使用指定 feat/astro-firefly 提交创建暂存部署、验证、promote 的流程；Vercel 的 Git 生产分支仍为 main。新功能必须补齐发布自动化，不能假定当前 CI 已支持解析树发布，也不能自动合并或覆盖原 main 工作区。

| 候选 | 核查结果 | 本阶段决定 |
| --- | --- | --- |
| [Mind Elixir](https://github.com/SSShooter/mind-elixir-core) | MIT；框架无关，具有节点展开状态、编辑、撤销、图片与链接数据，支持自定义 Markdown 解析 | 优先选用，复用浏览与编辑的核心树实例 |
| [draw.io](https://github.com/jgraph/drawio) | Apache-2.0；有嵌入编辑器与交互查看器，容器可以折叠 | 下一阶段流程图再评估 |
| [Svelte Flow](https://github.com/xyflow/xyflow) | MIT；提供节点画布，树布局和编辑工具需要进一步组合 | 第一版不自行构建通用编辑器 |
| [Markmap](https://github.com/markmap/markmap) | MIT；将 Markdown 大纲显示为思维导图 | 直接画树的编辑体验与本次目标有差异 |
| [SimpleMindMap](https://github.com/wanglin2/mind-map) | 开源库为 MIT；仓库标注低维护，客户端及插件闭源 | 不作为首选 |

调研为源码和官方文档核查，尚未进行实际集成测试。实施开始时必须用代表性模板验证 Mind Elixir 的只读折叠、长中文文本、公式、导出和生命周期。若核心能力不满足要求，先报告差异并修订设计，不能静默替换为另一种编辑体验。

## 3. 模板内容

模板标识为 pengsida-paper-analysis-v1，来源为用户在本次对话提供的两张截图。此标识用于站内追踪模板版本，不表示本项目是老师的官方工具。

根节点初始名称为“论文解析树”，创建后作者可以修改。五个主分支按 Abstract、Introduction、Method、Experiments、Limitation 排序。完整初始结构如下：

~~~text
论文解析树
├─ Abstract
│  ├─ Task
│  ├─ Technical challenge for previous methods
│  │  （围绕我们解决了的 technical challenge 展开讨论）
│  ├─ 一句话介绍解决 challenge 的 key insight/motivation
│  │  （insight 和 technical contribution 不一样，
│  │   insight 是比较通用的 high-level 的思想）
│  │  ├─ 一句话介绍 insight/motivation
│  │  └─ 一句话介绍 insight 的好处
│  │     （不一定要在这里说，因为如果后面要提 technical contribution，
│  │      还会再说 technical advantage）
│  ├─ 介绍 technical contributions
│  │  ├─ technical contribution 1
│  │  │  ├─ 一句话介绍 technical contribution 1
│  │  │  └─ 一句话介绍 technical contribution 的好处
│  │  └─ technical contribution 2
│  │     ├─ 一句话介绍 technical contribution 2
│  │     └─ 一句话介绍 technical contribution 的好处
│  └─ Experiment
├─ Introduction
│  ├─ Task and application
│  ├─ Technical challenge for previous methods
│  │  （围绕我们解决了的 technical challenge 展开讨论）
│  │  ├─ Technical challenge 1
│  │  │  ├─ Previous method
│  │  │  ├─ Failure cases (Limitation)
│  │  │  └─ Technical reason
│  │  └─ Technical challenge 2
│  │     ├─ Previous method
│  │     ├─ Failure cases (Limitation)
│  │     └─ Technical reason
│  ├─ 介绍解决 challenge 的 our pipeline
│  │  ├─ 一句话介绍 key innovation/insight/contribution
│  │  ├─ contribution 1
│  │  │  ├─ 具体怎么做的
│  │  │  └─ 讨论 advantage/insight
│  │  └─ contribution 2
│  │     ├─ 为了解决什么问题
│  │     ├─ 具体怎么做的
│  │     └─ 讨论 advantage/insight
│  └─ 酷的 demos/applications
├─ Method
│  ├─ Overview
│  │  ├─ 具体的任务
│  │  │  输入：…
│  │  │  输出：…
│  │  └─ 方法
│  │     第一步：…
│  │     第二步：…
│  │     第三步：…
│  ├─ Pipeline module 1
│  │  ├─ Motivation
│  │  ├─ 做法
│  │  ├─ 为什么能 work
│  │  └─ technical advantage
│  └─ Pipeline module 2
│     ├─ Motivation
│     ├─ 做法
│     ├─ 为什么能 work
│     └─ technical advantage
├─ Experiments
│  ├─ Comparison experiments
│  └─ Ablation studies
│     ├─ 论文的 core contributions 以及一些重要的 components
│     │  对论文方法 performance 的影响
│     └─ 列出每一个 pipeline module 中的 design choices
│        对论文方法 performance 的影响
└─ Limitation
   需要给 limitation 做出合理的解释：
   为什么我们的方法有这样的 limitation
~~~

缩进后的括号说明，以及 Overview / Limitation 的续行文字，属于对应节点的多行内容，不额外生成子节点。截图中 Limitation 的末尾被截断，此处按可见语义补全为“为什么我们的方法有这样的 limitation”，供书面审阅确认。

截图里的独立“…”表示可以继续添加同类分支，不生成一个名为“…”的叶子节点。初始提供截图中的两组 challenge、contribution 和 module；复制整组分支时保留内容并生成新的节点 ID，作者自行修改编号。输入、输出和步骤中的“…”是可编辑的提示文字。

模板仅用于创建，之后不强制五分支或固定问题表单，不覆盖作者修改；模板升级也不会自动改动既有树。

## 4. 公开浏览与作者编辑

### 4.1 论文笔记中的解析树

有已发布树的论文页，在“论文资料”后、正文前展示解析树；内嵌文章目录和右侧目录增加同一个“论文解析树”锚点。没有已发布树的论文页保持现有阅读结构，不显示空图或私人草稿状态。

根节点深度为 0，默认显示深度 0、1、2；深度 2 的后续子树初始收起。点击有子节点的节点或其折叠按钮切换整棵子树；叶子节点可以打开详情。有说明的父节点也提供独立的详情入口，避免折叠操作阻止阅读说明。节点链接作为独立可聚焦元素，点击链接不触发折叠。

读者可以缩放、适应画布、全屏、查看节点详情，或切换文字大纲。浏览器内的折叠和视口状态不写回服务器。第一次显示只加载当前论文的已发布图；滚动图区域之外时保留页面正常滚动。

节点标题允许多行，长提示完整保留；较长的阅读记录放在节点说明中，详情区显示完整内容。文字大纲输出全部公开节点的标题、说明和层级，支持键盘阅读，并在构建时加入当前论文的 Pagefind 内容。图形交互区域不重复索引同一份文本。

JavaScript 禁用、图组件加载失败或手机画布不便浏览时，大纲仍可阅读。图失败不阻断正文、图片、公式、目录和返回按钮。

### 4.2 作者工作区

作者工作区使用独立入口 /studio/paper-trees/ 和按论文 ID 定位的编辑页；工作区内部保持编辑页面与作者接口同源。博客中的“编辑解析树”是作者工作区入口，显示入口本身不授予写入权限。

登录后可以选择论文、创建空树或模板树、读取草稿和查看上一次成功发布的版本。初版主交互面向桌面，手机提供可用的浏览、大纲、文本编辑和显式操作按钮，编辑不得只依赖拖动。

编辑时单击选中节点，双击编辑文字；折叠按钮控制展开状态。支持新增子节点、同级节点，增删与移动节点，复制分支，撤销与重做，节点说明、Markdown、LaTeX 和正文锚点链接。删除非叶子节点时明确说明会删除该子树并提供确认；撤销可以恢复。

提供“保存草稿”“预览发布内容”“发布”“版本历史”和 JSON 导入、导出。保存由按钮或 Ctrl/Cmd+S 触发；本阶段不把每次键入变成远端 Git 提交。发布操作先保存并校验当前编辑内容，再固定其版本。

导入只接受本项目带版本号的树 JSON，经完整验证后替换当前内存草稿，需要另行保存。导入时重新绑定当前论文，并重新生成节点 ID；不能借文件指定其他论文、仓库路径或发布状态。Markdown 支持指节点内容解析，本阶段不实现任意 Markdown、XMind 或 draw.io 文件互转。

UI 分别显示编辑状态“未保存 / 保存中 / 草稿已保存 / 保存失败”和发布状态“未发布 / 发布中 / 已发布 / 发布失败”。草稿已保存不表示当前草稿已公开；历史公开版本与更新后的草稿可以同时存在。保存成功后才清除未保存标记。

### 4.3 复用与样式

复用主站的微软雅黑字体栈、22 / 18 / 14 / 12px 字号变量、白色内容容器、蓝色强调色以及暗色变量。复用 btn-plain、knowledge-action、toc-item、BackLink 的交互与焦点样式；节点自身用 Mind Elixir 主题变量对接现有颜色。

公开 viewer 和编辑器共享模板、节点模型、内容解析与树核心封装；编辑工具及作者 API 客户端仅在工作区加载。Mind Elixir 的视口使用其自身能力，既有 Mermaid 图的 pan/zoom 插件继续服务 SVG，避免同一画布上重复绑定两套变换。

初始化和销毁覆盖 Swup 导航生命周期；多次进入同一论文页不能重复注册事件。工具栏可换行，画布溢出限制在图区域，触摸和鼠标操作不能导致整页横向溢出。

## 5. 数据边界与仓库结构

### 5.1 一篇论文对应一棵树

使用现有 NoteData.id 关联论文，不依赖标题或 slug。服务器根据受信任的论文清单验证 id、type 和 visibility，并生成安全的 paperKey；客户端不能提交存储路径。私有作者清单可以包含草稿论文元数据，只经鉴权接口返回。

只有 visibility=published 且 contentKind=note 的 Paper 笔记可以公开发布树；其他状态允许保存私人树草稿。笔记改为 unlisted 或 draft 后，下次站点发布从公开产物、公开树清单和搜索中一并移除对应树。unlisted 的正文继续遵守网站现有行为，解析树不额外公开。

草稿封装包含 schemaVersion=1、paperId、templateId、更新时间与树数据。树数据沿用 Mind Elixir 的 nodeData / children 结构及受控样式、方向字段；持久化时移除运行时 parent 引用。节点保存唯一 id、topic、可选 note、hyperLink、expanded 和 children。nodeData 是唯一根；第一版不增加自由连线、流程执行或通用图模型。

公开投影只包含展示所需的 schemaVersion、paperId、公开版本标识、发布时间和清理后的树数据。通过字段白名单生成，丢弃未知 metadata、原始 HTML、私有说明字段、作者会话和仓库信息。

初版接收边界：单棵树 JSON 最大 1 MiB、最多 500 个节点、最大深度 32；topic 最多 1,000 字符，note 最多 20,000 字符，整体仍受 1 MiB 限制。拒绝重复 ID、循环引用、无效根、危险链接和超限输入，明确指出对应节点。本阶段图数据不接受内嵌图片、附件或文件上传；作者可在论文正文中继续使用现有图片功能。

JSON 导出使用同一版本化封装，允许离线备份和后续恢复；版本迁移在 schemaVersion 改变时显式进行，不能静默丢失节点。

### 5.2 私有数据仓库

私有仓库建议名为 paper-analysis-data，仅用于本功能；用户审阅通过并进入实施阶段后再创建。存储结构承担具体职责：

| 路径 | 内容及权限 |
| --- | --- |
| drafts/<paperKey>.json | 当前私人草稿，经作者接口读写，以文件 blob SHA 防止覆盖 |
| snapshots/<snapshotId>.json | 某次明确发布或回退所用的不可变公开投影 |
| releases/<releaseId>.json | 一份完整发布清单，映射论文到快照，并记录父发布版本 |
| jobs/<jobId>.json | 私有发布作业状态、源提交、目标版本、部署结果与错误摘要 |
| control.json | 最新成功发布指针、基线部署 ID、当前作业 ID，用于串行发布 |
| .github/workflows/publish.yml | 显式触发的构建、验证、部署流程 |

本阶段只有一个作者。Git 负责文件历史和版本定位，无额外数据库。历史草稿也留在私有 Git 历史中，不拷贝到博客源码、公开发布分支、静态构建产物或公共 CI 附件。

保存草稿携带读取时的 blob SHA，冲突返回 409，保留本地内容并提示重新载入或导出备份。初始化、发布快照和作业登记需要同一逻辑事务时，用 Git 提交一次更新，并以非强制、非快进冲突检测避免两个请求同时取得发布资格。不能以 force 更新覆盖其他标签页写入。

## 6. GitHub 登录与作者接口

使用 GitHub App 的用户授权流程完成登录；服务端获取已认证用户的数字 ID，与唯一允许的作者 ID 比较。显示名 Goongmly、GitHub 用户名或前端提交的作者字段均不作为身份凭据。其他账号登录不创建作者会话。

App 在所需仓库范围内安装；数据仓库需要 Contents 读写与 Actions 读写，以保存文件、显式触发工作流并查询状态。若博客源码仓库为私有，构建环境另配仅用于读取该源码仓库的凭据。常规运行无需仓库管理或修改工作流文件的权限。[GitHub App 权限说明](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)

验证 OAuth state，服务端交换授权码并验证用户。生产会话使用签名、限时的 HttpOnly / Secure / SameSite=Lax Cookie，默认有效期 2 小时；退出清除 Cookie，服务端密钥轮换撤销已有会话。所有私人读取与写入接口均重新验证会话及作者 ID，写入额外验证 CSRF token 和同源请求。GitHub 密钥和存储、部署凭据不进入浏览器。

接口按职责保持小范围：

| 接口职责 | 行为 |
| --- | --- |
| 登录 / 回调 / 退出 / 当前会话 | 完成作者身份验证；匿名会话只返回未登录状态 |
| 论文清单 / 草稿读取 | 仅作者可读，返回当前草稿及版本凭据 |
| 草稿保存 | 校验内容、文章关联与版本；成功返回新版本 |
| 发布申请 | 固定草稿与站点源码版本，创建发布作业；立即返回作业 ID |
| 作业查询 / 版本历史 | 仅作者可读，展示成功、进行中或失败状态 |
| 公开版本回退申请 | 指定以前成功版本，走相同发布与验证流程 |

接口不能代理任意 GitHub API、路径或部署目标。草稿响应、会话和编辑页面数据使用 no-store；私人 API 错误不能返回凭据或原始私人文件。

节点 Markdown 禁用作者输入的原始 HTML，受控解析与 KaTeX 生成的展示内容再按允许的标签和属性清理，保留正常公式所需结构。拒绝脚本、事件属性和 javascript: 链接；显示错误公式的源码与提示，不因一条公式失败而破坏整棵树。

## 7. 手动发布、失败恢复与回退

作者点击发布后，后台固定草稿版本，并从“最新成功发布清单”生成候选清单，只替换本次论文的图。失败作业的候选快照不能成为后续发布的默认基线。

流程如下：

1. 校验会话、论文公开状态、树结构和草稿版本；若当前有活动发布，返回其状态，不创建第二个正式发布。
2. 原子创建不可变快照、候选发布清单和私有作业记录，固定站点源码提交 SHA。用本次提交返回的数据 SHA 触发工作流，后续状态提交不改变本作业读取的数据版本。
3. 显式触发私有仓库的发布工作流。接口不等待整站构建完成；浏览器可关闭后重新查询同一作业。
4. 工作流只读取候选清单指向的快照，生成公开 JSON 与文字大纲。既有私人草稿不能作为整目录缓存、上传或构建输入。
5. 检出明确配置的博客源分支，并使用已固定提交构建、校验和创建暂存部署；当前设计基线为 feat/astro-firefly，禁止默认取 main。依据该源码版本的论文公开状态校验整份候选清单，包括回退时的历史树；移除不再公开的关联。使用现有 pnpm 完整构建链，保持正式 origin 与生产模式设置。
6. 暂存部署必须启用访问保护；未登录请求不能读取候选 HTML 或图文件，自动检查通过受限凭据访问。校验公开性、树版本、Pagefind、代表页面和部署元数据；通过后才 promote 为正式部署。验证前不自动分配任何公开生产域名。
7. 核对正式域名的公开发布回执，再更新私有成功发布指针、完成作业并释放发布资格。

本功能补齐以上流程的自动化，但不会自动改变 Vercel 的 Git 生产分支设置。代码后续正式发布也从同一最新成功图清单构建，避免普通代码部署把解析树清空或发布失败候选内容。

待发布和失败的暂存部署也属于私人边界。实施时核查项目实际的 [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) 配置，并用匿名请求验证保护；不能把难猜的部署网址或 noindex 当作访问限制。若当前配置无法隔离候选产物，发布流程必须停止，先解决这一边界。

构建时无树配置的本地开发可以运行现有博客；开启树功能的生产发布若无法读取指定清单或缺少快照，必须失败，不能降级为“发布一个没有树的网站”。生产构建仍使用 PUBLIC_SITE_MODE=production 和正式 PUBLIC_SITE_ORIGIN，预览构建继续 noindex。

作业状态为 queued、building、validating、deploying、published 或 failed。失败记录阶段与可理解的错误摘要，并保留草稿、候选快照及最后成功部署；再次发布显式创建新作业。超时或结果不明时，先查询工作流及正式回执，不因轮询超时就解除正在执行的发布。

公开产物包含最小发布回执 /paper-trees/release.json，以及按不可变快照 ID 命名的图文件。回执使用 no-store，发布核验同时检查部署 ID 和目标版本，不能以缓存的旧回执判断成功。图文件可使用长期缓存；HTML 引用同一版本的图和大纲，并保证已发布 HTML 引用的快照仍可读取。如果 promote 成功但私有结果写入失败，以正式回执和部署状态进行恢复，不能误报失败后继续用旧指针发布。

初次启用时以空的成功图清单开始，登记当前可回退的正式部署。回退从历史成功清单构建一个新的发布，保留当前草稿；紧急情况可以恢复保留的完整部署，随后同步私有成功指针。完整部署回退会同时恢复该版本的文章和资源，执行前明确这一范围。回退也经过单一发布资格与正式域名核验。

## 8. 部署与现有代码的衔接

公开博客继续使用现有静态托管。作者工作区和 Node 函数接口作为独立 Vercel 作者服务项目部署，建议域名 studio.blessingworld.cn；工作区页面与 API 同源，避免跨站会话。设计阶段不创建项目、应用、仓库、凭据或 DNS 记录。

后续博客若迁到 OSS＋CDN，公开 HTML、图 JSON 和大纲仍可以静态托管；作者服务可以继续独立运行。OSS 迁移及流程图编辑器均不纳入本次实施。

站点改动集中在论文页、目录锚点、图组件、公开投影与构建读取。公共 viewer 与作者工作区共享树封装、模板、数据校验和样式；作者服务通过专门 GitHub 存储与发布模块访问私人仓库。第一版不建立多种绘图库的通用适配层。

保持正文 MD/MDX、现有网址与旧链接兼容映射；不把解析树编辑扩展为在线编辑全文。主站构建过程只获得读取所选公开投影需要的数据，作者服务凭据与私人 API 不进入博客静态产物。

## 9. 规模、性能与可访问性

- 500 篇及以上文章时，每篇仍通过稳定 ID 关联独立树；文章页不下载全站树数据。
- 发布清单只包含公开关联与快照引用；构建按清单取文件，不依赖单目录超过 1,000 项后的 Contents API 列表截断行为。
- 公共图在进入视口时初始化；文字大纲先随 HTML 显示，作者工具在独立工作区加载。
- Markdown、公式和字体资源使用站内构建资源，读者浏览不直接请求 GitHub 私人 API，也不加载远端编辑器 CDN。
- 控件提供可读名称、键盘焦点和展开状态；大纲具有语义层级，并作为图形操作的替代入口。
- 代表性性能验证包含完整模板、100 节点、500 节点和 500 篇论文清单；只读折叠、文字换行及滚动不得导致整页卡死或横向溢出。
- 具体加载耗时和包体积由实施阶段测量记录，不把开源项目的性能宣传当成验收结果。

## 10. 验收标准

| 方面 | 必须验证的结果 |
| --- | --- |
| 模板 | 五主分支、全部截图问题和层级、Overview 多行内容正确；复制分支生成唯一节点 ID |
| 关联 | 修改文章标题或 slug 不丢失树关联；非 Paper、无效 ID、非公开笔记的发布被拒绝 |
| 浏览 | 默认显示深度 0–2，节点展开 / 收起整棵子树；正文链接不误触折叠；图与大纲同版本 |
| 内容 | 长中文提示完整换行；Markdown、链接、下标和高分式正常，非法 HTML / 链接被清理；错误公式有局部回退 |
| 编辑 | 增删、移动、复制、撤销、重做、保存、JSON 导入导出及刷新后读取草稿可用 |
| 身份 | 未登录、其他 GitHub 账号、过期会话不能读取私人树或保存、发布、回退；伪造作者 ID / CSRF / 路径被拒绝 |
| 保密 | 给草稿和失败快照放入独特标记，检查 HTML、JSON、JS、搜索、feeds、sitemap、公开附件和日志均无泄露；匿名不能读取候选及失败部署 |
| 冲突 | 两标签页同时保存触发版本冲突，不覆盖未保存内容；两个发布申请只能取得一个发布资格 |
| 发布 | 保存不更新公开版本；构建 / 校验 / 部署失败保留旧版；后续发布不带入失败候选图 |
| 恢复 | promote 后结果记录失败可通过公开回执恢复；回退成功且草稿保留 |
| 导航 | Swup 重复进入页面没有重复事件、内存中的旧实例或私有数据残留；共享导航、返回按钮、目录不回归 |
| 移动与无脚本 | 手机可浏览和操作大纲，无整页横向溢出；禁用 JavaScript 时正文和完整公开大纲可读 |
| 构建 | 现有适用单元、类型、构建、公开性和浏览器检查通过；缺少生产图输入导致发布失败 |

这些是待实施的验收要求，文档编写本身不代表功能已实现或检查已通过。

## 11. 本阶段边界与后续交接

本阶段完成单作者论文解析树的浏览、编辑、私人保存、手动发布及版本恢复。后续独立评估 draw.io 流程图、图片上传、XMind 互转和多人协作；本次不为这些功能预建账户系统、通用图编辑平台或数据库。

实施需要配置作者 GitHub 数字 ID、GitHub App、私有仓库、作者服务来源、发布源码提交来源、Vercel 项目与发布凭据。这些属于实施环境配置，实际值在相应平台的受限设置中填写，不写入本设计或公开仓库。新项目和 DNS 切换在代码与可验收环境准备完成后执行。

用户审阅本书面设计并确认后，才编写实施计划；实施计划再接受审阅并选择执行方式。当前交付仅为设计文档。

## 12. 调研依据

- [Mind Elixir 源码与使用说明](https://github.com/SSShooter/mind-elixir-core)：核心能力、节点数据和自定义 Markdown 接口。
- [Mind Elixir editable 配置](https://docs.mind-elixir.com/docs/api/mind-elixir.options.editable)：浏览与编辑模式配置入口。
- [draw.io 嵌入协议](https://www.drawio.com/docs/reference/embed-mode/)及[容器折叠](https://www.drawio.com/docs/manual/shapes/container-shapes/)：后续流程图候选的能力边界。
- [Svelte Flow 布局说明](https://svelteflow.dev/learn/layouting/overview)：布局需要组合外部算法。
- [GitHub App 用户认证](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user)及[用户 ID](https://docs.github.com/en/rest/users/users#get-a-user-using-their-id)：作者认证与持久身份。
- [GitHub 文件写入](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)、[Git 引用更新](https://docs.github.com/en/rest/git/refs#update-a-reference)和[显式工作流触发](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)：版本写入、冲突检测及发布作业基础。
- [Vercel Functions](https://vercel.com/docs/functions)：独立作者接口的部署候选。
- 用户提供的两张解析树截图：模板内容与结构的直接来源。

以上链接用于说明已有项目和平台能力；本文件的权限规则、发布事务、数据边界和验收条件是本项目的设计要求。
