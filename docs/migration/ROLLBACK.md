# 迁移恢复与发布回退

原 HEAD：`d87c4407bc54b52528fadb6e12396416b9c9cc28`。原 `main` 工作区的未提交修改、删除与未跟踪文件均保留；恢复不能只 checkout 此 HEAD，否则会丢掉当时尚未提交的内容。

本地完整快照：`/Users/zzc/Desktop/一路成长/blog/.worktrees/_backups/astro-firefly-2026-10-03`。`manifest.json` 记录 712 个文件的 SHA-256 和 22 个 tracked 删除；`files/` 是实际字节，`tracked.patch` 用于审查原 tracked 改动。快照包括 53 份 Markdown 和 578 张真实 PNG。恢复文件后不要再叠加应用同一 patch。

## 在新临时目录恢复

先确认快照仍在，复制至可靠存储；快照不随 Git 分支推送。下面只写新临时目录，已存在时拒绝继续，不覆盖当前 main：

```bash
python3 - <<'RESTORE'
import hashlib, json, shutil, subprocess
from pathlib import Path
repo = Path('/Users/zzc/Desktop/一路成长/blog')
backup = repo / '.worktrees/_backups/astro-firefly-2026-10-03'
target = Path('/tmp/zzc-next-recovery-new')
assert not target.exists(), 'choose a fresh directory'
m = json.loads((backup / 'manifest.json').read_text())
assert m['sourceHead'] == 'd87c4407bc54b52528fadb6e12396416b9c9cc28'
target.mkdir()
archive = subprocess.check_output(['git', 'archive', m['sourceHead']], cwd=repo)
subprocess.run(['tar', '-xf', '-', '-C', str(target)], input=archive, check=True)
for item in m['files']:
    dst = target / item['path']
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(backup / 'files' / item['path'], dst)
for name in m['deletedTrackedFiles']:
    (target / name).unlink(missing_ok=True)
for item in m['files']:
    assert hashlib.sha256((target / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
assert all(not (target / name).exists() for name in m['deletedTrackedFiles'])
print('Restored and verified', len(m['files']), 'files;', len(m['deletedTrackedFiles']), 'deletions')
RESTORE
```

此流程已实际在 `/tmp/firefly-next-baseline-20261003` 恢复，并核对全部 712 hashes 与 22 删除，见 [RESTORE_REPORT.json](RESTORE_REPORT.json)。恢复后的旧 Next 项目也实际完成构建用于同条件性能对照。后续可在新的恢复目录依照该旧项目自己的 package/lockfile 安装和构建，勿套用新分支的 pnpm 依赖。

## 本次正式发布

2026-10-06 已沿用原 Vercel 项目 `zichaozhus-projects/blog` 发布 Astro。正式域名为 `https://blog.blessingworld.cn`，新部署为 `dpl_GgML7Lb9BBV3xhnLrcqTYmamyK9P`。原 Next.js 部署 `dpl_5RAef5zEDq9cbgZjtt1BfW77aHGi` 保留，其地址为 `https://blog-9zshenq3l-zichaozhus-projects.vercel.app`。

生产构建先暂存验收，再切换域名；全部 642 个旧页面与图片地址在正式域名完成 HTTP 308 验证。原部署、项目设置、robots、sitemap 的发布前快照保存于本机 `/tmp/goongmly-release-before-20261006/`，该临时目录不作为长期恢复的唯一依据。正式版本、验证与回退命令见 [DEPLOYMENT.md](DEPLOYMENT.md)。DNS 未改变。

2026-10-07 已发布桌面导航与首次搜索修复，该次部署为 `dpl_5CR1LXW3sivG6xuDhTKizgSba8Tk`，运行代码提交为 `6705a238f114167a3d5f81e8f9516355747cf5a6`。若只需退回修复前的 Astro 版本，使用以下命令；下文恢复 Next.js 的路径继续保留：

```bash
pnpm dlx vercel@62.2.0 rollback dpl_GgML7Lb9BBV3xhnLrcqTYmamyK9P --yes --scope zichaozhus-projects
```

2026-10-07 随后发布导航图标修复，当前正式部署为 `dpl_BDZ4F34Sj2eoURGJex9JoCikZhEa`，运行代码提交为 `30241dbf3eb0daff6859d510522e2fc8cea0a93b`。如只需退回图标修复前的版本：

```bash
pnpm dlx vercel@62.2.0 rollback dpl_5CR1LXW3sivG6xuDhTKizgSba8Tk --yes --scope zichaozhus-projects
```

## 如需线上回退

1. 在同一 Vercel 项目执行下方命令，恢复保留的完整旧部署与旧规则；若旧部署已被删除，使用上述恢复副本生成旧产物。
2. 同时恢复旧 robots、sitemap、索引和域名配置；清理平台缓存后验证旧文章、图片和搜索。不能让新 Pagefind 索引混在旧 Next 产物中。
3. 保留迁移分支和问题证据用于修复。不要 reset 当前 main，也不要删除新写的文章；先单独备份切换后新增的内容再评估回迁。

```bash
pnpm dlx vercel@62.2.0 rollback dpl_5RAef5zEDq9cbgZjtt1BfW77aHGi --yes --scope zichaozhus-projects
```

回退旧产物不需要重新构建。若后续继续构建旧 Next 源码，再恢复 Vercel 框架为 `nextjs`、Node 为 `24.x`。迁移分支与原工作区保留，勿 reset main；Git 生产分支仍为 main，本次为迁移分支的指定提交手动发布。
