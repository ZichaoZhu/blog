import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getStatDates} from '../../src/utils/site-stats';
import {remarkReadingTime} from '../../src/plugins/remark-reading-time.mjs';
import {buildKnowledgeIndex} from '../../src/utils/knowledge-model';
import {courses,topics} from '../../src/data/catalog';
import {makePost,makeProject} from '../fixtures/knowledge';
test('Shanghai midnight and founding day use calendar days independent of local timezone',()=>{
 assert.equal(getStatDates('2025-01-01',null,new Date('2026-10-03T16:00:00Z')).runningDays,641);
 assert.equal(getStatDates('2025-01-01',null,new Date('2026-10-03T15:59:59Z')).runningDays,640);
 for(const now of ['2025-01-01T00:00:00Z','2024-12-31T00:00:00Z'])assert.equal(getStatDates('2025-01-01',null,new Date(now)).runningDays,0);
});
test('activity preserves actual future and same-day dates and rejects invalid inputs',()=>{
 const now=new Date('2026-10-04T00:00:00Z');
 assert.deepEqual(getStatDates('2025-01-01','2026-10-05T00:00:00Z',now),{runningDays:641,lastActivityDay:'2026-10-05',state:'future',daysSinceActivity:-1});
 assert.equal(getStatDates('2025-01-01','2026-10-03T16:00:00Z',now).state,'today');
 assert.equal(getStatDates('2025-01-01','2026-10-03T15:59:59Z',now).daysSinceActivity,1);
 for(const last of [null,'broken'])assert.equal(getStatDates('2025-01-01',last,now).state,'missing');
 for(const start of ['broken','2025-02-30'])assert.throws(()=>getStatDates(start,null,now),RangeError);
 assert.throws(()=>getStatDates('2025-01-01',null,new Date('broken')),RangeError);
});
test('old article edits and project edits are real activity, and reading-time counts English words',()=>{
 const index=buildKnowledgeIndex({posts:[makePost('old',{date:'2020-01-01',updatedAt:'2026-10-03'})],projects:[makeProject('project',{published:new Date('2020-01-01'),updated:new Date('2026-10-04')})]},{courses,topics});
 assert.equal(index.stats.lastActivityISO,'2026-10-04T00:00:00.000Z');
 const file={data:{astro:{frontmatter:{words:0}}}};
 remarkReadingTime()({type:'root',children:[{type:'text',value:'中文 hello world'}]},file);
 assert.equal(file.data.astro.frontmatter.words,4);
});
