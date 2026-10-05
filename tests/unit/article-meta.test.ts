import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getArticleMetadata} from '../../src/utils/article-meta';
import {makeNote} from '../fixtures/notes';

test('article metadata keeps dates, lecture zero and encoded links in the prescribed groups',()=>{
 const data=makeNote({author:'Goongmly',type:'course',date:'2026-01-01',updatedAt:'2026-02-02',course:{id:'operating-systems',order:0},topics:['operating-systems'],tags:['C++']}).data;
 const rows=getArticleMetadata(data,{words:1200,minutes:4});
 assert.deepEqual(rows.map(row=>row.map(field=>field.key)),[['author','date','updatedAt','type'],['course','topics','tags'],['words','minutes']]);
 const fields=Object.fromEntries(rows.flat().map(field=>[field.key,field.values]));
 assert.deepEqual(fields.date,[{text:'2026-01-01',date:'2026-01-01'}]);
 assert.deepEqual(fields.updatedAt,[{text:'2026-02-02',date:'2026-02-02'}]);
 assert.deepEqual(fields.course,[{text:'操作系统',url:'/courses/operating-systems/'},{text:'第 0 讲'}]);
 assert.deepEqual(fields.topics,[{text:'操作系统',url:'/topics/operating-systems/'}]);
 assert.deepEqual(fields.tags,[{text:'C++',url:'/archive/?tag=C%2B%2B'}]);
 assert.deepEqual(fields.words,[{text:'1,200 字'}]);
 assert.deepEqual(fields.minutes,[{text:'4 分钟阅读'}]);
});

test('missing optional fields remain absent and an unknown publication date is explicit',()=>{
 const data=makeNote({type:'idea',topics:[],tags:[]}).data;
 const rows=getArticleMetadata(data,{});
 assert.deepEqual(rows.map(row=>row.map(field=>field.key)),[['author','date','type']]);
 assert.deepEqual(rows[0][1].values,[{text:'日期未记录'}]);
 assert.deepEqual(getArticleMetadata(data,{words:0,minutes:0}).at(-1)?.map(field=>field.values),[[{text:'0 字'}],[{text:'0 分钟阅读'}]]);
});
