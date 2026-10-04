import { projectDataSchema, type ProjectData } from '../../src/content/schema';
import type { PostInput, ProjectInput } from '../../src/utils/knowledge-model';
import type { NoteData } from '../../src/utils/note-model';
import { makeNote } from './notes';

export function makePost(id: string, data: Partial<NoteData> = {}, hasBody = true, words = 4): PostInput {
 return {...makeNote({id, slug:id, ...data}, hasBody), pinned:false, words};
}
export function makeProject(id: string, data: Partial<ProjectData> = {}, hasBody = true, words = 4): ProjectInput {
 return {entryId:id,url:`/projects/${id}/`,hasBody,words,data:projectDataSchema.parse({title:id,...data})};
}
