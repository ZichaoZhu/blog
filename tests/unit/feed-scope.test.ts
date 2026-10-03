import {test} from 'node:test';import assert from 'node:assert/strict';import {getFeedNotes,type NoteRecord} from '../../src/utils/note-model';
test('feeds contain only dated public nonempty articles',()=>{
 const fixture=(id:string,extra:Partial<NoteRecord['data']>={},hasBody=true):NoteRecord=>({entryId:id,hasBody,data:{id,slug:id,title:id,description:'',type:'note',topics:[],contentKind:'note',visibility:'published',author:'ZZC',date:'2026-01-02',...extra}});
 const input=[fixture('real'),fixture('unknown',{date:undefined}),fixture('demo',{visibility:'unlisted'}),fixture('draft',{visibility:'draft'}),fixture('collection',{contentKind:'collection'}),fixture('empty',{},false)];
 assert.deepEqual(getFeedNotes(input).map(n=>n.data.slug),['real']);assert.equal(new Date(getFeedNotes(input)[0].data.date+'T00:00:00Z').toISOString(),'2026-01-02T00:00:00.000Z');
});
