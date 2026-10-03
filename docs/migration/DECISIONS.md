# Migration execution decisions

Ruling: Skill helper files are not executable — identical executable copies in /tmp preserve workflow without editing installed skills — cost if wrong: helper path differs only.

Task 1: Ruling: Old Markdown→MDX watcher/sync scripts survived template import — remove unused legacy scripts rather than add chokidar; Astro watches Markdown natively — cost if wrong: legacy conversion command is unavailable on the new branch.

Task 2: Ruling: tsx CLI requires a sandbox-blocked IPC socket — use Node --import tsx for identical TypeScript loader/tests and migration CLIs — cost if wrong: runner command differs, tests and app interfaces do not.

Task 2: Ruling: Authored Markdown has trailing spaces/final blank lines — preserve body hashes and exempt only src/content/posts from these Git whitespace checks — cost if wrong: prose whitespace mistakes need body diff review rather than diff --check.

Task 3: Ruling: Native browser surfaces unavailable — install the Task 4 Playwright harness during Task 3 to run actual mobile/light/dark verification — cost if wrong: dependency setup moves one task earlier only.

Task 3: Ruling: Astro reused rendered content after plugin edits — add astro sync --force before builds and use Node --import tsx for build scripts — cost if wrong: each build re-renders Markdown; reliable output costs a modest build-time increase.

Task 6: Ruling: A preserved display equation has bare alignment separators rejected by KaTeX — wrap only this class of malformed display math in aligned during rendering, outside the Typora text transform; source bytes remain unchanged — cost if wrong: unusual bare ampersand display math renders as alignment rather than an error.

Task 6: Ruling: Eight paper-code references point to an absent local checkout — map only the verified paths to the authors' official repository at commit 4fc007b, without rewriting source paragraphs — cost if wrong: links show the verified upstream revision instead of a personal local checkout.

Task 7: Ruling: The planned Japanese query ピッチ is absent from the source corpus — test absence explicitly and use the authored が heading for positive Japanese recall, without inventing searchable prose — cost if wrong: that spelling remains undiscoverable until the author adds it; mixed-script partial headings such as お段 also fail under both tested zh and ja segmentation.

Task 9: Ruling: pnpm treats the temporary dependency symlink as an out-of-sync project and tries to reinstall it — benchmark content-only copies reuse the already locked source dependencies with verify-deps-before-run=warn; the source still requires frozen install — cost if wrong: stale source dependencies could invalidate benchmark results.

Task 9: Ruling: The 500-note fixtures repeat 44 source bodies/titles, so some original IDs fall below the first five behind equivalent clones — retain native Pagefind ranking, validate all 20 queries and report these ambiguous ranks rather than add fixture-specific ranking — cost if wrong: similarly named notes may require narrower course/topic filters to find the intended source.

Final: Ruling: Reviewer set aside platform HTTP301/308 and production-origin staging — preview delivery stands because domain/host are unspecified and spec explicitly defers cutover — cost if wrong: existing URLs could fail on the chosen host until its rules are verified.

Final: Ruling: Reviewer set aside final personal media cost/suitability — prototype media stays clearly identified; remeasure supplied final assets before cutover — cost if wrong: actual media could be heavier or unsuitable.

Final: Ruling: Reviewer set aside current hosted-release recovery — local 712-file recovery is verified, hosted release must be recorded before cutover — cost if wrong: rebuilt local source may differ from the current hosted release.

Final: Ruling: Reviewer set aside disabled upstream optional features — leave disabled features outside enabled migration scope — cost if wrong: re-enabling them requires additional integration checks.

Final: Ruling: Finishing skill's integration menu repeats the already chosen branch isolation — keep branch/worktree as approved spec requests, no merge or push — cost if wrong: integration remains for a later authorized step.

## Deferred minor

Search results omit course/type context; use the existing filters to distinguish repeated lecture titles until display metadata is added.
