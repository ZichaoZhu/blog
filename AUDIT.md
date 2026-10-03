# 个人科研知识主页审计

审计日期：2026-10-02。基线提交：`d87c440`。本文记录实施前基线；方案已于 2026-10-03 确认并开始实施，当前结构见 [README.md](README.md)。

## 结论

现有网站已有可保留的内容资产和渲染能力：Markdown 写作、嵌套课程目录、数学公式、代码高亮、Mermaid、Callout、深色模式，以及文章静态生成。主要问题是知识组织仍依赖磁盘文件夹，导航数据包含全文，文章类型没有独立模型，首页优先展示站点效果和发布日期。这些问题已经在 53 个 Markdown 文件时造成错误；增长到 500+ 篇后，单靠增加标签或优化卡片不能解决。

最先处理的应是内容正确性：两个中文文件名论文路由显示“文章未找到”、嵌套课程筛选为空、目录页图片路径错误、目录锚点不一致。随后建立稳定文章身份、课程顺序、全文搜索和轻量索引，再调整排版及首页。建议保留文件写作和 Next.js，不引入 CMS、向量数据库或复杂知识图谱。

本文优先级定义：**P0**＝现有内容无法正常访问或定位；**P1**＝长期使用、阅读、可访问性或增长的主要阻碍；**P2**＝一致性、维护和后续优化。不是安全事件等级，也不代表已通过正式 WCAG 认证。

## 1. 范围、方法与验证边界

已阅读仓库自有的路由、组件、内容加载与 MDX 管线、样式、类型、脚本、依赖配置、README 和部署工作流；对全部 53 个 Markdown 文件的完整正文做结构解析，检查 frontmatter、标题、图片、相对链接和目录，并细读代表性课程、论文、科研日志及示例。已检查作者资料及资源目录。没有逐字验证全部科研论述、公式推导和论文结论的学术正确性。

在隔离的临时副本中执行生产构建、启动本地生产服务、请求全部文章路由并检查生成 HTML；在浏览器观察桌面文章页、390px 手机视口的目录页与筛选页，以及中文论文错误页。原仓库没有用于构建的改写。未执行会写入内容的同步脚本。

| 验证 | 结果与边界 |
| --- | --- |
| `npm run lint` | 失败：22 errors、6 warnings。18 个 `no-explicit-any`，4 个 effect 内同步 setState；其余包括未使用变量、原生图片和 hook 依赖提示。 |
| `tsc --noEmit --incremental false` | 通过。静态类型通过不覆盖路径、内容和交互错误。 |
| `npm run build -- --webpack` | 临时副本构建通过，生成 62 个页面。验证的是 Webpack 构建，未验证默认 Turbopack 构建；本地 Node 25.8.1，工作流 Node 20。 |
| 53 个文章 URL | 均返回 HTTP 200；其中两个实际输出 not-found 页面，属于本次本地构建的软 404。检查状态码不能代替检查文章内容。 |
| 内容图片与链接 | 扫描完整 Markdown，并检查生产 HTML 中的本地图片与 TOC 目标。下文分别注明源文件和渲染后的问题。 |
| 浏览器检查 | 桌面与 390px 手机视口的代表页面；不是所有设备、浏览器和辅助技术的完整覆盖。 |

未提供生产域名及当前部署环境，因此本报告不判定线上 CDN、缓存、Search Console 收录或实际部署是否故障。没有生产 Core Web Vitals、Lighthouse 分数、真实用户数据或实际 500 篇压力测试。外部论文及代码网站没有逐一在线验证。HTML gzip 数据是对响应内容的本地压缩估算，不是线上传输计费数据。

## 2. 内容与路由现状

| 指标 | 当前快照 |
| --- | --- |
| Markdown 文件 | 53 个，608,656 bytes；正文合计 591,785 bytes |
| `Coure-Notebook` | 32 个文件，包含课程入口和空讲义 |
| `Paper-Reading` | 13 个文件：12 篇阅读笔记和 1 个入口 |
| `Reaserch_Note` | 2 个文件：1 篇日志和 1 个入口 |
| `Language` | 3 篇日语笔记 |
| 示例/测试 | 3 个：Hello World、Callout、Typora |
| 元数据 | 49 个文件有 frontmatter；48 个有 description、tags；没有文章显式设置 order |
| 分类/标签 | 11 个 category，30 个 tag；列表只显示排序后的前 12 个标签 |
| 图片资产 | 内容目录 578 张 PNG；正文 495 次本地图片引用、1 次外部图片引用 |
| 空文章 | `Coure-Notebook/Deep_Learning_for_Computer_Vision/Lec1.md` 是 0 byte，仍公开进入“最近更新” |
| 尚未建立的内容实体 | Projects、独立 Research Ideas、可复现实验记录 |

现有页面：`/`、`/blog`、`/blog/[...slug]`、`/about`、`/authors/[id]`、图片 API 和 404。顶层导航仅“首页 / 博客 / 关于”。课程、论文、日志和日语均进入同一个 Blog 容器；文件夹 `index.md` 与普通笔记共用文章模板。

## 3. 优先问题清单

| ID | 优先级 | 问题及证据 | 建议方向 |
| --- | --- | --- | --- |
| A01 | P0 | 两个含“笔记”的中文文件名论文输出 not-found。`app/blog/[...slug]/page.tsx:31,48` 拼接参数后，`lib/posts.ts:274` 与原始 path 精确比较；构建结果含编码后的参数，路由键缺少统一规范。 | 定义一致的路径规范，覆盖 Unicode/编码路径测试；迁移到显式稳定 slug，保留旧地址映射。 |
| A02 | P0 | `components/BlogListClient.tsx:39` 只比较第一个路径段；`/blog?folder=Coure-Notebook%2FOperating_System` 显示 0 篇，实际有 13 个文件。 | 使用明确 collection ID 和成员关系；短期正确匹配嵌套路径边界。 |
| A03 | P0 | 编译原理 `index.md` 的 3 张图被解析到上一级 `Coure-Notebook/assets`，HTTP 404。`lib/mdx.ts:235` 和 `components/MDXComponents.tsx:45` 都根据公开 URL 删除末段推断源目录。 | 用真实 Markdown 文件所在目录解析资源，统一 Markdown 与 HTML 图片管线。 |
| A04 | P0 | 成功渲染的 4 篇笔记有 9 个 TOC 目标不存在；主要是含数学记号的标题。`lib/toc.ts` 独立正则生成 ID，正文由 rehype 另一条管线生成。 | 从同一次 AST/渲染过程生成标题 ID 和 TOC。 |
| A05 | P1 | 全文传入列表和全站文件树，文章也携带整棵含正文的树。`lib/posts.ts`、`BlogListClient`、`FileTreeClient`。 | 服务端正文与导航摘要分离；客户端仅收当前页摘要及局部目录。 |
| A06 | P1 | 无全文搜索；README 引用的 `SearchDialog.tsx` 不存在。标签仅暴露 12/30，无分页。 | 独立、可链接的搜索页和构建时全文索引；分页、类型及主题筛选。 |
| A07 | P1 | 课程筛选沿用日期排序，缺少上一讲/下一讲；首页“最近更新”实际按 date 排序，缺日期回退 mtime。 | 分离课程顺序、发布日期、实质更新日期与日志发生日期。 |
| A08 | P1 | `prose prose-lg` 存在，但 Tailwind Typography 插件未启用；构建 CSS 缺少对应排版规则。 | 建立一个完整、可验证的正文排版基线。 |
| A09 | P1 | 首屏全屏自动视频 83.29 MiB；代表页面均出现 123 个字体 preload，资源合计约 3.39 MiB。 | 去掉首屏装饰视频，使用系统字体或有限正文子集，按需加载。 |
| A10 | P1 | 收起树/侧栏仍保留可聚焦链接；菜单与展开控件缺少状态语义；视图切换按钮无可访问名称。 | 原生链接/披露控件、正确隐藏、ARIA 状态、键盘路径。 |
| A11 | P1 | 所有 MDX 链接统一 `target="_blank"`，包括页内标题；TOC 点击又阻止默认 hash 导航。 | 站内及锚点使用原生同页行为；外链按明确规则处理。 |
| A12 | P1 | 页面缺 canonical、sitemap、研究主页描述和论文来源结构；多处示例作者/联系方式。 | 明确页面身份、作者、可索引入口及来源信息。 |
| A13 | P1 | 图片 API 会返回非图片内容；请求 `/api/images/Reaserch_Note/260707.md` 得到正文。 | 限定发布资源清单与图片类型，避免未来 draft 正文通过资源端点暴露。 |
| A14 | P2 | 同步脚本可能制造重复 route、遗漏图片并覆盖目标；watcher 使用 Chokidar 5 不支持的 glob。 | 明确一套写作流程，移除或修正旧同步流程后再恢复使用。 |
| A15 | P2 | GitHub Pages 工作流上传 `out`，但 Next 配置没有静态导出，且依赖动态图片 API。 | 按实际部署平台统一构建与发布，不直接切换为静态导出。 |

## 4. 十个审计维度

### 4.1 Information Architecture

**P1：内容类型、主题和集合被混在文件夹、category 与 tag 中。** “课程笔记”“编译原理”“论文阅读”“科研”分别承担类型、课程、主题和宽泛标记；相同信息多次重复，无法稳定回答“某个研究方向有哪些论文、日志、实验和项目”。`types/index.ts` 没有 paper/course/experiment 的来源与上下文模型，虽然声明 series/relatedPosts，加载与页面没有使用。

文件夹可作为编辑端组织方式，但不宜决定全部公开结构。路径中的 `Coure-Notebook`、`Reaserch_Note` 拼写和 `Compiler_Principle` 等原始名称会进入面包屑和地址。目录简介与一篇独立知识笔记也没有区分。500 篇时，持续增长的树需要读者先理解作者的磁盘，而研究主题往往跨课程、论文和实验。

建议分离：**类型**说明这是什么记录，**主题**说明研究什么，**集合**说明它属于哪门课/研究方向，**稳定 ID/slug**保证移动文件不改变引用。保留纸质笔记般的自由正文，不强制将历史笔记改写为同一种格式。

### 4.2 Navigation / Discoverability

**P1：导航只能进入一个总 Blog，缺少面向任务的入口。** 找课程需要文件树；找论文需要知道分组；找日志只有日期标题；移动端文件树隐藏，没有等价课程导航。About 主要介绍技术栈，不能帮助读者判断作者关注哪些问题、哪些内容值得先读。

**P0/P1：筛选结果和 URL 状态不可靠。** A02 已复现。`BlogListClient.tsx:64–71` 重建 query，只保留 category/tag/folder，可能擦除 view 等状态；使用 replaceState，筛选不形成正常历史；`useState(initialFilters)` 不与后续 URL/返回操作同步。`ViewSwitcher` 又单独通过 router 更新 view，两套状态机制冲突。当前实现不适合进一步追加搜索、排序和分页。

**P1：缺少完整检索与顺序阅读。** 500 个短标题、相同 `Lec1: Introduction`、缩写论文标题无法靠标签浏览区分。全部结果一次渲染，没有分页；标签按字母顺序截断，会长期隐藏后续中文标签。列表一行截断标题，抹去区分相似笔记的重要词。

建议使用稳定集合页、明确当前上下文、课程上一讲/下一讲、可分享 GET 筛选 URL 和独立 Search。文件树只作为可选辅助，文章页显示本课程或本研究集合。

### 4.3 Reading Experience

**P1：正文排版配置与实际输出不一致。** `ArticleBody` 依赖 `prose prose-lg dark:prose-invert`，但 `app/globals.css` 没有注册 `@tailwindcss/typography`。自定义 h2/h3、p 等规则只能覆盖部分 Markdown；h1、h4–h6、嵌套结构缺乏完整一致的层级。LaTeX 主题另有一套字体、间距、自动编号和纸张样式，扩大维护面，也可能与源内容的编号重复。

**P1：两侧导航挤占正文。** 文章布局在 xl 同时启用 288px 文件树和 300px TOC；加上两处 32px gap 和外层 padding，在 1280px 断点附近正文约剩 560px。这是依据 CSS 的尺寸推导，未作为该宽度的浏览器实测。研究论文图片、宽公式和代码更需要稳定正文宽度；宽屏不应优先容纳全站目录。

**P0/P1：目录与链接破坏定位。** A04 的 9 个缺失目标分别出现在 ManiGaussian、编译原理 Lec2、强化学习 Monte Carlo、Bellman Optimality。两篇未渲染的中文论文不计入这 9 个。正文标题自动链接中，47 个成功页面合计 1,188 个链接被统一设置为新标签打开。桌面 TOC 的“收起子级”只更新图标，没有隐藏对应子条目；MobileTOC 和桌面 TOC 点击都不更新 hash，不适合分享某个段落、浏览器返回或键盘定位。

图片 lazy/async、表格局部滚动、数学渲染和 Callout 是应保留的能力。问题在于渲染后的 495 张本地图片均没有完整 width/height 占位，且大多统一请求 1200px、没有响应式 srcset。图片布局跳动风险已由代码确认，实际 CLS 尚未测量。

文末重复作者卡片和“评论功能即将上线”占据阅读空间，缺少更有用的课程连续阅读、论文来源、相关实验和最后更新信息。阅读进度按整个 document 高度计算，包含作者/评论/页脚，不能准确代表正文完成度。

### 4.4 Visual Hierarchy

**P1：视觉权重与科研主页目标相反。** 首页 `AnimatedHero` 优先展示全屏视频、打字动画和延迟出现的 CTA；内容入口需要滚动。首页其余部分强调站点技术功能，而不是研究问题、精选知识、课程和项目。SSR 的打字 H1 初始无实质文本、介绍在客户端动画前透明，也降低首屏在慢网络或 JS 不可用时的可用性。

玻璃面板、光晕、点击涟漪、倾斜卡片和小型大写 micro-label 在导航、筛选、文章元信息反复出现。它们增加视觉竞争，没有帮助区分“类型、主题、当前课程、文章层级”。`FeaturedPostCard` 的 client/motion 实现也服务于大量列表条目。

建议让标题、正文、来源和导航承担层级：纯色背景、清晰字号、稳定留白、细分隔线、明确链接色。保留个性化短句可以，但不占据主入口或替代作者身份。无需增加 gradient、glassmorphism、animation 或 decorative cards。

### 4.5 Content Model

**P1：宽松 fallback 掩盖内容质量问题。** 四个文件缺 frontmatter；空讲义、两个中文论文和课程入口会获得文件名标题或文件修改日期。临时构建首页首条就是空 `Lec1`。当前“最近更新”按 date，而不是真实实质更新排序；更换 checkout/同步流程可改变无日期文件的展示时间。

加载器仅识别嵌套目录中的 `.md`，不加载 `.mdx` 或根目录独立 Markdown。文章 URL 从文件路径导出；`Foo.md` 与 `Foo/index.md` 会得到相同 route。没有统一校验重复路径、合法日期、作者引用、空正文或集合顺序；异常可能被捕获后变成缺文章或空列表。

论文来源、版本、作者、发表年份、DOI/arXiv/代码入口主要藏在自由正文里，无法构建论文目录和跨笔记关联。课程无显式 order，列表仍按日期；例如编译原理会显示 Lec10、Lec9、Lec5、Lec8……。日志 `260707` 有实质研究思考，但标题缺上下文，实验条件、版本、配置和产出不形成可追溯结构；不应事后编造不存在的实验数据。

建议少量通用必填元数据，加按类型可选字段；将入口页/集合定义与笔记记录区分。现有内容先保留，缺失字段进入人工确认清单。不要自动推断论文结论、实验成功状态或作者 affiliation。

### 4.6 Mobile UX

**P1：小屏失去主要知识导航。** 列表 `<lg` 隐藏文件树，文章 `<xl` 隐藏两侧目录；文章虽然有顶部 MobileTOC，但缺本课程目录及顺序导航，长文滚动后返回目录也不方便。390px 观察中，面包屑显示原始文件夹名并压缩“首页/博客”；长标题、简介、元信息和标签占据较多首屏。

筛选页在文章之前展开 11 个分类和 12 个标签，加上大标题区，手机首屏难以看到结果；更长主题集会继续增加纵向成本。小字号 pill、图标按钮和多种悬浮阅读控件也需要统一触摸尺寸和可访问名称。

建议手机用“返回课程 / 当前讲次”、紧凑的目录披露、结果数及收起的筛选入口；长标题自然换行。只让表格、公式、代码区域横向滚动，页面本身不横向溢出。未来补测 320/360/390/768px、200% 缩放与真实触摸设备。

### 4.7 Accessibility

**P1：视觉收起与可访问状态不一致。** `FileTreeView` 的折叠分支保留在 DOM 中，以 grid 高度和 overflow 隐藏；浏览器可访问树仍含链接。`FileTreeClient`、`TableOfContents`、`BackToTop` 用 opacity/pointer-events 隐藏，未同步移除键盘焦点。目录/菜单按钮缺 `aria-expanded` / `aria-controls`，当前页面缺 `aria-current`；图标式视图切换只有 aria-pressed，没有可访问名称。根布局没有跳到正文链接。

**P1：语义和内容替代不足。** 495 次本地图像 alt 使用时间戳文件名，无法描述科研图。成功渲染的 7 篇笔记在页面标题之外还有正文 H1；其他标题层级也需随重设计整理。正文链接主要靠颜色/hover 显示，需非 hover 的明确识别方式；现有玻璃与透明色组合没有进行完整对比度测量，不能直接宣称全部不合格。

自动循环视频没有暂停入口，全站未发现 prefers-reduced-motion 规则。持续超过 5 秒且与其他内容并列呈现的自动移动内容，需要暂停/停止/隐藏机制；最终是否适用要按实际呈现核验，不能只加 reduced-motion 就视作解决。[WCAG 2.2：Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

重设计以 WCAG 2.2 AA 为目标：普通文本对比度至少 4.5:1，大文本 3:1；AA 触摸目标最低规则为 24×24 CSS px，并有间距/行内等例外，建议本站主要控件采用 44px 作为设计目标，不把 44px 误写成 AA 硬性要求。[Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)

已存在 `lang="zh-CN"`、语义 article/time、部分 aria-label、原生 details，是可延续的基础。还需键盘和屏幕阅读器验证，不能用源码检查替代操作测试。

### 4.8 SEO

**P1：内容身份与研究定位不足。** 根 metadata 是通用技术博客描述；文章只有 title/description，没有 canonical、统一 title template、明确社交分享 metadata、Breadcrumb/Article 结构化数据。论文页没有稳定呈现论文题目、来源、发表年份与笔记日期的区别。

本地 `/sitemap.xml` 与 `/robots.txt` 都返回 404。缺 robots.txt 本身不意味着禁止抓取；缺 sitemap 会失去明确发现全部内容及更新的入口。分类/标签 query、卡片/list view 和将来的搜索容易制造大量重复 URL，需要区分可索引集合页、分页和非索引筛选页。[Next.js Metadata 文件约定](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)、[Google canonical 指南](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

A01 的文章错误页、缺日期内容的 mtime 和空讲义会降低页面质量。首页的“更新”含义不真实，会误导用户，也不能作为可靠 sitemap lastmod。迁移必须保护已分享的旧 URL 和段落锚点；不能只把所有旧地址重定向到首页。

### 4.9 Performance

**P1：当前最明确的瓶颈是数据边界和首屏资源，不是文章数量本身。** `Post` 带完整 content；全站 tree 和 flat 又各自包含正文。实测序列化：flat 640,078 bytes，root 642,326 bytes，合计 1,282,421 bytes（约 1.22 MiB）。React/RSC 可能有引用复用，不能把两者简单相加当作每次真实线缆传输，但已生成 HTML 表明全文数据确实进入了不需要全文的页面。

| 本地生产输出 | 未压缩 HTML | 本地 gzip 估算 |
| --- | ---: | ---: |
| 首页 `/` | 107,948 bytes | 26,886 bytes |
| Blog 列表 `/blog` | 924,829 bytes | 260,461 bytes |
| 主作者页 | 843,037 bytes | 253,275 bytes |
| 强化学习 Bellman Equation 文章 | 1,833,456 bytes | 302,815 bytes |

53 个文章 HTML 合计约 51.2 MiB；这包含正文、数学输出及 RSC 数据，不是用户一次需要下载全部页面。每篇携带全站正文的导航会让文章输出随其他文章增长，放大构建产物和请求成本。

按当前平均正文大小线性推算，500 个文件的正文合计约 5.32 MiB，tree+flat 的 JSON 约 11.54 MiB。**这是估算，不是已执行的 500 篇基准，也没有包含图片。** 静态生成 500 页本身并不要求换技术栈；真正需要消除的是把全站内容复制到列表、导航和每篇文章的客户端边界。

`public/video/hero.mp4` 为 87,339,934 bytes；自动播放不能靠 preload=metadata 保证只下载 metadata。全局 Klee One 及 Inter 产物字体共约 7.27 MiB；代表页面声明的 123 个 preload 对应约 3.39 MiB 字体文件。这里统计的是声明和文件大小，未模拟浏览器缓存后的实际下载总量。

图片 API 已有尺寸变换、Accept 格式协商、ETag 和 Cache-Control，值得保留。但文章图片统一 1200px、缺尺寸占位；变换先于 If-None-Match 判断，原站没有明确的变换缓存，重复回源请求可能重新做图。大头像原图约 6.47 MiB，需按真实展示尺寸处理。Mermaid 已动态导入，不应把所有大依赖都归结为首屏同步下载。

后续验收再测 LCP/INP/CLS：目标为按设备分组的 p75 LCP≤2.5s、INP≤200ms、CLS≤0.1；本次没有这些实测值。[Core Web Vitals](https://web.dev/articles/vitals)

### 4.10 Broken links / Technical debt

**已验证的内容问题：**

- 两个论文 URL：`/blog/Paper-Reading/Computer-Vision/InfiniDepth_%E7%AC%94%E8%AE%B0` 和 `/blog/Paper-Reading/Computer-Vision/3D_Common_Corruptions_and_Data_Augmentation_%E7%AC%94%E8%AE%B0`。HTTP 200，但文章未显示；第一条另有浏览器确认。
- 编译原理集合文章的 3 个图片 URL 指向错误父目录；源图片存在。全部源 Markdown 中的 495 个本地图片引用都能找到文件，错误发生在渲染时的地址转换。
- 3D Common Corruptions 笔记正文第 142–148 行有 8 个 `../code/3DCommonCorruptions/...` 相对链接；仓库中没有对应代码，页面也没有将其解析为可信外部仓库 URL。当前该文路由先被 A01 阻断，修复路由后这些链接仍需处理。
- Hello World 封面 `/images/hello-world.jpg`、示例作者头像 `/avatars/lisi.jpg` 和 `/avatars/zhangsan.jpg` 缺失，返回 404。
- About 的 `zichaozhu@example.com` 和示例作者 example.com 社交地址是占位数据；应列为不可信联系入口，不能混称已测 HTTP 404。
- InfiniDepth 项目 URL 以正文纯文本出现，不能假定已成为可点击来源入口。

**发布和工具问题：**

- `scripts/sync-md-to-mdx.ts` 实际写入 `Foo/index.md`，保留原 `Foo.md`；两者会生成相同文章 route。它创建空 assets 目录，未搬运旧相对资源，缺字段时固定填“编译原理”，以字符串拼 YAML，且可覆盖已有目标。README 的“挪入目录”描述与行为不同。以上为源码推断，未运行写入脚本。
- `watch-md.ts:25` 使用 `chokidar.watch('**/*.md')`，但 Chokidar 4 起取消 glob 支持，当前依赖为 5；监听语义不符合脚本假设。后续若修复监听，也需避免监视生成文件产生循环及用 shell 字符串处理路径。[Chokidar 官方升级说明](https://github.com/paulmillr/chokidar#upgrading)
- `.github/workflows/deploy.yml:51` 上传 `./out`，配置却无 `output: 'export'`；应用存在动态图片 API 和按查询参数渲染的列表。GitHub Pages 不能直接执行这些服务端能力，不应只加 export 参数就声称部署兼容。[Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- 当前本地图片已是实际文件，API 构建 trace 包含内容资产；没有证据表明当前 trace 遗漏图片。但 Git LFS checkout/实际平台打包必须在迁移时确认，GitHub checkout 没有显式 `lfs: true`。
- 图片 API 没有图片扩展名 allowlist，实测能下载 `.md`；没有当前 draft=true 内容，不能声称已泄露私有草稿。目录检查使用字符串 startsWith，边界和符号链接还需强化；本次没有验证目录穿越利用。应改为发布资产清单及规范路径检查，而不是把 content 全目录当公开文件服务。
- README 有不存在的 SearchDialog、layouts、shadcn 等描述；Hello World 仍写 Next.js 14，与 Next 16 不一致。未使用依赖、重复 TOC 组件、过期注释和字体变量增加理解成本，须确认引用后再清理。

## 5. 500+ 篇时的可用性判断

| 用户任务 | 当前风险 | 500+ 篇所需能力 |
| --- | --- | --- |
| 继续学一门课程 | 文件树可看顺序，列表按日期；手机无同等入口 | 独立课程集合、明确讲次、上一讲/下一讲、局部目录 |
| 找记得缩写或正文词的论文 | 无搜索，截断标签和标题 | 中英混合全文检索、论文缩写/全称、来源字段和过滤 |
| 回顾某研究问题的发展 | 日志以日期文件组织，跨类型无关系 | 研究方向集合、时间线、少量人工关联的论文/想法/实验 |
| 引用一段推导 | TOC ID 与渲染不同，点击不保留 hash | 稳定文章地址、统一标题 ID、原生锚点与旧锚点兼容 |
| 在手机阅读长论文 | 长头部、缺上下文，图片无占位 | 稳定正文宽度、紧凑元信息、目录入口、响应式资源 |
| 改分类或移动文件 | URL 随文件路径改变 | 稳定 ID/slug，分类不改变文章地址 |
| 维护元数据与发布 | fallback 隐藏问题、sync 可能重复 | 共享内容清单、构建时验证、显式发布状态、清晰写作流程 |

目前结构不适合作为 500+ 篇知识主页原样延伸。Markdown、Next.js 和静态文章仍然合适；应重构信息与数据边界，而不是通过更多装饰或数据库掩盖问题。

## 6. 建议实施顺序与保留项

1. **先恢复内容正确性：** A01–A04、缺失资源、空笔记及占位来源；检查真实文章内容而非只检查 HTTP 200。
2. **建立内容基础：** 稳定身份、元数据校验、摘要/正文分离、课程集合和正确排序；维护旧 URL 清单。
3. **完成发现与阅读：** 新导航、集合页、分页、全文搜索、统一正文排版、手机上下文和键盘访问。
4. **完善发布质量：** SEO、资源性能、部署流程和写作工具；用代表性长文及隔离的 500 篇样本验证。

保留现有有价值的正文、数学/代码/Mermaid/Callout 支持、文件写作、深色模式和静态文章能力。重设计不要求批量重写科研结论、不强制搬动所有文件、不引入自动生成“关联知识”或未经确认的项目成果。

完整目标结构、取舍及分阶段迁移见 [REDESIGN.md](REDESIGN.md)。本文的故障数量和页面体积保留为实施前对照，不代表当前构建结果。
