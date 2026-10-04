import assert from 'node:assert/strict';
import {test} from 'node:test';
import {courses,topics} from '../../src/data/catalog';
import {buildKnowledgeIndex,getSidebarContext} from '../../src/utils/knowledge-model';
import {isArticleDetailPage} from '../../src/utils/url-utils';
import {makePost} from '../fixtures/knowledge';
const index=buildKnowledgeIndex({posts:[makePost('second',{type:'course',course:{id:'operating-systems',order:2}}),makePost('first',{type:'course',course:{id:'operating-systems',order:1}}),makePost('paper',{type:'paper',topics:['robotics','3d-vision']}),makePost('private',{type:'course',course:{id:'operating-systems',order:3},visibility:'unlisted'})],projects:[]},{courses,topics});
test('course collection pagination selects the same course and public lectures stay ordered',()=>{
 for(const path of ['/courses/operating-systems/','/courses/operating-systems/page/2/'])assert.equal(getSidebarContext(index,path).items.find(n=>n.state==='current')?.id,'operating-systems');
 const c=getSidebarContext(index,'/notes/second/');assert.deepEqual(c.course?.notes.map(n=>n.slug),['first','second']);assert.equal(c.course?.currentSlug,'second');
 const u=getSidebarContext(index,'/notes/private/',{url:'/notes/private/',type:'course',topics:[],course:{id:'operating-systems',order:3}});
 assert.equal(u.hub,'courses');assert.equal(JSON.stringify(u).includes('private'),true);assert.equal(u.course?.notes.some(n=>n.slug==='private'),false);
});
test('multi-topic article marks related topics, routes belong to their hub and defaults show four hubs',()=>{
 const paper=getSidebarContext(index,'/notes/paper/');assert.equal(paper.hub,'papers');assert.equal(paper.items.filter(n=>n.state==='related').length,2);assert.equal(paper.items.some(n=>n.state==='current'),false);
 assert.equal(getSidebarContext(index,'/research/ideas/').hub,'research');assert.equal(getSidebarContext(index,'/projects/').title,'项目主题');
 for(const path of ['/','/search/','/topics/','/notes/generic/'])assert.deepEqual(getSidebarContext(index,path).items.map(n=>n.id),['courses','papers','research','projects']);
});
test('shared detail predicate excludes collection pagination and project topics',()=>{
 for(const path of ['/notes/page/2/','/projects/topics/robotics/','/projects/topics/robotics/page/2/','/projects/','/courses/a/'])assert.equal(isArticleDetailPage(path),false,path);
 for(const path of ['/notes/a/','/projects/a/','/posts/a/','/post/a/'])assert.equal(isArticleDetailPage(path),true,path);
});
