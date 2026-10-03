# Content integrity report

53 original Markdown documents retain their exact body SHA-256: 44 public articles, 3 unlisted articles, 5 collection introductions and 1 empty lecture. The 47 non-empty articles have stable `/notes/<slug>/` routes; collections render their introductions in their collection pages. Empty lectures stay out of article lists.

All 578 original PNGs retain their SHA-256. Actual rendered image metadata identifies 498 referenced images; the other 80 remain in the content source. Responsive image variants and original zoom links are recorded from built HTML in `migration/manifest.json`, rather than guessed. All originals, dimensions, srcsets, local links, headings and anchors passed `scripts/verify-site.ts`. All 10 documents containing Mermaid and all 10 containing HTML images were checked; see `CONTENT_REPORT.json`.

Typora rendering compatibility handles `[toc]`, inline marks, HTML images, image names containing spaces/parentheses, and malformed bare alignment separators. These transformations affect rendering only. Eight references to an absent local code checkout use the authors' [official repository at the verified commit](https://github.com/EPFL-VILAB/3DCommonCorruptions/tree/4fc007b022b91774c9d671afe3d29005812d5745), through `migration/source-links.json`.

The original worktree's source remains unchanged. This branch's old duplicate `content/posts` was removed only after the local snapshot and migrated source passed the integrity checks. Re-run `pnpm test` and `node --import tsx scripts/verify-site.ts` after content changes.
