import assert from 'node:assert/strict';
import {test} from 'node:test';
import {makeNote} from '../fixtures/notes';
import {noteDataSchema} from '../../src/content/schema';
import {getPublicNotes,getRoutableNotes,toSummary,compareNoteDates,assertCatalog} from '../../src/utils/note-model';
import {formatDateToYYYYMMDD,formatDateI18n} from '../../src/utils/date-utils';
import {courses,topics} from '../../src/data/catalog';
test('unknown dates remain unknown while impossible days are rejected',()=>{
 const data=noteDataSchema.parse(makeNote().data);
 assert.equal(data.date,undefined);assert.equal(data.published,undefined);
 assert.throws(()=>noteDataSchema.parse({...data,date:'2026-02-30'}));
 assert.equal(noteDataSchema.parse({...data,date:'2024-02-29'}).date,'2024-02-29');
});
test('paper analysis links preserve web URLs, allow empty placeholders and reject unsafe schemes',()=>{
 const parse=(analysisUrl:unknown)=>noteDataSchema.parse({...makeNote({type:'paper'}).data,paper:{analysisUrl}}).paper?.analysisUrl;
 for(const url of ['https://alidocs.dingtalk.com/i/nodes/example','https://xmind.ai/example','http://example.com/tree']) assert.equal(parse(url),url);
 for(const empty of [undefined,null,'']) assert.equal(parse(empty),undefined);
 for(const invalid of ['javascript:alert(1)','data:text/html,test','file:///tmp/tree.html','/relative-tree','not a URL']) assert.throws(()=>parse(invalid));
});
test('calendar dates never cross days and unknown dates sort last',()=>{
 const known=makeNote({id:'dated',slug:'dated',date:'2026-10-03'}), unknown=makeNote({id:'unknown',slug:'unknown'});
 assert.equal(formatDateToYYYYMMDD(noteDataSchema.parse(known.data).published),'2026-10-03');
 assert.equal(formatDateI18n('2026-10-03'),'2026年10月3日');
 assert.equal(formatDateToYYYYMMDD(undefined),'');assert.equal(formatDateI18n(undefined),'');
 assert.deepEqual([unknown,known].sort(compareNoteDates).map(n=>n.data.slug),['dated','unknown']);
});
test('public scope excludes direct-only notes, drafts, introductions and empty bodies',()=>{
 const all=[makeNote({id:'a',slug:'a'}),makeNote({id:'b',slug:'b',visibility:'unlisted'}),makeNote({id:'c',slug:'c',visibility:'draft'}),makeNote({id:'d',slug:'d',contentKind:'collection'}),makeNote({id:'e',slug:'e'},false)];
 assert.deepEqual(getPublicNotes(all).map(n=>n.data.slug),['a']);
 assert.deepEqual(getRoutableNotes(all).map(n=>n.data.slug),['a','b']);
 assert.equal('body' in toSummary(all[0]),false);assert.equal(toSummary(all[0]).url,'/notes/a/');
});
test('catalog errors identify unknown references and duplicate identity',()=>{
 const catalog={courses,topics};
 assert.throws(()=>assertCatalog([makeNote({topics:['missing']})],catalog),/missing/);
 assert.throws(()=>assertCatalog([makeNote(),makeNote()],catalog),/duplicate/i);
 assert.throws(()=>assertCatalog([makeNote({course:{id:'unknown',order:0}})],catalog),/unknown/);
});
