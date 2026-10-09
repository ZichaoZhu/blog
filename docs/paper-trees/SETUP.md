# 论文解析树配置与运行

对应 [设计](../superpowers/specs/2026-10-08-paper-analysis-tree-design.md)。本功能由静态博客、独立 SSR Studio 和单独的私人 GitHub 数据仓库组成；无需数据库。当前本地检查见 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 1. 核对账号与发布基线

使用现有登录核对：

```bash
gh api user --jq '{login,id}'
```

2026-10-09 只读预检得到 `ZichaoZhu` / **167670554**。唯一作者限制必须使用这个数字 ID，不能以用户名作为鉴权条件。

博客为 `https://blog.blessingworld.cn`，Vercel 项目 `prj_PptmDMYX9FMl36QWVoN8Tka8DdVN`，team `team_74tg5M0xxNWVoV0PCBNMpHXr`。执行首次切换前，再通过 Vercel alias API 核对正式域名的实际部署 ID 和源码 SHA；部署历史记录不能替代当前 alias。

现有 Git 生产分支保持 `main`，源码允许分支设为 `feat/astro-firefly`。所有操作使用独立干净 checkout，不覆盖主工作区。普通 Git 自动部署也必须避免绕开私人发布锁；启用前在两个项目将 **Ignored Build Step 设置为 `exit 0`**，保留 Git 连接和生产分支，后续通过协调 worker 的 prebuilt 部署发布。Vercel 规定退出 0 会跳过远程构建，见 [官方说明](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)。上线验收需实际验证这个设置不阻断 worker 的本地 `vercel build` / `deploy --prebuilt` 路径。

## 2. 创建私人数据仓库与初始控制文件

建议创建 **`ZichaoZhu/paper-analysis-data`**，可见性必须为 private，默认分支 `main`。例如：

```bash
gh repo create ZichaoZhu/paper-analysis-data --private --description 'Private paper analysis drafts and publication state'
```

在该私人仓库单独 checkout 中，安装本源码的 `ops/paper-trees/publish.yml` 为 `.github/workflows/publish.yml`。工作流只能安装在私人仓库中，不放进博客的 `.github/workflows`。

初始 `control.json`：

```json
{
  "schemaVersion": 1,
  "activeReleaseId": null,
  "activeCodeSha": "<当前正式部署的40位源码SHA>",
  "activeDeploymentId": "<刚核对的dpl_部署ID>",
  "activeStudioDeploymentId": null,
  "activeJobId": null,
  "baselineDeploymentId": "<同一个旧正式部署ID>"
}
```

占位符必须替换成实际值后才提交。初始成功图集合为空，由 `activeReleaseId: null` 表示；不虚构已成功的 release。首次 code 作业生成空 entries 清单，同时发布匹配的博客及 Studio。正常操作只由服务写入 drafts / snapshots / releases / jobs / control；人工初始化不上传任何草稿到公开源码。

## 3. 注册并安装 GitHub App

在 [GitHub App 设置](https://github.com/settings/apps/new) 注册私人 App：

- 首页：`https://studio.blessingworld.cn`。
- OAuth callback：**`https://studio.blessingworld.cn/api/auth/callback`**。
- Webhook 关闭；无需 GitHub 事件订阅。
- Repository permissions：**Contents: Read and write**、**Actions: Read and write**；Metadata 只读为 GitHub 默认要求。
- App 仅安装到 `ZichaoZhu/paper-analysis-data`，不要选择全部仓库。
- 不要求 Workflows write 或仓库 Administration。首次安装工作流使用仓库所有者现有权限。

创建后取得 App ID、OAuth client ID / secret、RSA private key；安装后取得 installation ID。用户授权码只用于识别 GitHub 数字 ID，不作为数据仓库访问凭据。App installation token 由服务器签发、限定单一数据仓库且短期有效。

注册和安装属于新的账号权限授权，需要本人在 GitHub 确认。可以使用 [官方 manifest 流程](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)减少手工复制，凭据仅保存到受限平台设置或权限 0600 的忽略文件；不要将密钥发送到聊天、打印到日志或提交。

## 4. 两个 Vercel 项目

| 项目 | 博客 | Studio |
| --- | --- | --- |
| 名称 | 已有 `blog` | 建议 `blog-studio` |
| Root Directory | 仓库根目录 | `studio` |
| Framework | Astro | Astro / 官方 Vercel SSR adapter |
| Node | **22.x，至少 22.23.0** | 同左 |
| 正式自定义域名 | `blog.blessingworld.cn` | `studio.blessingworld.cn` |
| 候选访问保护 | `all_except_custom_domains` | 同左 |
| Ignored Build Step | `exit 0` | `exit 0` |

Studio 开启 Include source files outside Root Directory。其 `vercel.json` 已指定从父目录安装 workspace、构建 Studio。Native worker 自动维护忽略目录 `.vercel/repo.json` 中的 Studio 映射，并在仓库根目录显式选择项目；博客根目录与 Studio 子目录分别保存预构建产物。不要直接在 `studio` 内执行裸 `vercel deploy`，远端 Root Directory 会被重复拼成 `studio/studio`。DNS 按 Vercel 实际提供的记录添加 Studio 子域名；不要替换博客现有 DNS。两者的 `*.vercel.app` production 候选也需保护，只保护 preview 不满足要求。分别创建项目级 Automation Bypass secret，供私人 worker 检查受保护候选。

Studio runtime / production 设置以下服务端变量：

| 变量 | 值来源 |
| --- | --- |
| `GITHUB_APP_ID` | App 数字 ID |
| `GITHUB_APP_CLIENT_ID` | App OAuth client ID |
| `GITHUB_APP_CLIENT_SECRET` | App OAuth secret |
| `GITHUB_APP_PRIVATE_KEY` | 完整 PEM；支持实际换行及 `\n` |
| `GITHUB_APP_INSTALLATION_ID` | 单仓库 installation 数字 ID |
| `AUTHOR_GITHUB_USER_ID` | `167670554`，操作时再次核对 |
| `AUTHOR_SESSION_SECRET` | 32 bytes 以上的随机 secret，独立于 App key |
| `AUTHOR_ORIGIN` | `https://studio.blessingworld.cn` |
| `PAPER_TREE_DATA_REPO` | `ZichaoZhu/paper-analysis-data` |
| `PAPER_TREE_DATA_BRANCH` | `main` |
| `BLOG_SOURCE_REPO` | `ZichaoZhu/blog` |
| `BLOG_SOURCE_BRANCH` | `feat/astro-firefly` |

博客不能保存上述写入凭据。`PUBLIC_PAPER_TREE_STUDIO_ORIGIN` 只有在 Studio 已能实际登录后才设为正式 Studio origin，避免出现不可用编辑链接。worker 的博客构建设置 `PAPER_TREES_ENABLED=true`、`PAPER_TREE_INPUT_DIR`（临时公开白名单目录）、`PUBLIC_SITE_MODE=production`、`PUBLIC_SITE_ORIGIN`；输入缺失会使启用后的构建失败，不静默丢树。Studio 的论文清单在服务器构建阶段从同一个源码提交生成。

## 5. 私人 Actions 配置

私人仓库 **Variables**：

| 变量 | 值 |
| --- | --- |
| `BLOG_SOURCE_REPO` | `ZichaoZhu/blog` |
| `BLOG_SOURCE_BRANCH` | `feat/astro-firefly` |
| `VERCEL_ORG_ID` | `team_74tg5M0xxNWVoV0PCBNMpHXr` |
| `BLOG_VERCEL_PROJECT_ID` | `prj_PptmDMYX9FMl36QWVoN8Tka8DdVN` |
| `STUDIO_VERCEL_PROJECT_ID` | 新 Studio 项目的实际 `prj_...` |

私人仓库 **Secrets**：`VERCEL_TOKEN`、`VERCEL_AUTOMATION_BYPASS_SECRET`、`VERCEL_STUDIO_AUTOMATION_BYPASS_SECRET`。Vercel token 使用可持续运行、权限限制到所需 team 的凭据；不要把会短期过期的 CLI OAuth access token 当成长效 Actions secret。短期 `GITHUB_TOKEN` 由 Actions 自动提供，工作流声明 Contents write / Actions read。

当前模板读取公开的博客源码；若以后源码改为 private，必须同步提供专用只读源码 token 给前置 compare 和 checkout，不能假定数据仓库的 `GITHUB_TOKEN` 能读取另一个私有仓库。公开 PR CI 只使用合成数据，不注入以上凭据。

## 6. 首次 code 作业与日常发布

在已提交并推送、干净的允许源码 checkout 中，使用 Node 22.23.0：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm check:studio
pnpm test:paper-trees
```

操作员进程需通过安全环境注入：`GH_DATA_TOKEN`（私人数据仓库 Contents / Actions write）、`PAPER_TREE_DATA_REPO`、`PAPER_TREE_DATA_BRANCH`、`BLOG_SOURCE_REPO`、`BLOG_SOURCE_BRANCH`，以及上述 Vercel 变量和 secrets。CLI 内部项目变量名为 `VERCEL_PROJECT_ID` / `VERCEL_STUDIO_PROJECT_ID`，分别对应 Actions 的 `BLOG_VERCEL_PROJECT_ID` / `STUDIO_VERCEL_PROJECT_ID`。不要将 token 写进命令参数或 shell history。

```bash
pnpm publish:code <当前checkout的40位HEAD提交SHA>
```

本机如果配置了 HTTP_PROXY / HTTPS_PROXY，可在操作员命令前设置 `NODE_OPTIONS=--use-env-proxy`，让 Node 22.23 的原生请求使用现有代理；不要提交代理地址或凭据。GitHub Actions 使用自身网络，不需要本机代理。

命令原子登记 code job 并触发私人工作流，输出 job ID；它不是“已经上线”的回执。工作流固定 `code_sha`、`data_sha`，先验证 allowed branch 与私人锁，再安装依赖；先构建并验证两份受保护候选，再切换两个正式域名，最后更新成功指针。期间保存草稿仍可用，其他发布请求会返回 busy。

完成后比对博客 `/paper-trees/release.json`、Studio `/version.json`、Vercel 正式 alias 的 deployment ID 和私人 control；code / release / job 应与本次作业一致，回执 `Cache-Control` 应包含 `no-store`。匿名检查显式发送 `Accept: application/json`，访问候选首页及图 JSON 应为 401 / 403（普通浏览器请求可能返回 Vercel 登录跳转，见 [官方认证说明](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)）；带项目 bypass 的请求才允许检查候选。编辑入口只有在 Studio 登录验收后启用。

作者进入 `https://studio.blessingworld.cn/studio/paper-trees/`，GitHub 登录 → 选择论文 → 完整模板或空树 → 编辑 → 保存私人草稿 → 预览公开版本 → 手动确认发布。模板含 Abstract / Introduction / Method / Experiments / Limitation；节点说明和链接都会公开，草稿保存本身不会发布。只有公开的正文型 Paper 能发布图。

## 7. 故障恢复与回退

不要根据工作流结束、请求超时或旧域名仍可读就清除锁。尤其 promote 已发出但结果未知时，候选可能稍后完成切换。

```bash
pnpm reconcile:paper-trees <job-id>
```

这会核对候选 metadata、正式 alias 的精确部署 ID 和新鲜回执；code job 必须同时核对博客及 Studio。不能证明成功则继续持锁，不将失败清单并入下一次发布。恢复所用 checkout 与环境应与该作业对应。

日常图回退在 Studio 全站解析树历史成功版本中选择，生成新 rollback 作业，恢复所有论文的整份成功清单，不只当前论文；新于所选版本的公开树可能移除，界面确认会明确提醒。当前应用代码和私人草稿保留。普通应用更新一律执行 `publish:code`，从上次成功清单继承全部仍公开的树。

紧急全站回退仅接受已有成功 **code job**，需同时存在两份 archived deployment：

```bash
node --import tsx scripts/paper-trees/worker.ts restore-code-deployment <successful-code-job-id> --full-site
```

该操作恢复整个旧博客和匹配的 Studio，包含旧文章与资源，并把成功指针退回旧链；私人草稿保留。没有匹配 Studio 的功能上线前旧部署不适用这个命令。已有历史部署记录里的裸 `vercel rollback` 是功能上线前的操作记录，启用论文树后不要绕开协调控制指针。

## 8. 真实验收交接

实际验收应记录允许作者首次登录及退出后重读、匿名与另一账号拒绝、保存时读者仍读旧版、候选失败不污染下一次发布、图回退不改草稿、代码发布保留树，以及两份部署 ID / 源码 SHA / release / job。临时验收凭据验后撤销；运行 worker 所需的受限凭据保留。结果追加到 ACCEPTANCE 和迁移 DEPLOYMENT；未执行的步骤标为待验证。
