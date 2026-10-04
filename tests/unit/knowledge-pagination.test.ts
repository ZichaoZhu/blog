import assert from 'node:assert/strict';
import {test} from 'node:test';
import {courses,topics} from '../../src/data/catalog';
import {buildKnowledgeIndex,buildCollectionRoutes,collectionPageUrl,getCollectionPage,type CollectionGroup} from '../../src/utils/knowledge-model';
import {makePost} from '../fixtures/knowledge';
test('static collection pages contain at most 25 members and reject invalid pages',()=>{
 for(const count of [0,25,26,50,51]){
  const index=buildKnowledgeIndex({posts:Array.from({length:count},(_,i)=>makePost(`lecture-${i}`,{type:'course',course:{id:'operating-systems',order:i}})),projects:[]},{courses,topics});
  const group:CollectionGroup=index.lists['/courses/operating-systems/'];const total=Math.max(1,Math.ceil(count/25));
  for(let page=1;page<=total;page++){const slice=getCollectionPage(group,page);assert.equal(slice.items.length,Math.min(25,Math.max(0,count-(page-1)*25)));assert.equal(slice.totalPages,total);assert.equal(slice.url,page===1?group.url:group.url+`page/${page}/`);}
  for(const page of [0,-1,NaN,1.5,total+1])assert.throws(()=>getCollectionPage(group,page),RangeError);
  assert.equal(collectionPageUrl(group.url,1),group.url);
 }
});
test('generated collection URLs contain only real pages and namespace topics by hub',()=>{
 const index=buildKnowledgeIndex({posts:[makePost('paper',{type:'paper',topics:['robotics','3d-vision']}),...Array.from({length:26},(_,i)=>makePost(`lecture-${i}`,{type:'course',course:{id:'operating-systems',order:i}}))],projects:[]},{courses,topics});
 const routes=buildCollectionRoutes(index);const urls=routes.map(r=>r.url);
 assert.equal(new Set(urls).size,urls.length);assert.ok(urls.includes('/courses/operating-systems/page/2/'));assert.ok(!urls.includes('/courses/operating-systems/page/3/'));
 assert.ok(urls.includes('/papers/topics/robotics/'));assert.ok(!urls.includes('/research/topics/robotics/'));assert.ok(urls.includes('/research/ideas/'));
 assert.ok(!urls.some(p=>p.includes('page/1/')));assert.ok(routes.every(p=>p.items.length<=25));
});
