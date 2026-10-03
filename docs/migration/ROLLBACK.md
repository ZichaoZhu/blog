# Recovery baseline

Original HEAD: `d87c4407bc54b52528fadb6e12396416b9c9cc28`; original branch main remains unchanged.

Local snapshot: `/Users/zzc/Desktop/一路成长/blog/.worktrees/_backups/astro-firefly-2026-10-03`. manifest.json records 712 authored files and 22 tracked deletions with SHA-256; files/ contains actual bytes, tracked.patch includes tracked modifications.

Restore into a temporary checkout of the original HEAD: copy files/ preserving relative paths, remove only deletedTrackedFiles listed in the manifest, verify every file SHA-256. Never restore directly over current main without inspecting newer work. Snapshot includes 53 Markdown sources and 578 real PNGs. No deployment or DNS change has been made. Existing hosted release artifact must be recorded before production cutover.
