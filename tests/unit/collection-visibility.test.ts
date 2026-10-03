import {test} from 'node:test';import assert from 'node:assert/strict';import {noteDataSchema} from '../../src/content/schema';import * as model from '../../src/utils/note-model';
test('public collection introductions obey the same explicit visibility boundary',()=>{
 for(const visibility of ['published','unlisted','draft'] as const){const note={entryId:'intro',hasBody:true,data:noteDataSchema.parse({id:'intro',slug:'intro',title:'Intro',contentKind:'collection',visibility})};assert.equal(model.isPublicCollection(note),visibility==='published');assert.equal(model.isPublicNote(note),false);assert.equal(model.isPublicCollection({...note,hasBody:false}),false);}
});
