import assert from 'node:assert/strict';
import {test} from 'node:test';
import {navBarConfig} from '../../src/config/navBarConfig';
import {courses,topics} from '../../src/data/catalog';
import {buildKnowledgeIndex,buildCollectionRoutes} from '../../src/utils/knowledge-model';
import {makePost,makeProject} from '../fixtures/knowledge';
test('main navigation contains only home and four hubs while routes retain compatibility',()=>{
 assert.deepEqual(navBarConfig.links.map(n=>typeof n==='object'&&n.url),['/','/courses/','/papers/','/research/','/projects/']);
 const index=buildKnowledgeIndex({posts:Array.from({length:26},(_,i)=>makePost('paper-'+i,{type:'paper',topics:['robotics']})),projects:[makeProject('public',{topics:['robotics']}),makeProject('private',{draft:true,topics:['3d-vision']})]},{courses,topics});
 const urls=buildCollectionRoutes(index).map(r=>r.url);assert.ok(urls.includes('/papers/topics/robotics/page/2/'));assert.ok(urls.includes('/notes/page/2/'));assert.ok(urls.includes('/projects/topics/robotics/'));assert.ok(!urls.includes('/projects/topics/3d-vision/'));assert.equal(new Set(urls).size,urls.length);
});
