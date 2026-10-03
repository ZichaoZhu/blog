import {getSortedPosts,asNoteRecord} from "../../utils/content-utils";
import {toSummary} from "../../utils/note-model";
export async function GET():Promise<Response>{return Response.json((await getSortedPosts()).map(asNoteRecord).map(toSummary));}
