# Migration acceptance

This document preserves the initial local migration evidence. The 2026-10-06 production release, current checks and rollback version are recorded in [DEPLOYMENT.md](DEPLOYMENT.md); statements below about deployment being pending refer to that earlier stage.

Branch: `feat/astro-firefly`. Implementation uses the pinned Firefly template and Astro static output. Production deployment is not part of this delivery.

| Area | Evidence |
| --- | --- |
| Source integrity | 53 unchanged Markdown bodies and 578 PNG hashes; 44 public notes, 47 article routes, 5 collection introductions, 1 empty lecture. `CONTENT_REPORT.json` |
| Rendering | 10 Mermaid documents, 10 HTML-image documents, formulas, Typora marks, original zoom, dimensions/srcsets; no render or broken local-link errors. |
| Navigation | Courses keep numeric order and same-course neighbors; lists paginate 25/19; empty Ideas/Experiments/Projects have explicit states. |
| Search | 44 public-only results, 20 real multilingual queries, three filters, refresh/back state. `SEARCH_REPORT.json` |
| Legacy links | 53 content endpoints, 578 real image endpoints and 83 heading aliases. `LINK_REPORT.md` |
| Media | One paused-by-default audio instance, continuity across 10 Swup transitions; reduced motion/Save-Data, saved pause, hidden tab, failures and keyboard controls pass. |
| Reading/accessibility | 320/390/640/768/1280 viewports in both themes, 640px equivalent 200% desktop zoom, no global horizontal overflow; menu/search/theme controls, main skip link, native mobile TOC and visible focus. No-JS article/course/pagination/hash/search fallback pass. |
| Scale | 500 public notes: 200 course, 180 paper, 50 log, 30 idea, 20 experiment, 20 note; 44 distinct real source bodies, long titles, missing dates, math/code/images. 20 pages × 25; Pagefind 500, course filter 200, combined filters work, no draft URL or sentinel leakage. `SCALE_REPORT.json`, `SCALE_SEARCH_REPORT.json` |
| Restore | Temporary recovery restored and SHA-256 verified all 712 snapshot files and 22 tracked deletions. `RESTORE_REPORT.json` |

The scale build measured 75.235s and 4,195,188,736 bytes peak RSS on this machine. It reused the real 578-image set and the current installed dependencies, not 500 newly illustrated documents; new unique images would increase build cost. It produced roughly 153MB of HTML and a 4.8MB segmented Pagefind index. These are local measurements, not hosting or CI guarantees. Same-title cloned samples sometimes push the original ID below the first five while returning equivalent source content; exact-source ranks are preserved in the report. Course/topic filters remain useful as the library grows. Native Pagefind also has the partial mixed-script matching limitation described in CONTENT_REPORT.

The avatar performance regression (6,779,343-byte original downloaded by the navbar) was reproduced and fixed by a small shared WebP rendition; the authored PNG remains available. Browser performance is compared against an actual temporary build of the restored Next source under the same 390×844 viewport, 40ms latency, 1.5Mbps download, cold contexts and reduced motion; three runs per page. See PERFORMANCE_REPORT.json. Decoration and media have separate resource reports; playing uses the explicit 9.6KB video test fixture and the template's local audio, so it cannot establish the cost of future personal media.

Remaining cutover inputs: confirmed production domain/host, personal video/music assets and a recoverable current hosted release. Preview is globally noindex. The host-specific 301/308 rules and production-origin staging validation are pending those inputs. No push, merge, deployment or DNS change was made.

Task 9 static-cover medians (same machine/network, three cold runs):

| Page | Next transferred | Astro transferred | Next FCP | Astro FCP | Next LCP | Astro LCP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 214,626 B | 406,167 B | 472ms | 784ms | 472ms | 1,992ms |
| OS Lec3 | 508,196 B | 636,770 B | 328ms | 864ms | 328ms | 3,212ms |

The final avatar is 19,608 bytes. The Firefly presentation remains heavier than the simpler Next presentation under these conditions; this migration does not demonstrate a speedup. Different largest visible elements and presentation affect LCP, and localhost measurements do not establish deployed CDN performance. The migration improves the content organization and maintenance workflow while keeping the user's requested template/media style.

## Delivery checks

Frozen install with pnpm 11.22.0 passed. 26 unit tests, 23 browser tests and 3 isolated real-authoring build regressions passed, Astro check reported 0 errors/warnings/hints, TypeScript passed, and read-only Biome reported no errors (5 non-null-assertion warnings and 24 template-literal suggestions). The final build indexed exactly 44 public pages. Render verification found no errors in 53 source bodies, 578 original assets and local links. Original main's 703-path source fingerprint remains unchanged.

CI uses Node 22.23.0 / pnpm 11.22.0, Git LFS checkout and the same commands; it has not been run on a remote runner because this branch has not been pushed. Default build skips inactive GitHub/VNDB/font-subset tasks and generated OG images; active LQIP, avatar optimization, unused PIO-resource pruning, inline JS minification and Pagefind remain.

## Independent review and final fixes

One fresh read-only whole-branch review found no Critical issues. Six executor-graded Important findings were fixed with reproducing RED→GREEN tests, followed by the complete 52/52 suite, read-only lint, Astro check (297 files, no diagnostics), TypeScript, build, live-site verification and the separate immutable migration audit. Stable-ID file moves also preserve historical heading aliases; linked images keep the authored destination. See REVIEW_REPORT.md and DECISIONS.md.

Ongoing CI checks current content rather than freezing body bytes, dates, status or initial public counts. Historical migration evidence remains unchanged and can be checked with `pnpm audit:migration`. A temporary app with draft/unlisted introductions, a normal new note and a project containing a local body image builds successfully; private introductions stay absent, the public project appears in sitemap and Pagefind remains note-only. CI runs this test with `pnpm test:authoring` without modifying real source files.

Deferred: search results do not yet display course/type labels; the existing filters work. Measurements of 500-note size/time, cold-page performance and media resource cost were made during Task 9 (commit d21625d), before the final handoff fixes, and are retained with that provenance rather than represented as newly repeated measurements. Final screenshots were refreshed against the delivered preview.
