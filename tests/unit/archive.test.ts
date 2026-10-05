import assert from 'node:assert/strict';
import {test} from 'node:test';
import {courses,topics} from '../../src/data/catalog';
import {buildKnowledgeIndex,buildCollectionRoutes,getCollectionPage,getSidebarContext} from '../../src/utils/knowledge-model';
import {resolveLegacyMap} from '../../src/utils/legacy';
import {makePost,makeProject} from '../fixtures/knowledge';

test('archive orders public articles by publication date, ignoring pins and updates',()=>{
 const posts=[makePost('old',{date:'2025-12-31',updatedAt:'2026-10-05'}),makePost('new',{date:'2026-04-01'}),makePost('b',{date:'2026-01-02'}),makePost('a',{date:'2026-01-02'}),makePost('undated'),makePost('draft',{visibility:'draft'}),makePost('hidden',{visibility:'unlisted'}),makePost('intro',{contentKind:'collection'}),makePost('empty',{},false)];
 posts[0].pinned=true;
 const index=buildKnowledgeIndex({posts,projects:[makeProject('dated',{published:new Date('2026-01-01T23:30:00-08:00'),order:100}),makeProject('undated'),makeProject('draft',{draft:true})]},{courses,topics});
 const all=index.lists['/archive/'];
 assert.ok(all,'archive must be a discoverable public collection');
 assert.deepEqual(all.items.map(i=>i.url),['/notes/new/','/notes/a/','/notes/b/','/projects/dated/','/notes/old/','/notes/undated/','/projects/undated/']);
 assert.deepEqual(index.lists['/archive/2026/'].items.map(i=>i.url),['/notes/new/','/notes/a/','/notes/b/','/projects/dated/']);
 assert.equal(index.lists['/archive/2025/'].items.length,1);
 assert.deepEqual(index.lists['/archive/undated/'].items.map(i=>i.url),['/notes/undated/','/projects/undated/']);
 const context=getSidebarContext(index,'/archive/2026/page/2/');
 assert.equal(context.title,'年份');
 assert.deepEqual(context.items.map(i=>[i.title,i.count,i.state]),[['全部文章',7,'none'],['2026',4,'current'],['2025',1,'none'],['日期未记录',2,'none']]);
});

test('501 articles produce bounded static pages in both all-years and year views',()=>{
 const index=buildKnowledgeIndex({posts:Array.from({length:501},(_,i)=>makePost(`post-${i}`,{date:'2026-01-01'})),projects:[]},{courses,topics});
 const routes=buildCollectionRoutes(index).filter(r=>r.url.startsWith('/archive/'));
 assert.equal(routes.length,42);
 assert.equal(routes.filter(r=>r.group.url==='/archive/').flatMap(r=>r.items).length,501);
 assert.ok(routes.every(r=>r.items.length<=25));
 assert.equal(routes.find(r=>r.url==='/archive/2026/page/21/')?.items.length,1);
 assert.ok(!routes.some(r=>r.url.includes('/page/1/')||r.url.includes('/page/22/')||r.url.includes('/undated/')));
 assert.throws(()=>getCollectionPage(index.lists['/archive/'],22),RangeError);
 const empty=buildKnowledgeIndex({posts:[],projects:[]},{courses,topics});
 assert.deepEqual(buildCollectionRoutes(empty).filter(r=>r.url.startsWith('/archive/')).map(r=>r.url),['/archive/']);
});

test('archive stays on its entry while legacy filters retain their destinations',()=>{
 const map={paths:{},images:{}};
 for(const query of ['', 'utm_source=bookmark'])assert.equal(resolveLegacyMap('/archive/',new URLSearchParams(query),map),null);
 for(const [query,want] of [['page=2','/archive/page/2/'],['category=编译原理','/courses/compiler-principles/'],['tag=机器人','/topics/robotics/'],['category=论文阅读','/papers/'],['tag=unknown','/search/?q=unknown']])assert.equal(resolveLegacyMap('/archive/',new URLSearchParams(query),map),want);
});
