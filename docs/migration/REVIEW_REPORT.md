# Independent whole-branch review

One fresh read-only `gpt-6-astra` reviewer inspected `d87c440..c65f1db` against the approved specification and plan. No Critical issue was found. The review acknowledged real template integration, explicit content predicates, strict dates, preservation evidence, isolated scale/performance measurements and honest production limitations.

## Findings and executor grades

| Finding | Reviewer | Executor | Disposition |
| --- | --- | --- | --- |
| Frozen migration hashes block ordinary edits, visibility changes and stable-ID moves | Important | Important | Separate immutable migration audit from live site verification; decouple ongoing test counts from initial corpus. |
| Draft/unlisted collection introductions render in public collection pages | Important | Important | Shared public collection predicate used by both loaders. |
| Global posts-only image boundary prevents normal project body images | Important | Important | Select a validated per-collection root; preserve cross-collection rejection. |
| Failed music repeats indefinitely | Important | Important | Stop after configured URL alternatives; another user action retries. |
| Delayed old query data can replace new query results | Minor | Important | Incorrect results can disagree with the visible query/count; check request generation after data loads. |
| Results omit course/type context | Minor | Minor | Deferred; existing course/type filters still work, but repeated lecture titles are harder to distinguish. |
| Project bodies enter the note index while project URLs miss sitemap | Minor | Important | Published projects would break note-only index invariants and CI; keep project discovery separate and add sitemap URLs. |

Important fixes receive reproducing RED→GREEN tests and the complete suite. No second reviewer is dispatched.

## Behaviors set aside by the reviewer

- Hosting HTTP 301/308 and production-origin staging: no domain/platform supplied; accepted preview delivery defers these until cutover.
- Final personal media cost/suitability: prototype assets cannot establish this; remeasure final assets.
- Hosted release recovery: no hosted release identified; only local source recovery is verified.
- Disabled upstream optional features: remain outside enabled scope; activation requires its own checks.

These were accepted as explicit delivery limits, with costs recorded in DECISIONS.md. The source main remains unchanged. Production cutover remains pending regardless of the local review fixes.

## Fix verification

All six executor-graded Important findings passed reproducing RED→GREEN tests. Tracing the affected shared callers additionally fixed legacy anchors after stable-ID file moves and authored linked-image destinations; both had failing tests before their fixes. Final whole-tree verification: 26 units + 23 browser tests + 3 isolated authoring-output regressions = 52 passed, 0 failed. Frozen install, read-only lint, Astro/TypeScript, build, live verification, immutable migration audit and Git whitespace checks passed. The original 703-path source fingerprint remains unchanged. No second reviewer was used. The one Minor above remains deferred.
