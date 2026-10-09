# Astro / Firefly 正式发布记录

首次发布日期：2026-10-06；最近更新：2026-10-09（Asia/Shanghai）。

## 论文解析树：上线前准备（2026-10-09）

论文树功能代码在 `feat/astro-firefly` 完成本地及 Linux CI 验收；私人数据仓库、Studio 项目与 GitHub App 安装已配置。本人授权后，App 凭据已写入 Studio Production 加密服务端变量，私人 Actions secrets 名称已齐。当前还缺 Studio DNS；真实作者登录、token 运行有效性、首次发布及回退尚待验收，因此当前正式部署仍为下方导航修复版本。配置顺序见 [SETUP](../paper-trees/SETUP.md)，候选排障、合成数据检查与待验证项见 [ACCEPTANCE](../paper-trees/ACCEPTANCE.md)。两个项目 Ignored Build Step 已设为 `exit 0`，避免旧 main 的自动 Git 构建绕开协调发布；Git 生产分支仍为 `main`。后续应用更新应通过 `publish:code` 协调博客与 Studio，图回退通过历史成功清单；本文此前的裸 Vercel 回退命令保留为历史记录。

`1c46c55` 的博客与 Studio 受保护候选已通过首页 / 工作区及匹配回执核验，匿名 JSON 请求 401，bypass 请求 200；Studio 的运行依赖缺失已修复。候选尚未推广，正式博客仍为 `dpl_BDZ4F34Sj2eoURGJex9JoCikZhEa`。真实登录和私人数据 API 尚待配置验收，不能把候选工作区可响应等同于功能上线。

App 配置后重建的 Studio 候选 `dpl_RK7mmhVhdF5c8UxLM2SWxbQxPePX` 已通过匿名会话、私人 API 拒绝访问、正确 GitHub 登录跳转和安全 state cookie 检查。阿里云两台权威 DNS 仍无 studio CNAME，因此没有登记首次 code 作业，也没有切换正式域名。

## 最新发布：导航图标修复（2026-10-07）

| 项目 | 值 |
| --- | --- |
| 正式地址 | https://blog.blessingworld.cn |
| 运行代码提交 | `30241dbf3eb0daff6859d510522e2fc8cea0a93b` |
| 正式部署 ID | `dpl_BDZ4F34Sj2eoURGJex9JoCikZhEa` |
| 正式部署地址 | https://blog-6c2j99z26-zichaozhus-projects.vercel.app |
| 上一版 Astro 部署 ID | `dpl_5CR1LXW3sivG6xuDhTKizgSba8Tk` |

修复上一版在 1440px 以下隐藏菜单图标的问题。首页、Courses、Papers、Research、Projects、归档的图标与文字现在从 1024px 起一起显示；窄桌面只收紧菜单与品牌间距。布局为导航内容保留所需宽度，站点名称仅在空间不足时显示省略号，避免挤压导航和右侧控件。沿用已有图标、按钮交互、字号与搜索布局，无新增依赖。

验证记录：

- 增强现有导航回归，检查六个图标可见，同时保留单行、与品牌和控件不重叠、搜索聚焦后的布局检查；修复前在 1024px 因图标隐藏而失败，修复后九种桌面宽度均通过。
- 本地 50 项单元测试、69 项完整浏览器测试通过；构建、Astro check、TypeScript 和站点验证通过，Biome 无错误，保留模板已有的 5 warnings / 35 infos。
- [本次 Linux CI](https://github.com/ZichaoZhu/blog/actions/runs/37574777478)的单元测试、69 项浏览器测试、静态检查与构建通过。
- 生产暂存与正式域名均验证 1024、1100、1279、1280、1360、1399、1400、1440、1920px 九种桌面宽度，六个图标可见且导航不重叠；7 个代表页面的共享导航、首次搜索、鼠标与键盘跳转均通过。
- 1024px / DPR 2 且禁用 JavaScript 的直接入口可用；390px 手机菜单与搜索可用，无整页横向溢出，浏览器无脚本错误。
- 正式域名已切换到上述部署；临时验收凭据已撤销，项目自动化绕过凭据为 0。DNS 与项目配置保持原有设置，原 main 工作区未修改。

如需回到图标修复前的 Astro 部署：

```bash
pnpm dlx vercel@62.2.0 rollback dpl_5CR1LXW3sivG6xuDhTKizgSba8Tk --yes --scope zichaozhus-projects
```

## 上一发布：桌面导航修复（2026-10-07）

| 项目 | 值 |
| --- | --- |
| 正式地址 | https://blog.blessingworld.cn |
| 运行代码提交 | `6705a238f114167a3d5f81e8f9516355747cf5a6` |
| 测试提交 | `7b4d9476e79d249eec108dca811bddf7d392c8d2`，仅调整三个浏览器测试的等待条件，运行代码相同 |
| 正式部署 ID | `dpl_5CR1LXW3sivG6xuDhTKizgSba8Tk` |
| 正式部署地址 | https://blog-rhpr8bxsb-zichaozhus-projects.vercel.app |
| 上一版 Astro 部署 ID | `dpl_GgML7Lb9BBV3xhnLrcqTYmamyK9P` |

原导航仅在 1440px 起显示，导致常见桌面窗口也被收进菜单。现在 1024px 起直接显示首页、Courses、Papers、Research、Projects 和归档；1024–1279px 使用原有搜索图标与搜索面板，1280px 起显示固定宽度搜索框。窄桌面收紧品牌和菜单间距，菜单图标在 1440px 起显示，兼容 Linux 的较宽系统字体。原按钮交互、字号、配色和动态效果保持原有配置。

同时修复首次搜索：Pagefind 初始化时只执行当前输入框的查询，避免另一个空输入取消首次桌面查询；清空查询和切换窗口布局也有回归覆盖。测试等待当前导航结束，并兼容普通整页跳转；音乐测试等待播放器初始化完成。

验证记录：

- 本地 50 项单元测试、69 项完整浏览器测试通过；构建、Astro check、TypeScript 和站点验证通过，Biome 无错误，保留模板已有的 5 warnings / 35 infos。
- [最终 Linux CI（测试提交 `7b4d947`）](https://github.com/ZichaoZhu/blog/actions/runs/37572023879)全部通过，包含 50 项单元测试、69 项浏览器测试、3 项隔离真实写作回归，以及 Pagefind 和开发模式的公开性更新验证。
- 生产暂存与正式域名均验证 1024、1100、1279、1280、1360、1399、1400、1440、1920px 九种桌面宽度：六个入口可见、单行显示，与品牌和控件不重叠；搜索聚焦布局、首次搜索、鼠标和键盘导航均通过。
- 正式域名 7 个代表页面的共享导航通过；1024px / DPR 2 且禁用 JavaScript 的直接入口可用，390px 手机菜单可进入课程和论文页面，无整页横向溢出，浏览器无脚本错误。
- 正式域名 8 个页面的 canonical、索引设置、72 篇公开索引、RSS、Atom、robots、sitemap、旧页面与图片抽查、MP4 Range 和真实文章图片均通过。路由配置未改变，首次发布时完成的全部 642 项旧地址验证记录保留于下文。
- 正式域名已切换到上述部署，DNS 与项目设置保持原有配置；临时访问凭据已撤销，项目自动化绕过凭据为 0；原 main 的 703 项文件状态及源笔记的 167 项校验值保持不变。

如需回到这次修复前的 Astro 部署：

```bash
pnpm dlx vercel@62.2.0 rollback dpl_GgML7Lb9BBV3xhnLrcqTYmamyK9P --yes --scope zichaozhus-projects
```

## 首次发布版本（2026-10-06）

| 项目 | 值 |
| --- | --- |
| 正式地址 | https://blog.blessingworld.cn |
| Vercel 项目 | `zichaozhus-projects/blog` |
| 项目 ID | `prj_PptmDMYX9FMl36QWVoN8Tka8DdVN` |
| 发布分支 | `feat/astro-firefly` |
| 运行代码提交 | `eddbcec8afdb4177f31db65d275dc4c7e22f9152` |
| 新部署 ID | `dpl_GgML7Lb9BBV3xhnLrcqTYmamyK9P` |
| 新部署地址 | https://blog-dxqnk9083-zichaozhus-projects.vercel.app |
| 原线上部署 ID | `dpl_5RAef5zEDq9cbgZjtt1BfW77aHGi` |
| 原部署地址 | https://blog-9zshenq3l-zichaozhus-projects.vercel.app |

## 发布方式

沿用原 Vercel 项目、域名和 GitHub 连接，框架设置改为 Astro，Node 改为 22.x，保留 Git LFS。个人视频和全部图片保留，通过 Git 远端构建上传，未改变 DNS。先创建 `target: production`、`autoAssignCustomDomains: false` 的指定提交部署，完成暂存验证后再 `vercel promote` 切换。

`vercel.json` 从现有 `src/data/legacy-routes.json` 生成，包含 64 个旧页面的带斜杠与不带斜杠规则，以及 578 个旧图片规则。Vercel 对无扩展名路径可能先补斜杠，再以 HTTP 308 跳转至规范地址。兼容映射保持同一数据来源，由单元测试检查完整性；中文和空格使用 URL 编码匹配；图片文件名中的括号按字面量转义。

默认本地构建和 Git 预览均为 noindex；正式构建明确设置 `PUBLIC_SITE_MODE=production`、`PUBLIC_SITE_ORIGIN=https://blog.blessingworld.cn`。Astro 配置阶段与页面阶段使用同一个生产地址，canonical、RSS、Atom、robots 和 sitemap 均已在线验证。

Vercel 的 Git 生产分支仍为 `main`。这次手动发布指定的迁移分支提交；后续继续使用同样流程，直到另行决定合并或调整自动发布分支。原 `main` 的未提交修改未合并、重置或覆盖。

## 验证

- 本地：50 项单元测试、67 项完整浏览器测试通过；页面键盘操作修正后另外重复运行 3 轮，共 9 项通过。Astro check 为 0 errors / 0 warnings / 0 hints，TypeScript 通过，Biome 无错误（保留模板已有的 5 warnings / 35 infos）。
- Linux CI：[提交 `62d44cc` 的完整检查](https://github.com/ZichaoZhu/blog/actions/runs/37460169184)通过，包含 50 项单元测试、67 项浏览器测试、3 项隔离真实写作回归，以及 Pagefind 和开发模式的公开性更新验证。该提交相对部署提交 `eddbcec` 仅同步键盘测试的页面切换等待，应用运行代码相同。
- 暂存与正式域名：8 个代表页面 HTTP 200、H1 与 canonical 正确；公开站点没有 noindex HTTP 头或元数据。Pagefind 与公开元数据均为 72 篇，机器学习课程内的 `pandas` 查询命中正确文章。
- 正式域名逐条验证全部 64 个旧页面、578 个旧图片地址，共 642 项永久跳转通过。包含中文路径及含空格、括号的文件名；无扩展名旧文章经过补斜杠和规范地址两次 HTTP 308。
- RSS、Atom、robots、sitemap 均使用正式域名，没有本地地址；抽查原图返回真实 PNG，视频支持 MP4 Range 请求。
- 390px 手机视口无整页横向溢出，新导入 DL4CV Lec3 的真实图片正常加载；浏览器未记录脚本错误。
- 原 main 的 703 项文件状态和笔记源目录的 167 项 SHA-256 校验值保持不变。
- 仓库首页链接已更新为正式域名；项目自动化绕过凭据恢复为 0。

## 回退

原 Next.js 部署保留，可在同一 Vercel 项目恢复：

```bash
pnpm dlx vercel@62.2.0 rollback dpl_5RAef5zEDq9cbgZjtt1BfW77aHGi --yes --scope zichaozhus-projects
```

该命令切回已保存的完整旧部署，不需要重建。恢复后核对首页、旧文章、图片、robots 和 sitemap；不要 reset 原工作区。若后续要继续从旧 Next 源码构建，再将 Vercel 框架恢复为 `nextjs`、Node 恢复为 `24.x`。本地源文件恢复步骤见 [ROLLBACK.md](ROLLBACK.md)。

发布检查使用的临时自动化绕过凭据在验证结束后全部撤销；Vercel 本地项目关联文件、环境文件和认证信息均未提交到仓库。
