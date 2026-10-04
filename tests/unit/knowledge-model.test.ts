import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courses, topics } from '../../src/data/catalog';
import { buildKnowledgeIndex, isPublicProject } from '../../src/utils/knowledge-model';
import { readCurrentManifest } from '../../scripts/verify-site';
import { makePost, makeProject } from '../fixtures/knowledge';
const catalog = {courses,topics};

test('multiple topics share one canonical while article and project names cannot collide',()=>{
 const i=buildKnowledgeIndex({posts:[makePost('same',{type:'paper',topics:['robotics','3d-vision','robotics'],tags:[' robot ','robot','']})],projects:[makeProject('same',{topics:['robotics'],tags:['robot']})]},catalog);
 assert.deepEqual(i.stats,{articleCount:2,categoryCount:2,tagCount:1,totalWords:8,lastActivityISO:null});
 assert.equal(i.lists['/papers/topics/robotics/'].items.length,1);
 assert.equal(i.lists['/papers/topics/3d-vision/'].items.length,1);
 assert.equal(new Set(i.publicItems.map(n=>n.key)).size,2);
 assert.equal(i.hubs.courses.groups.length,courses.length);
});
test('one shared public scope excludes private introductions and empty bodies',()=>{
 const i=buildKnowledgeIndex({posts:[makePost('p',{type:'paper'}),makePost('draft',{visibility:'draft'}),makePost('unlisted',{visibility:'unlisted'}),makePost('intro',{contentKind:'collection'}),makePost('empty',{},false)],projects:[makeProject('p'),makeProject('draft',{draft:true}),makeProject('empty',{},false)]},catalog);
 assert.equal(i.stats.articleCount,2);assert.equal(i.stats.totalWords,8);
 assert.equal(i.lists['/notes/'].items.length,1);assert.equal(i.hubs.projects.items.length,1);
 assert.equal(isPublicProject(makeProject('draft',{draft:true})),false);
 assert.equal(JSON.stringify(i).includes('"body"'),false);
});
test('invalid references name their source and public course documents require a course',()=>{
 assert.throws(()=>buildKnowledgeIndex({posts:[makePost('bad-course',{type:'course',course:undefined})],projects:[]},catalog),/bad-course/);
 assert.throws(()=>buildKnowledgeIndex({posts:[makePost('bad-topic',{topics:['missing']})],projects:[]},catalog),/bad-topic/);
 assert.throws(()=>buildKnowledgeIndex({posts:[],projects:[makeProject('bad-project',{topics:['missing']})]},catalog),/bad-project/);
 assert.throws(()=>buildKnowledgeIndex({posts:[],projects:[]},{courses,topics:[...topics,{id:'uncategorized',name:'Bad',description:''}]}),/uncategorized/);
});
test('uncategorized public content stays discoverable without becoming an invented category',()=>{
 const i=buildKnowledgeIndex({posts:[makePost('paper',{type:'paper',topics:[]}),makePost('note',{type:'note',topics:[]})],projects:[makeProject('project')]},catalog);
 assert.equal(i.lists['/papers/topics/uncategorized/'].items.length,1);
 assert.equal(i.lists['/projects/topics/uncategorized/'].items.length,1);
 assert.equal(i.stats.categoryCount,0);assert.equal(i.lists['/notes/'].items.length,2);
 assert.equal(i.hubs.papers.items.length,1);assert.equal(i.hubs.research.items.length,0);
 assert.equal(i.lists['/research/ideas/'].items.length,0);
});
test('catalog order and course lecture order stay stable while publications sort by pinned and known date',()=>{
 const posts=[makePost('later',{type:'course',course:{id:'operating-systems',order:2},date:'2020-01-01'}),makePost('first',{type:'course',course:{id:'operating-systems',order:0},date:'2026-01-01'}),makePost('not-lecture',{type:'paper',course:{id:'operating-systems',order:99},topics:['robotics']}),makePost('unknown',{type:'paper',topics:['robotics']}),makePost('new',{type:'paper',topics:['robotics'],date:'2026-02-01'}),{...makePost('pin',{type:'paper',topics:['robotics'],date:'2020-01-01'}),pinned:true}];
 const i=buildKnowledgeIndex({posts,projects:[makeProject('none'),makeProject('zero',{order:0}),makeProject('one',{order:1})]},catalog);
 assert.deepEqual(i.lists['/courses/operating-systems/'].items.map(n=>n.kind==='post'&&n.post.data.id),['first','later']);
 assert.deepEqual(i.hubs.courses.groups.map(n=>n.id),courses.map(n=>n.id));
 assert.deepEqual(i.hubs.papers.items.map(n=>n.kind==='post'&&n.post.data.id),['pin','new','not-lecture','unknown']);
 assert.deepEqual(i.hubs.projects.items.map(n=>n.kind==='project'&&n.project.entryId),['one','zero','none']);
});
test('activity uses actual publication and updates including projects and preserves future dates',()=>{
 const i=buildKnowledgeIndex({posts:[makePost('old',{date:'2020-01-01',updatedAt:'2026-10-03'})],projects:[makeProject('project',{published:new Date('2025-01-01'),updated:new Date('2026-10-05')})]},catalog);
 assert.equal(i.stats.lastActivityISO,'2026-10-05T00:00:00.000Z');
});
test('actual content preserves the 44 public records and controlled topics and tags',async()=>{
 const m=await readCurrentManifest('src/content/posts');
 const posts=m.records.map(r=>({entryId:r.sourcePath,data:r,hasBody:r.hasBody,pinned:false,words:0}));
 const i=buildKnowledgeIndex({posts,projects:[]},catalog);
 assert.equal(i.stats.articleCount,44);assert.equal(i.stats.categoryCount,9);assert.equal(i.stats.tagCount,21);
 assert.deepEqual(Object.values(i.hubs).map(h=>h.items.length),[31,12,1,0]);
});
