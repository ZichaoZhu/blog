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

## 线上切换前

当前线上托管平台、release ID 和可恢复产物路径尚未提供。上线之前必须记录这三项，并保存对应域名、HTTP 301/308 规则、robots、sitemap 与搜索索引。模板演示媒体不能替代个人媒体的正式验收。

部署同一迁移提交的 production 构建；把 release ID 与原 release ID 写入发布记录。切换前抽查旧文章、查询筛选、锚点和图片地址。旧规则的备份应包含 host 层配置，静态 HTML 兼容页不等于 host 层永久重定向。

## 如需线上回退

1. 在同一托管平台恢复已保存的旧 release/完整产物与旧规则；若只能重新构建，使用上述恢复副本生成旧产物。
2. 同时恢复旧 robots、sitemap、索引和域名配置；清理平台缓存后验证旧文章、图片和搜索。不能让新 Pagefind 索引混在旧 Next 产物中。
3. 保留迁移分支和问题证据用于修复。不要 reset 当前 main，也不要删除新写的文章；先单独备份切换后新增的内容再评估回迁。

本次没有改变线上 release、DNS 或 HTTP 规则，不需要执行线上回退。迁移分支保留，原工作区仍可按原流程运行。
