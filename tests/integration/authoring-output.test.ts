import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {join} from 'node:path';import {readCurrentManifest} from '../../scripts/verify-site';import {isPublicNote} from '../../src/utils/note-model';
const root=process.env.FIREFLY_AUTHORING_ROOT;if(!root)throw Error('FIREFLY_AUTHORING_ROOT must name the isolated authoring fixture');
test('real authoring build hides private introductions and renders a project body image',async()=>{
 const courses=await readFile(join(root,'dist/courses/index.html'),'utf8'),course=await readFile(join(root,'dist/courses/compiler-principles/index.html'),'utf8'),papers=await readFile(join(root,'dist/papers/index.html'),'utf8');assert.ok(!courses.includes('HiddenDraftIntroSentinel'));assert.ok(!course.includes('HiddenCourseIntroSentinel'));assert.ok(papers.includes('VisibleIntroSentinel'));
 const project=await readFile(join(root,'dist/projects/review-project/index.html'),'utf8');assert.ok(project.includes('ProjectScopeSentinel'));assert.match(project,/data-source-asset="images\/firefly.avif"/);
});
test('public project body shares the public-content index while private and empty projects stay absent',async()=>{
 const manifest=await readCurrentManifest(join(root,'src/content/posts'));const count=manifest.records.filter(r=>isPublicNote({entryId:r.sourcePath,data:r,hasBody:r.hasBody})).length;
 const index=JSON.parse(await readFile(join(root,'dist/pagefind/pagefind-entry.json'),'utf8'));assert.equal(index.languages.zh.page_count,count+1,'unique public nonempty project must join the public-content index');
 const project=await readFile(join(root,'dist/projects/review-project/index.html'),'utf8');assert.match(project,/data-pagefind-body/);assert.match(project,/data-pagefind-filter="type:project"/);assert.match(project,/data-pagefind-filter="topic:robotics"/);assert.equal((project.match(/<h1\b/g)||[]).length,1);
 for(const path of ['projects/index.html','projects/topics/robotics/index.html','topics/robotics/index.html']){const html=await readFile(join(root,'dist',path),'utf8');assert.ok(html.includes(path==='projects/index.html'?'/projects/topics/robotics/':'/projects/review-project/'));assert.ok(!html.includes('PrivateProjectSentinel'));assert.ok(!html.includes('EmptyProjectSentinel'));}
 const home=await readFile(join(root,'dist/index.html'),'utf8');assert.match(home,new RegExp('data-stat-id="articles"[^>]*>'+(count+1)+'</span>'));assert.ok(home.includes('2026-10-05'));
});
test('published project detail URLs appear in sitemap',async()=>{
 const sitemap=await readFile(join(root,'dist/sitemap.xml'),'utf8');assert.ok(sitemap.includes('/projects/review-project/</loc>'),'published project must enter sitemap');
 assert.match(sitemap,/\/projects\/review-project\/<\/loc><lastmod>2026-10-05<\/lastmod>/);assert.ok(!sitemap.includes('/projects/private-project/'));assert.ok(!sitemap.includes('/projects/empty-project/'));
 const page=await readFile(join(root,'dist/notes/page/2/index.html'),'utf8');assert.match(page,/<link rel="canonical" href="[^"]*\/notes\/page\/2\/"/);assert.ok(sitemap.includes('/notes/page/2/</loc>'));assert.ok(sitemap.includes('/papers/topics/robotics/</loc>'));
});
