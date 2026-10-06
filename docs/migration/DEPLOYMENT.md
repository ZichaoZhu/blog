# Astro / Firefly 正式发布记录

发布日期：2026-10-06（Asia/Shanghai）。

## 发布版本

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
