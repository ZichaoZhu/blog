import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {join} from 'node:path';import {readCurrentManifest} from '../../scripts/verify-site';import {isPublicNote} from '../../src/utils/note-model';
const root=process.env.FIREFLY_AUTHORING_ROOT;if(!root)throw Error('FIREFLY_AUTHORING_ROOT must name the isolated authoring fixture');
test('real authoring build hides private introductions and renders a project body image',async()=>{
 const courses=await readFile(join(root,'dist/courses/index.html'),'utf8'),course=await readFile(join(root,'dist/courses/compiler-principles/index.html'),'utf8'),papers=await readFile(join(root,'dist/papers/index.html'),'utf8');assert.ok(!courses.includes('HiddenDraftIntroSentinel'));assert.ok(!course.includes('HiddenCourseIntroSentinel'));assert.ok(papers.includes('VisibleIntroSentinel'));
 const project=await readFile(join(root,'dist/projects/review-project/index.html'),'utf8');assert.ok(project.includes('ProjectScopeSentinel'));assert.match(project,/data-source-asset="images\/firefly.avif"/);
});
test('projects remain outside the public-note Pagefind index',async()=>{
 const manifest=await readCurrentManifest(join(root,'src/content/posts'));const count=manifest.records.filter(r=>isPublicNote({entryId:r.sourcePath,data:r,hasBody:r.hasBody})).length;
 const index=JSON.parse(await readFile(join(root,'dist/pagefind/pagefind-entry.json'),'utf8'));assert.equal(index.languages.zh.page_count,count,'a project must not pollute the public-note index');
});
test('published project detail URLs appear in sitemap',async()=>{
 const sitemap=await readFile(join(root,'dist/sitemap.xml'),'utf8');assert.ok(sitemap.includes('/projects/review-project/</loc>'),'published project must enter sitemap');
});
