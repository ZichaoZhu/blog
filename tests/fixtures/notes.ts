import type { NoteData, NoteRecord } from '../../src/utils/note-model';
export function makeNote(data:Partial<NoteData>={},hasBody=true):NoteRecord {
 return {entryId:data.id??'test',hasBody,data:{id:'test',slug:'test',title:'Test',description:'A note',contentKind:'note',type:'note',topics:['robotics'],visibility:'published',author:'ZZC',...data}};
}
