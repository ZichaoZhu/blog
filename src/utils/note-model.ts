export type NoteType = 'course'|'paper'|'log'|'idea'|'experiment'|'note';
export type Visibility = 'published'|'unlisted'|'draft';
export interface CourseDefinition {id:string;title:string;description:string;sourcePrefix:string;topic:string;introPath?:string}
export interface TopicDefinition {id:string;name:string;description:string}
export interface NoteData {
 id:string;slug:string;title:string;description:string;contentKind:'note'|'collection';type:NoteType;topics:string[];visibility:Visibility;author:string;
 date?:string;updatedAt?:string;course?:{id:string;order?:number};
 paper?:{title?:string;authors?:string[];year?:number;venue?:string;paperUrl?:string;arxivUrl?:string;doiUrl?:string;codeUrl?:string};
 tags?:string[];category?:string|null;image?:string;
}
export interface NoteRecord {entryId:string;data:NoteData;hasBody:boolean}
export interface NoteSummary {id:string;slug:string;url:string;title:string;description:string;type:NoteType;topics:string[];date?:string;updatedAt?:string;course?:NoteData['course']}
export interface Catalog {courses:CourseDefinition[];topics:TopicDefinition[]}
export function isPublicNote(note:NoteRecord):boolean {return note.hasBody&&note.data.contentKind==='note'&&note.data.visibility==='published';}
export function getPublicNotes(notes:readonly NoteRecord[]):NoteRecord[] {return notes.filter(isPublicNote);}
export function getRoutableNotes(notes:readonly NoteRecord[]):NoteRecord[] {return notes.filter(n=>n.hasBody&&n.data.contentKind==='note'&&n.data.visibility!=='draft');}
export function compareNoteDates(a:NoteRecord,b:NoteRecord):number {return (b.data.date??'').localeCompare(a.data.date??'')||a.data.slug.localeCompare(b.data.slug);}
export function toSummary(note:NoteRecord):NoteSummary {
 const {id,slug,title,description,type,topics,date,updatedAt,course}=note.data;
 return {id,slug,url:`/notes/${slug}/`,title,description,type,topics,date,updatedAt,course};
}
export function assertCatalog(notes:readonly NoteRecord[],catalog:Catalog):void {
 const ids=new Set<string>(),slugs=new Set<string>(),orders=new Set<string>();
 for(const note of notes) {
  const d=note.data,where=note.entryId;
  if(ids.has(d.id)||slugs.has(d.slug))throw new Error(`duplicate id/slug: ${where}`);ids.add(d.id);slugs.add(d.slug);
  for(const id of d.topics)if(!catalog.topics.some(t=>t.id===id))throw new Error(`unknown topic ${id}: ${where}`);
  if(d.course){
   if(!catalog.courses.some(c=>c.id===d.course?.id))throw new Error(`unknown course ${d.course.id}: ${where}`);
   if(d.course.order!==undefined){const key=`${d.course.id}:${d.course.order}`;if(!Number.isInteger(d.course.order)||d.course.order<0||orders.has(key))throw new Error(`invalid/duplicate course order ${key}: ${where}`);orders.add(key);}
  }
 }
}
