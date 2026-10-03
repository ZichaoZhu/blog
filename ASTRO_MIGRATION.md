# Astro 迁移计划

日期：2026-10-03。状态：**已在独立分支实施并完成本地内容、搜索、媒体和规模验证；未正式发布**。

依据：当前工作区、[AUDIT.md](AUDIT.md)、[REDESIGN.md](REDESIGN.md)、用户提供的教程和 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)，以及 Astro、Pagefind 的维护者文档。根据最新模板参考，将原先的 AstroPaper 首选改为 **Firefly 原型路线**。本文在框架与实现路径上替代 REDESIGN.md 中“继续使用 Next.js”的建议；原有内容优先、稳定地址、课程顺序和主题分类原则继续适用。

最新决定：**采用 Firefly 模板风格，开启视频、音乐和装饰效果，在 feat/astro-firefly 分支迁移。** 这取代上一版方案以及 REDESIGN.md 中禁用视频、渐变、毛玻璃和动画的视觉约束。内容完整、导航清楚、正文可读的要求继续作为验收标准。用户已批准 Native 执行。实现位于独立 worktree，交付状态与实测证据见 [ACCEPTANCE](docs/migration/ACCEPTANCE.md)。

## 1. 建议采用什么

**推荐：以 Firefly 为主题参考和原型基础，采用 Astro + Markdown Content Collections + Pagefind + 构建时图片处理，以静态站点发布。**

这与你的主要任务相符：写课程讲义、阅读论文、积累研究日志、通过主题和搜索回顾知识。现有内容不依赖登录、数据库、实时服务或复杂应用状态，运行时 Next.js 服务并非这些任务的必要条件。

Astro 可以简化内容渲染和部署；它不会自动解决分类不清、正文太窄、导航拥挤等问题。因此这次应直接利用成熟模板的布局、排版、导航和搜索，只添加科研知识主页确实需要的课程、论文、研究集合。不要把上一版的整套 React 界面逐个翻译成 Astro。

Firefly 提供可配置侧栏、文章列表、中文 UI、深浅色和 Pagefind 等基础能力，适合用作这次界面原型。课程顺序、研究分类、unlisted 状态和当前 URL 仍需适配，不能宣称复制文章后全部自动具备。[Firefly README](https://github.com/CuteLeaf/Firefly/blob/master/README.md)

当前评估阅读了 README、依赖、Astro 配置、内容 schema、内容/URL 工具及相关功能配置和 Mermaid 插件。现已安装锁定依赖、运行静态构建及浏览器验收；53 份正文与 578 张原始图片核对完成。

选择框架的目标是减少需要长期维护的代码，并以真实文章验证阅读体验。性能改善需要在原型中测量，不采用教程中通用的提速比例或 Lighthouse 分数作为本站承诺。

## 2. 模板选择与视觉方向

| 路线 | 适合的阅读方式 | 本站需要补充的部分 | 判断 |
| --- | --- | --- | --- |
| Firefly | 个人主页与文章；视频横幅、音乐、装饰和阅读布局可配置 | 个性化媒体、课程顺序、受控主题、日期兼容、旧 URL | 已选择，作为迁移基础 |
| AstroPaper | 简洁的文章、论文与日志；通过集合页进入课程 | 课程目录与上下篇、受控主题、科研类型、日期兼容、旧 URL | 备用，不再作为默认路线 |
| Astro + Starlight | 课程/知识文档为中心，左侧常驻分类，右侧文章目录 | 个人主页、时间线、论文/研究元数据与跨分类聚合 | 如果你优先希望文档站式阅读，则选择这一条 |
| Astro 官方基础 Blog 模板 | 小型时间顺序博客 | 搜索、分类、科研集合和更多布局仍需自行补齐 | 对减少自建界面的帮助较小，不作为首选 |

Starlight 已有文档侧栏、页面目录和 Pagefind 搜索；这是另一种产品组织方式，并非仅替换博客皮肤。[Starlight 内容指南](https://starlight.astro.build/guides/authoring-content/)、[搜索指南](https://starlight.astro.build/guides/site-search/)

首版直接以 Firefly 建立原型，保留它的布局、组件和视觉语言，优先通过配置启用功能。业务适配集中在内容 schema、课程关系、集合页和 URL。AstroPaper 与 Starlight 仅保留为历史选型记录，不进入此次实施范围。

视觉策略：

- 保留 Firefly 的横幅、页头、圆角面板、侧栏、列表、深浅色和主题色能力；采用模板原有配色与装饰，先替换个人身份和导航，再调整中文排版及正文宽度。
- 中文正文使用系统无衬线字体，代码使用系统等宽字体；正文约 17–18px、行高约 1.75–1.85，最终依据真实文章调整。
- 文章正文建议最大宽度约 720–780px；公式、表格和代码在各自容器中滚动。
- 首页通过视频横幅呈现个人身份与研究方向，横幅后紧接内容入口、精选和最近记录；课程/论文页保留清楚的标题与列表。
- 开启视频、音乐、打字机、横幅波浪/渐变、导航毛玻璃、轻量樱花和页面过渡；正文面板维持足够不透明度与对比度，装饰层不拦截点击或遮住文字。
- 使用同一模板的菜单、焦点状态和主题切换，检查中文长标题及手机触控。
- 初版关闭每篇 OG 图生成，使用统一静态分享图。Firefly 自定义字体配置改为系统字体，包含代码及各区域字体覆盖，避免额外字体构建和请求。[站点配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/config/siteConfig.ts)、[字体配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/config/fontConfig.ts)

**先验收真实文章的原型，再批量迁移。** 如果原型依然不满意，应先调整模板选择与阅读布局。

### 2.1 Firefly 首版取舍

| 部分 | 首版决定 | 实现边界 |
| --- | --- | --- |
| 页面框架、文章面板、主题切换 | 保留 | 沿用模板基础，不另外建立一套组件系统 |
| 视频背景 | banner 模式，playerEnable = true | 首页支持静音循环视频，保留播放/暂停按钮与静态封面；文章页缩短横幅，视频不进入正文背景 |
| 音乐 | 启用导航入口和侧栏播放器 | 手动播放、默认音量约 0.25、可暂停/静音；优先 local 播放列表，明确选择在线歌单后再接入 Meting |
| 横幅装饰 | 开启打字机、波浪，以及主题提供的渐变过渡 | 沿用模板的波浪/渐变切换逻辑，不额外叠加一套效果；个人标题与链接仍可无动画读取 |
| 毛玻璃与面板 | 保留导航/浮层毛玻璃和圆角卡片 | 正文保持稳定背景；检查视频不同帧和深浅色下的文字对比度 |
| 樱花 | 开启轻量樱花，初始约 8–12 个粒子 | 通过模板配置降低密度；不捕获指针，不覆盖代码、公式和目录操作 |
| 列表 | 桌面和手机都用 list，分页约 25 篇 | 不默认使用手机 grid 或瀑布流；科研笔记不配随机封面 |
| 首页侧栏 | 个人资料、音乐、课程/类型入口和主题入口 | 可保留真实写作统计与热力图；没有内容的公告和动态不显示 |
| 文章侧栏 | 当前课程上下文 + 文章 TOC，音乐入口可用 | 宽屏播放器可收起，手机保留导航中的紧凑入口；避免留下空侧栏列 |
| 文章上下篇 | 课程按 course.order/seriesOrder | 不沿用全站日期上下篇；其他笔记可用明确的相关链接 |
| 相关推荐 | 首版保留人工相关链接，关闭随机推荐 | 无需在每篇文章构建时计算全库随机/相似推荐 |
| 扩展页面 | 首版围绕 Courses / Papers / Research / Projects | 相册、追番、游戏资料、打赏、留言板和看板娘不属于此次迁移；科研日志仍是正文笔记 |
| 评论与追踪 | 初版关闭 | 移除演示配置；以后有明确需求再接入 |
| Swup | 保留模板页面过渡，复用现有运行时 | 验证视频/音乐状态、返回、hash、搜索、焦点及脚本重挂载；不能重复创建播放器、粒子或事件监听 |

上表是本站拟采用的决定。源码提供背景视频、打字机、波浪/渐变、导航模糊、音乐入口和樱花配置；樱花在本次读取的上游配置中默认关闭，迁移时需明确开启。媒体生命周期和减少动态效果的适配需在原型中验证，不能仅凭配置存在就认定已经实现。[背景配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/config/backgroundWallpaper.ts)、[音乐配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/config/musicConfig.ts)、[特效配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/config/effectsConfig.ts)

### 2.2 布局原型

- 首页：视频横幅与个人标题 → Courses/Papers/Research/Projects 入口 → 精选与最近记录；侧栏保留个人资料、音乐和主题。桌面横幅初始约 300–420px，手机约 180–240px，以真实预览调整，确保内容入口容易到达。
- 课程页：课程介绍与来源、按讲次排序的讲义；课程目录属于当前课程，不铺开整个知识库。
- 文章页：较短横幅、标题/类型/来源或日期 → 正文 → 课程上下篇或人工相关链接。宽屏侧栏用于课程上下文和 TOC，音乐入口可收起，正文优先保证宽度。
- 手机：单列正文，菜单、课程目录和 TOC 可展开；视频可播放，音乐使用紧凑入口，降低粒子密度；不把桌面双侧栏压缩成三列。
- 替换 Firefly 演示名称、头像、Logo、社交链接和作者资料。未指定素材时先用模板示例做本地原型，正式发布所用视频、封面和音乐清单单独记录，不让素材选择阻塞文档兼容验证。

这些调整用真实编译原理长文、操作系统图文、强化学习 Callout、InfiniDepth 公式论文与日语笔记验证。优先完成首页、课程页和文章页三个可审阅页面。

### 2.3 视频、音乐和动画的行为

- 视频采用静音、行内播放及静态封面；自动播放被浏览器阻止时仍能点击播放。视频失败、离线或弱网时保留封面与全部导航，不出现空白横幅。
- 音乐在用户点击后播放，切页不重复启动；记录音量和播放选择。优先复用主题播放器；原型验证导航与侧栏是否共享同一音频实例，歌单/API 失败只影响播放器。
- 提供一个可见的“暂停动态效果”控制，覆盖视频、打字机、樱花、波浪和页面过渡，并保存选择。prefers-reduced-motion 时以静态封面和普通文字为默认；音乐仍可手动播放。没有确认现有主题已覆盖全部这些行为，缺口作为最小适配任务。
- 非前台页面暂停装饰动画和背景视频；音乐只遵循用户的播放操作。移动端正常模式保留效果，节省流量模式采用封面且不预取视频/音频。
- 视频封面、文字和内容入口先显示；音乐不在首屏下载整份音频，正文图片与搜索不等待媒体请求。原型分别记录媒体关闭、开启和正在播放时的加载量与流畅度。
- 验证键盘播放/暂停、焦点可见、读屏标签和无 JavaScript 阅读；动画层不进入搜索索引，过渡结束后焦点落点合理。

浏览器可能限制自动播放，不能承诺所有设备自动开始播放。这里的静音、用户手动播放和动态降级是媒体体验的实现要求。[MDN 自动播放指南](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)、[prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

## 3. 教程与当前版本的区别

用户提供的[教程](https://blog.moewah.com/posts/zero-to-astro-blog-deployment-guide/)可以帮助理解创建项目、Markdown、模板与静态部署。它发表于 2025-07-15，其中 Node 版本和内容 API 示例不能直接用于当前工程。

本次核查：

- Astro 安装文档要求使用受支持的 Node 版本，Firefly 的当前 package.json 进一步要求 Node >=22.23.0。现有 CI Node 20 和本机 Node 25 都不作为本方案基线；实施时统一为满足模板要求的 Node 22 LTS 小版本，并验证包管理器兼容。[Astro 安装要求](https://docs.astro.build/en/install-and-setup/)、[Firefly 依赖源码](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/package.json)
- 当前内容集合使用 src/content.config.ts、glob() loader、getCollection() 和 render(entry)。不要照搬旧示例中的 post.render() 或假定 entry.slug 一定存在。[Content Collections](https://docs.astro.build/en/guides/content-collections/)
- 本次读取的 Firefly master 分支 package.json 标注模板版本 6.16.8、Astro 7.3.2、pnpm 11.22.0，并包含 Svelte 集成。模板与框架版本号不同；首版复用必要的 Svelte 交互，不将上一版 React 组件整体搬入。正式实施需锁定具体提交与 pnpm-lock.yaml，不能一直跟随浮动 master 或 latest。[Firefly 依赖源码](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/package.json)
- 主题 Wiki 与博客文章可能落后于主分支。配置语法以选定提交的源码和对应 Astro 文档为准，原型必须通过生产构建。

## 4. 当前内容迁移基线

以下数字由当前工作区重新读取 Markdown、元数据、分类规则和图片文件得到，未进行 Astro 渲染。

| 项目 | 数量/现状 | 处理 |
| --- | --- | --- |
| 内容源文件 | 53 个 .md，0 个 .mdx | 保持 Markdown，不批量转换扩展名 |
| 公开正文笔记 | 44 篇：31 篇课程/语言笔记、12 篇论文、1 篇日志 | 完整保留正文及当前稳定地址 |
| 集合介绍 | 5 个 index.md | 在课程/论文/日志集合页呈现，避免重复文章页 |
| 演示/测试 | 3 篇非空 unlisted | 保留可访问地址；不进入列表、搜索、RSS、sitemap |
| 空讲义 | CS231N Lec1，0 byte，unlisted | 保留源记录和课程上下文；不生成空正文页 |
| 图片 | 578 张 PNG，约 128.96 MiB | 原图校验和保留；构建时生成发布资源 |
| 图片引用扫描 | 500 处本地引用、1 处外部引用；498 个不同本地文件 | 当前扫描没有缺失本地图片 |
| 未被扫描引用的图片 | 80 张 | 保留，不能未经核查当作垃圾删除 |
| 独立课程/主题定义 | 5 门课程、9 个受控主题 | 保留稳定 ID 和关系 |
| 显式业务 ID/slug | 53 个源文件均未填写；目前在加载时推导 | 迁移时固定到 frontmatter/清单，停止依赖标题和路径重新生成 |
| 缺失日期 | 4 个文件 | 允许未知日期，不用 mtime 或迁移当天补齐 |

47 篇非空正文包括 44 篇公开笔记和 3 篇演示；这与“公开列表里应有 44 篇”的统计含义不同。

缺日期的 4 个文件：

1. Coure-Notebook/Deep_Learning_for_Computer_Vision/index.md
2. Coure-Notebook/Deep_Learning_for_Computer_Vision/Lec1.md
3. Paper-Reading/Computer-Vision/InfiniDepth_笔记.md
4. Paper-Reading/Computer-Vision/3D_Common_Corruptions_and_Data_Augmentation_笔记.md

源码语法扫描发现：30 个文件含数学表达式标记，10 个含原始 HTML 图片，10 个含 Mermaid 围栏，6 个含 Callout，25 个含高亮标记。Typora 测试还涵盖上/下标、emoji 和 [toc]。这些是文本扫描结果，正式实施时应在 Markdown AST 中处理，避免误改公式或代码里的相同符号。

现有图片采用 Git LFS；本地 578 张均是实际图片文件，未发现 LFS pointer。远端构建仍需显式拉取 LFS。

## 5. 目标站点与静态行为

保留已经建立的公开语义，不为了主题默认 /posts 路由再次更换文章地址。

~~~text
/                              个人科研主页
/notes                         全部公开笔记，第一页
/notes/page/2                  静态分页，后续页同理
/notes/[slug]                  唯一正文地址

/courses                       课程目录
/courses/[courseId]             课程概览、有序讲义和来源
/papers                        论文阅读集合

/research                      研究总览
/research/logs                 科研日志
/research/ideas                研究想法
/research/experiments          实验记录
/research/areas/[areaId]        兼容现有方向地址，指向对应主题

/topics                        主题目录
/topics/[topicId]              跨类型主题集合
/projects                      真实项目与空状态
/about                         个人介绍
/search?q=...                  静态页面 + Pagefind 浏览器检索

/rss.xml                       有可信日期的公开笔记摘要订阅
/sitemap*.xml                  公开 canonical 页面
/robots.txt
~~~

首页内容顺序：带视频的研究身份横幅 → Courses / Papers / Research / Projects 入口 → 少量精选或当前关注 → 最近公开记录 → About/联系入口。音乐在侧栏或导航中可达；没有真实精选或项目时省略对应内容块。

课程页显示介绍、课程来源、按讲次排序的讲义。文章页保留返回课程、当前讲次、上一讲/下一讲。论文页聚合论文阅读，展示真实来源；日志使用可信的记录日期排序，未知日期单独显示。

静态部署不能沿用服务端 searchParams 查询：

- 分页使用真实静态路径，不把所有笔记放在一个大 HTML 中。
- 常用类型/主题浏览直接进入 /papers、/research/logs、/topics/[id] 等集合页。
- 多条件检索进入 /search，通过 Pagefind 的 type/topic/course 筛选。
- 旧 /notes?type=...、?topic=...、?page=... 需要兼容到对应集合、检索状态或分页路径；不能让迁移后这些参数静默失效。
- 无 JavaScript 时，正文、目录、课程和分页仍可使用；搜索页提供集合链接并明确说明全文搜索需要 JavaScript。

本次采用 Firefly。课程、主题和搜索共同支持长篇知识积累，不为每门课程再引入另一套文档主题。

## 6. 文档如何迁移

### 6.1 保留相对目录和一份正文

~~~text
当前：content/posts/
目标：src/content/posts/

src/
  content.config.ts
  content/
    posts/
      Coure-Notebook/
        Compiler_Principle/
          index.md
          Lec1.md
          assets/...
      Paper-Reading/...
      Reaserch_Note/...
      Language/...
      callouts-demo/index.md
      hello-world/index.md
      typora-test/index.md
  data/
    catalog.ts                 课程/主题定义，适配当前 lib/catalog.ts
  layouts/                     以模板布局为基础
  pages/                       Astro 静态路由
~~~

首轮只移动整体目录前缀，保留文件之间的相对位置。原有拼写错误目录暂不重命名；它们不再决定公开地址。不要把 578 张图全部重新搬到单独图库后再逐条改路径。

同一个 Content Collection 可以通过 contentKind 区分 note 与 collection：

- 48 个笔记记录由文章路由按 visibility 和正文是否为空决定是否输出。
- 5 个集合介绍只在对应集合页面 render，不进入文章列表。
- 不复制一篇论文到 /papers 和 /notes 两个正文地址。
- 课程/主题的名称、简介和稳定 ID 放在一个小型目录定义文件中。
- 后续仅需要真正嵌入组件的文章才使用 .mdx。

Astro 的 glob() loader 能读取 Markdown 文件，schema 能校验元数据；不需要保留当前手写文件扫描、React MDX 编译和服务端缓存管线。[Content Collections](https://docs.astro.build/en/guides/content-collections/)

### 6.2 固定元数据，保留事实

| 当前数据 | Astro 中的决定 |
| --- | --- |
| lib/catalog.ts 推导的 id/slug | 输出显式稳定字段，路由使用 data.slug |
| title/description | 保留当前有效标题和摘要，补缺失项，不套用文件名作为最终阅读标题 |
| date/updatedAt | 保留已知日精度；缺失可选；不伪造发布日期或修改时间 |
| tags/category | 保留迁移记录；公开浏览主要使用 type/topics/course |
| noteType/topics | 固定为类型与受控主题字段，由 schema 校验 |
| courseId/order | 固定为 course.id/course.order，按讲次阅读 |
| contentKind | 明确 note 或 collection |
| visibility/draft | 明确 published/unlisted/draft，并在所有输出处一致过滤 |
| paper/research/project | 按真实资料逐步补充；不在此次迁移中编造元数据 |

Firefly 默认 schema 要求 published 为 Date，并提供 updated。本站保留现有 date/updatedAt 的日精度与未知日期语义，在 schema 和一个统一适配方法中处理模板日期字段；日期展示、排序、RSS、sitemap、归档和推荐调用处一并适配。不要把 date/published 两份事实写回源文件，也不要把论文发表年份误用为笔记写作日期。[Firefly schema](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/content.config.ts)、[内容排序工具](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/utils/content-utils.ts)

Firefly 已声明 series/seriesOrder，可用于课程系列的显示适配，但业务关系仍以稳定 course.id/course.order 为准。其 getSortedPosts() 默认按置顶和发布时间计算上下篇，并非课程顺序。需要将课程正文的导航替换为同课程讲次导航，并把所有列表、侧栏计数、推荐、RSS、索引共用的公开过滤规则补齐 contentKind/visibility/空正文。[内容工具](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/utils/content-utils.ts)

日期未知的公开笔记仍可在类型、课程和主题中找到，时间顺序列表排在已知日期之后。RSS 首版不收录日期未知项，sitemap 不为它们编造 lastmod。

下面是 InfiniDepth 的元数据形态示例，非本轮写入操作：

~~~yaml
---
id: infinidepth-reading
slug: infinidepth-reading
title: InfiniDepth 论文笔记
description: 关于连续神经隐式深度场、任意分辨率查询与实验结论的阅读记录。
contentKind: note
type: paper
topics: [3d-vision]
visibility: published
author: zhuzichao
# 原文件未记录笔记发布日期，因此省略 date / updatedAt。
---
~~~

业务 frontmatter.id、Astro collection entry.id 和公开 data.slug 是三个概念。公开路径统一使用显式 slug；不把模板根据子目录推导的 entry.id 直接当新 URL。Firefly 默认文章页和 getPostUrlBySlug() 使用 /posts，且路由由 entry.id 派生。迁移时集中适配正文路由、URL 工具及其列表/推荐/RSS 调用方，统一指向 /notes/[稳定 slug]，避免产生第二套正文页。[URL 工具](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/utils/url-utils.ts)、[文章页](https://github.com/CuteLeaf/Firefly/blob/master/src/pages/posts/%5B...slug%5D.astro)

Firefly 默认 trailingSlash 为 always。原型阶段核实托管平台对尾斜杠的支持后统一规范；无论最终采用哪种形式，旧 URL 都直接进入最终规范地址，不通过 /posts 或重复尾斜杠跳转增加链路。

### 6.3 迁移校验清单

实施时生成一份迁移清单，至少包含：

- sourcePath、targetPath、业务 ID、slug、type、topics、course/order、visibility。
- 原正文 SHA-256、原图 SHA-256；正文 hash 排除 frontmatter，资产 hash 按字节。
- 旧 URL、当前 /notes URL、最终 canonical URL。
- 原文件目录、图片源路径、发布后的静态路径、旧资源接口地址。
- 旧标题锚点与新标题锚点的差异。

转换只写入迁移副本，并提供 dry-run 与第二次执行不重复添加元数据的检查。默认正文与原图 hash 相等；必要内容修正逐项记录 diff。不要整篇重新生成 Markdown。

## 7. 渲染兼容矩阵

| 能力 | 迁移方法 | 必须核验 |
| --- | --- | --- |
| 常规 Markdown、表格、任务列表 | Astro 原生 Markdown/GFM | 嵌套列表、宽表格、引用与删除线 |
| KaTeX | 沿用 remark-math、rehype-katex；按文章需要加载样式 | 行内/块级公式、中文与长式、MathML、原有警告 |
| 代码高亮 | 沿用 Firefly 的 Expressive Code | 当前语言和代码元信息、复制按钮；不再并行添加 rehype-pretty-code |
| Obsidian Callout | 优先使用主题已有 rehype-callouts | NOTE、IMPORTANT、未知类型、标题、折叠 +/-、嵌套公式与列表 |
| Typora 高亮/上标/下标 | 少量 AST 兼容插件，输出普通 HTML 节点 | 不处理 code/math；避免与 GFM 删除线冲突 |
| [toc] | 移除重复占位；由布局统一生成 TOC | 中文、公式、重复标题、旧锚点 |
| Mermaid | 优先复用 Firefly 当前构建时静态 SVG 管线 | Merman/WASM 对现有语法的兼容、深浅色、错误回退、图中文字和节点关系 |
| Markdown 相对图片 | 保留相邻 assets，使用 Astro 构建时资源优化 | width/height、srcset/sizes、科学截图清晰度 |
| Typora 原始 HTML 图片 | 编译兼容层解析 sourceDir，将图片转为可处理节点，并保留缩放含义 | 10 个文件、zoom 比例、引用/列表内图片 |
| 内链/外链/hash | 普通 a 标签；目录读取实际渲染 headings | hash 原生行为、浏览器返回、旧段落位置 |

现有 remark 插件会输出 Mermaid/Callout 等 React MDX JSX 节点；不能原样放进 Astro 的普通 Markdown 管线。只迁移语法识别规则，输出改为适合 Markdown 的 HTML/AST。Astro render(entry) 可提供真实标题信息，目录不再用另一套正则生成 ID。[Markdown 标题与渲染](https://docs.astro.build/en/guides/markdown-content/)

Firefly 已接入 remark-math/rehype-katex、rehype-callouts 和 Mermaid 管线，优先复用，不重新编写这些功能。Callout 原型将主题配置为适合现有 Obsidian 语法的 obsidian，验证 IMPORTANT、折叠 +/- 和嵌套公式。[Astro 配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/astro.config.mjs)

当前 Mermaid 插件通过 @mermanjs/web 在构建时生成深浅色 SVG，和现有浏览器 Mermaid 引擎不同。必须验证全部 10 个含图文件：发生渲染错误时，构建可能仍输出错误提示及源码，因此构建成功不是图表正确的充分证据。只有确认语法兼容不足时，才退回按页面加载现有 Mermaid；不默认同时引入两套图表引擎。[Mermaid 插件源码](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/src/plugins/rehype-mermaid.mjs)

原正文里的一级标题可能与页面标题重复。通过渲染层规范层级，保留正文信息和旧锚点；不以“整理格式”为由批量删节。

## 8. 图片从运行时 API 改为构建资源

目标：新文章不再依赖 /api/images 的运行时 Sharp 转换。

1. 原始 PNG 与 Markdown 一起保留在 src/content/posts 的相邻目录。
2. 标准 Markdown 图片由 Astro 构建优化，启用响应式输出，避免放进 public 后误以为仍会自动优化。
   Firefly 当前 astro.config.mjs 将 Markdown 图片的 image.layout 设为 none；需要核对主题图片组件与正文管线的实际输出，不能仅凭 imageOptimization 配置宣称已有 srcset/sizes。
3. 原始 HTML img 是单独的兼容任务。Astro 不会自动把其中 src 指向 src 目录的本地文件转换成优化资源；先在原型证明 AST 转换路径可行，再覆盖全部 10 个文件。
4. 科学图保留可查看的原图，WebP/尺寸变体用于阅读；不把可读文字和细节统一压成低质量图片。
5. 编译时验证全部引用文件存在，并为正文图片提供固有尺寸。缺失资产应报出源文件与引用位置。
6. 旧 /api/images/<原路径> 的已发布图片地址通过显式清单指向静态资源；路径与资源内容匹配，不能做一个错误的通配替换。
7. 旧 ?w= 参数不再提供动态变换；兼容请求指向已生成的合适静态资源，说明这一接口行为变化。正文里的新 srcset 只引用真实静态变体。
8. 未引用的 80 张图片保留在源库，本轮不删除，也不无差别复制到公开 dist。

本地图片放在 src 可参与构建优化；public 中的图片原样发布；原始 HTML img 与 Markdown 图片的处理不同。[Astro 图片文档](https://docs.astro.build/en/guides/images/)

Git LFS checkout、图片构建产物和旧图片映射必须作为同一发布版本验收。避免只部署页面而遗漏图片。

## 9. 搜索与 500+ 篇规模

在 Astro 静态站点中，直接采用模板已有的 Pagefind。构建完成后对 dist 中明确的文章正文建立索引，检索代码与索引仅在搜索时加载；不把全部 Markdown 全文嵌入首页或导航。

Firefly 有专门的 Pagefind 构建脚本，pagefind.yml 已排除 KaTeX 和部分界面元素。首版沿用正常文字检索；公式符号精确检索不作为默认能力。先检查脚本的输出路径与语言设置，再补本站的公开范围和筛选标记。[索引配置](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/pagefind.yml)、[构建脚本入口](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/package.json)

配置要求：

- 只索引 published、非空、contentKind=note 的 canonical 正文。
- 排除导航、页脚、上下篇、TOC、演示、集合重复正文和 unlisted。
- 标题、摘要、正文生成有用片段；type/topic/course 作为筛选字段。
- /search?q=...&type=...&topic=... 可复制，刷新和浏览器返回恢复状态。
- 页面语言保持正确；首版用 force-language 的中文统一索引覆盖中英日内容，确认客户端使用同一索引。
- 使用支持 CJK 分词的 Pagefind extended 构建，并验证中文词、英文缩写和日语查询；不能根据“支持全文搜索”推定召回质量已达标。[Pagefind 多语言说明](https://pagefind.app/docs/multilingual/)、[筛选配置](https://pagefind.app/docs/filtering/)

500 篇时，列表仍每页约 25 项，课程只显示当前课程讲义；各类页面不注入整站全文。静态路由只生成实际分页、类型、主题和课程页，不为每一种筛选组合生成页面。

在隔离样本环境测量 500 篇代表性内容的构建时间、峰值内存、图片处理开销、产物体积和搜索加载量。应包含长中文标题、公式密集笔记、图片长文和重复 Lec 标题，不能复制同一篇短文 500 次后宣称完成压力验证。

查询验收至少覆盖 20 个真实词，例如 InfiniDepth、DeepMimic、Bellman、法线、蒙特卡洛、进程、编译原理、五十音、ピッチ。精确标题/缩写的目标通常应进入前 5 条；无日期笔记也必须可检索。

## 10. URL、SEO 与部署

### 10.1 两代文章地址一起保护

- 当前 /notes/[slug] 保持不变。
- 最初的 53 条 /blog/<路径> 一次直接跳到最终正文或集合，避免经另一层旧地址中转。
- 中文路径、空格、加号、正确百分号编码、尾斜杠统一测试。
- /authors/... 继续进入当前 About。
- /blog 的 folder/category/tag 参数，以及当前 /notes 的筛选/分页参数，按真实含义迁移。
- 段落 fragment 不会发送给服务器；标题 ID 若有变化，在新正文保留旧锚点别名，不能仅靠路径重定向解决。
- 不生成可索引的 /posts 和 /notes 双份正文。unlisted 使用 noindex，并从 RSS、sitemap、Pagefind 和推荐里排除；draft 不输出页面。

仅配置 Astro redirects，在普通纯静态输出中可能生成 meta-refresh HTML，不能据此声称已提供真实 HTTP 301/308。正式部署需要托管平台的重定向配置或现有服务器规则。[Astro 路由与重定向](https://docs.astro.build/en/guides/routing/)

### 10.2 部署优先沿用现有平台

目前未确认正式域名及实际托管平台。仓库 CI、环境变量回退和历史部署文件都不足以证明线上平台是什么。

| 平台 | 静态站点发布 | 兼容措施 |
| --- | --- | --- |
| Vercel | 构建 dist 并静态发布；优先考虑沿用现有项目/域名 | vercel.json 明确路径与查询条件重定向 |
| Cloudflare Pages | 静态 dist | 路径用 _redirects；该文件不支持查询参数条件匹配，旧 folder/tag 查询需另用边缘规则或仅该兼容入口的 Function |
| 自建服务器 | 上传 dist，配置静态服务 | Nginx 等服务器规则保留 HTTP 重定向与查询语义 |
| GitHub Pages | 可托管静态页面 | 缺少原生可配置 HTTP 重定向，不作为本次 URL 保护的默认方案 |

Cloudflare 的查询参数限制和 Vercel 的边缘重定向能力需按平台落实，不能写完一个 _redirects 文件就假定旧筛选兼容已经完成。[Cloudflare 重定向](https://developers.cloudflare.com/pages/configuration/redirects/)、[Vercel 重定向](https://vercel.com/docs/routing/redirects)

Firefly 的 preinstall 强制 pnpm，因此本路线改用模板锁定的 pnpm 和唯一 pnpm-lock.yaml；切换时移除旧 npm lockfile，不并行维护两套锁文件。将 CI Node 20 改为符合选定模板要求的 Node 22 小版本，保持 lfs: true。正式构建完成 schema/内容校验、astro check、生产 build、Pagefind 和发布资源检查。[Astro 部署指南](https://docs.astro.build/en/guides/deploy/)

上游 build 包含 GitHub 卡片、LQIP、VNDB 封面、看板娘资产裁剪、字体子集和脚本压缩等步骤。原型逐项检查触发条件，只保留本站实际使用的构建任务；关闭某个页面不代表其脚本或静态资产自动消失。上游 lint 含 --write，CI 中另用只读检查，避免校验时修改代码。[Firefly 脚本定义](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/package.json)

正式 site URL 必须明确配置。预览环境 noindex；canonical、RSS、sitemap 的正式域名一致。若预览与正式配置不同，切换时生成同一提交的正式构建，不发布带 localhost/临时域名的元数据。

## 11. 分阶段执行

| 阶段 | 工作 | 可审阅交付 | 进入下一阶段的条件 |
| --- | --- | --- | --- |
| P0：保留基线 | 在已建立的独立分支保存来源记录；为当前 main 未提交修改和未跟踪文件制作恢复快照；从实际工作区导出内容/图片/URL/hash 清单；锁定 Firefly 提交、Node 和 pnpm | 完整迁移清单、可恢复旧站、模板来源及媒体清单 | 53 个记录与 578 张实际图片无遗漏，快照可恢复 |
| P1：Firefly 风格与真实内容原型 | 在新 worktree 的临时目录取入锁定模板，再替换该 worktree 的应用；按第 2 节启用视频、音乐和装饰；导入代表长文；验证静态 SVG、图片、TOC、媒体与 Swup 生命周期 | 首页、课程页、文章页、搜索页预览；效果控制、媒体请求与客户端资源清单 | Firefly 风格与阅读得到认可；切页不重复播放/初始化，代表语法正确 |
| P2：全量文档迁移 | 搬整体内容目录；固定 frontmatter；保留集合介绍；生成旧资源与文章映射 | 53 个记录归属报告、正文/原图校验、元数据待补清单 | 正文无静默改写，所有资源引用有效 |
| P3：集合与静态检索 | 接入课程/论文/研究/主题页；静态分页；Pagefind 与公开状态过滤；旧参数兼容 | 完整网站预览及真实查询结果 | 44 篇公开内容可发现；演示/空讲义不混入公开结果 |
| P4：验收与发布准备 | 全量链接/锚点回归；手机/键盘/缩放；500 样本；视频/音乐/动画故障和降级；正式平台重定向；更新 CI/维护文档 | 验收报告、预览、正式构建配置和回退说明 | 无内容/旧链接阻断；全部交付可审阅，再安排合并与正式切换 |

粗略工作量为 5–8 个工作日：P0 约 0.5 天，P1 约 1–2 天，P2 约 1–2 天，P3 约 1 天，P4 约 1.5–2.5 天。范围包含媒体/动画与 Swup 的兼容验证，是按当前 53 个文件估计的排期；P1 生产构建与预览后再更新，不作为迁移时间承诺。

### 11.1 分支与工作区

已完成的隔离设置：

- 原工作区：/Users/zzc/Desktop/一路成长/blog，仍在 main，保留上一轮全部未提交源码修改。
- 新分支：feat/astro-firefly；基于 main 当前已提交的 d87c440 创建。
- 新 worktree：/Users/zzc/Desktop/一路成长/blog/.worktrees/astro-firefly。
- .worktrees/ 仅加入本地 Git exclude，不修改项目 .gitignore；本轮规划文件同步到新 worktree，没有代码提交或远端 push。
- 建立 worktree 时跳过 LFS 下载，因此其初始检出不能充当 578 张实际图片的迁移来源；内容与资产基线取自原工作区，P0 明确检查每张图的真实字节。

实施约束：

1. 后续 Astro 源码、配置、依赖和内容迁移副本只在新 worktree 编写。进入目录后先核对 git branch --show-current，禁止在原 main 根目录运行模板初始化。
2. 新 worktree 不包含原工作区未提交修改。P0 先制作可恢复快照，导出实际 lib/catalog.ts 的稳定 ID、slug、课程和主题关系，以及 53 个原文件和 578 张原图的清单；不从旧 HEAD 重新推导这些数据。
3. Firefly 先放入新 worktree 的临时 staging 目录，核实上游提交、许可证、构建和所需资产。使用其 Astro 应用作为根应用；当前 Next.js 恢复快照保存在仓库外的本地备份位置，不长期并排维护两套框架。保留本站 Git 身份，不复制模板 .git。
4. 迁移期间内容编辑暂停，或只编辑原内容源并在重新生成迁移副本后复核 hash；验收完成后正式内容源切换为 Astro 的 src/content/posts，避免长期双向同步。
5. 按“模板与效果、内容兼容、集合与搜索、URL/CI”拆成可审阅变更；最终准备 PR/差异报告。确认交付后再合并和切换正式部署，当前计划不触发线上变化。

后续进入迁移工作区：

~~~sh
cd /Users/zzc/Desktop/一路成长/blog/.worktrees/astro-firefly
git branch --show-current
~~~

在 main 未提交修改尚未妥善保存前，不将新分支合并回原工作区；旧站回退依据原提交、恢复快照及既有发布产物共同建立。

P1 的验收点来自本次需求：用户目前对现有结果不满意，先看真实可运行的文章才能确认模板方向；本轮不把框架迁移与正式域名切换一并默认执行。

## 12. 完成标准和回退

### 内容与链接

- 53 个文件逐项有归属；44 篇公开、3 篇非空 unlisted、1 个空讲义和5个集合介绍数量一致。
- 578 张原图字节校验通过；498 个扫描到的本地资源来源均可解析；最终以渲染输出再复核。
- 新文章访问、旧 53 条路径 HTTP 重定向、旧图片、复杂标题锚点逐项验证，检查内容而非只检查 status=200。
- 无日期笔记正常阅读/搜索；没有用虚构日期让主题构建通过。
- 课程顺序不是日期顺序；手机可返回课程并连续阅读。

### 阅读与维护

- 检查 320/390/768/1280px 代表视口和 200% 缩放；正文无页面级横向溢出。
- 菜单、主题切换、目录、分页与搜索可用键盘；关闭的菜单不保留可聚焦隐藏链接。
- 视频、音乐和装饰按第 2 节启用；连续切页与返回后不重复创建播放器、事件监听或樱花实例；音乐不会自行开始或因切页重启。
- 视频与动画可暂停；减少动态效果、节省流量、媒体失败和后台页面的行为通过；手机播放器不遮住正文、目录或底部操作。
- 公式、图表、代码、Callout、Mermaid 和图片细节不回退；无 JavaScript 正文仍可读。
- 一份内容源、一个集合 schema、一套文章路由、一套搜索索引和一个 lockfile。
- 保留 Firefly/Fuwari 来源说明、MIT 许可证中的 saicaca 与 CuteLeaf 版权声明，以及锁定提交记录；后续模板升级用差异合并，不重新下载覆盖内容。[Firefly LICENSE](https://raw.githubusercontent.com/CuteLeaf/Firefly/master/LICENSE)

### 性能与发布

- 列表每页固定数量，单篇页面不携带其他文章全文；普通内容页面不引入 React hydration。
- 搜索、Svelte、Swup、视频、音乐和粒子效果的资源范围可解释；Mermaid 静态 SVG 不应额外下载整套浏览器引擎。记录实际 JS/CSS、图片、媒体、索引体积及构建资源消耗，不把 Astro 的默认 HTML 输出当作 Firefly“零 JavaScript”的保证。
- 至少比较静态封面、正常装饰和视频/音乐播放三种模式；统计首屏请求、布局偏移、滚动和切页流畅度。媒体/API 失败不阻塞正文；暂停动态效果后不继续预取背景视频或执行粒子任务，音乐遵循用户自己的播放选择。
- 在同样文章、设备和测试条件下比较当前 Next 版本与 Astro 原型；不以演示站分数替代本站测量。
- schema 检查、类型检查、生产构建、Pagefind、内容/资产/链接回归均通过。
- 域名、canonical、sitemap、RSS、图片、索引和重定向作为同一版本切换。

回退保留当前 Next 构建/部署版本和完整源码快照。如果图片、旧链接或内容缺失阻断发布，恢复旧产物和对应重定向/索引配置。前期尽量沿用原域名和托管平台，使回退成为平台发布版本回退，不同时承担 DNS/域名迁移。

## 附录：53 个源记录的地址归属

表中源路径省略 content/posts/、.md 和末尾 /index；旧地址在其前加 /blog/。正文目标采用当前 lib/catalog.ts 的有效 slug，不是 REDESIGN.md 的早期示例 slug。正式清单还需记录业务 ID、文件 hash、图片和锚点。

| 源路径/旧路径后缀 | 保留的最终目标 | 归属 |
| --- | --- | --- |
| Coure-Notebook/Compiler_Principle/Lec1 | /notes/compiler-principles-lec1 | published |
| Coure-Notebook/Compiler_Principle/Lec10 | /notes/compiler-principles-lec10 | published |
| Coure-Notebook/Compiler_Principle/Lec2 | /notes/compiler-principles-lec2 | published |
| Coure-Notebook/Compiler_Principle/Lec3 | /notes/compiler-principles-lec3 | published |
| Coure-Notebook/Compiler_Principle/Lec4 | /notes/compiler-principles-lec4 | published |
| Coure-Notebook/Compiler_Principle/Lec5 | /notes/compiler-principles-lec5 | published |
| Coure-Notebook/Compiler_Principle/Lec6 | /notes/compiler-principles-lec6 | published |
| Coure-Notebook/Compiler_Principle/Lec7 | /notes/compiler-principles-lec7 | published |
| Coure-Notebook/Compiler_Principle/Lec8 | /notes/compiler-principles-lec8 | published |
| Coure-Notebook/Compiler_Principle/Lec9 | /notes/compiler-principles-lec9 | published |
| Coure-Notebook/Compiler_Principle | /courses/compiler-principles | collection |
| Coure-Notebook/Deep_Learning_for_Computer_Vision/Lec1 | /courses/deep-learning-computer-vision | empty |
| Coure-Notebook/Deep_Learning_for_Computer_Vision | /courses/deep-learning-computer-vision | collection |
| Coure-Notebook/Operating_System/Lec0 | /notes/operating-systems-lec0 | published |
| Coure-Notebook/Operating_System/Lec1 | /notes/operating-systems-lec1 | published |
| Coure-Notebook/Operating_System/Lec10 | /notes/operating-systems-lec10 | published |
| Coure-Notebook/Operating_System/Lec11 | /notes/operating-systems-lec11 | published |
| Coure-Notebook/Operating_System/Lec12 | /notes/operating-systems-lec12 | published |
| Coure-Notebook/Operating_System/Lec2 | /notes/operating-systems-lec2 | published |
| Coure-Notebook/Operating_System/Lec3 | /notes/operating-systems-lec3 | published |
| Coure-Notebook/Operating_System/Lec4 | /notes/operating-systems-lec4 | published |
| Coure-Notebook/Operating_System/Lec5 | /notes/operating-systems-lec5 | published |
| Coure-Notebook/Operating_System/Lec6 | /notes/operating-systems-lec6 | published |
| Coure-Notebook/Operating_System/Lec7 | /notes/operating-systems-lec7 | published |
| Coure-Notebook/Operating_System/Lec8 | /notes/operating-systems-lec8 | published |
| Coure-Notebook/Operating_System/Lec9 | /notes/operating-systems-lec9 | published |
| Coure-Notebook/Reinforcement_learning/Lec1-Basic-Concepts | /notes/reinforcement-learning-lec1-basic-concepts | published |
| Coure-Notebook/Reinforcement_learning/Lec2-Bellman-Equation | /notes/reinforcement-learning-lec2-bellman-equation | published |
| Coure-Notebook/Reinforcement_learning/Lec3-Bellman-Optimality | /notes/reinforcement-learning-lec3-bellman-optimality | published |
| Coure-Notebook/Reinforcement_learning/Lec4-Value-and-Policy-Iteration | /notes/reinforcement-learning-lec4-value-and-policy-iteration | published |
| Coure-Notebook/Reinforcement_learning/Lec5-Monte-Carlo | /notes/reinforcement-learning-lec5-monte-carlo | published |
| Coure-Notebook | /courses | collection |
| Language/JP_learning/Lec1-Gojuon | /notes/japanese-lec1-gojuon | published |
| Language/JP_learning/Lec2-Pitch-Accent | /notes/japanese-lec2-pitch-accent | published |
| Language/JP_learning/Lec3-Dakuon-and-Choon | /notes/japanese-lec3-dakuon-and-choon | published |
| Paper-Reading/Computer-Vision/3D_Common_Corruptions_and_Data_Augmentation_笔记 | /notes/3d-common-corruptions-and-data-augmentation-reading | published |
| Paper-Reading/Computer-Vision/InfiniDepth_笔记 | /notes/infinidepth-reading | published |
| Paper-Reading/Manigaussian/ManiGaussian | /notes/manigaussian-reading | published |
| Paper-Reading/Manigaussian/ManiGaussianPP | /notes/manigaussianpp-reading | published |
| Paper-Reading/Robots/AMP | /notes/amp-reading | published |
| Paper-Reading/Robots/DeepMimic | /notes/deepmimic-reading | published |
| Paper-Reading/Robots/DreamWaQ | /notes/dreamwaq-reading | published |
| Paper-Reading/Robots/Imitating-Animals | /notes/imitating-animals-reading | published |
| Paper-Reading/Robots/MoE-Loco | /notes/moe-loco-reading | published |
| Paper-Reading/Robots/Multi-AMP | /notes/multi-amp-reading | published |
| Paper-Reading/Robots/PIE | /notes/pie-reading | published |
| Paper-Reading/Robots/RMA | /notes/rma-reading | published |
| Paper-Reading | /papers | collection |
| Reaserch_Note/260707 | /notes/research-log-2026-07-07 | published |
| Reaserch_Note | /research/logs | collection |
| callouts-demo | /notes/callouts-demo | unlisted |
| hello-world | /notes/hello-world | unlisted |
| typora-test | /notes/typora-test | unlisted |
