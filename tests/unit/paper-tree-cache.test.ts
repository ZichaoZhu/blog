import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {getPublishedTree} from '../../src/features/paper-trees/public-build';
import {createPaperTree} from '../../src/features/paper-trees/template';
import {toPublicSnapshot} from '../../src/features/paper-trees/model';
import {makeNote} from '../fixtures/notes';
test('500 paper lookups share immutable snapshots while release and current visibility changes invalidate publication',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paper-tree-cache-'));const previous={PAPER_TREE_INPUT_DIR:process.env.PAPER_TREE_INPUT_DIR,PAPER_TREES_ENABLED:process.env.PAPER_TREES_ENABLED};
 try {
  process.env.PAPER_TREE_INPUT_DIR=dir;process.env.PAPER_TREES_ENABLED='true';await mkdir(join(dir,'snapshots'));
  const snapshots=Array.from({length:500},(_,i)=>toPublicSnapshot(createPaperTree(`paper-${i}`,'empty'),randomUUID(),'2026-10-08T00:00:00.000Z'));
  const notes=snapshots.map(s=>makeNote({id:s.paperId,type:'paper'}));const manifest={schemaVersion:1,releaseId:randomUUID(),parentReleaseId:null,codeSha:'c'.repeat(40),createdAt:snapshots[0].publishedAt,entries:Object.fromEntries(snapshots.map(s=>[s.paperId,s.snapshotId]))};
  await writeFile(join(dir,'release.json'),JSON.stringify(manifest));await Promise.all(snapshots.map(s=>writeFile(join(dir,'snapshots',`${s.snapshotId}.json`),JSON.stringify(s))));
  const started=performance.now();const values=[];for(const note of notes)values.push(await getPublishedTree(note.data.id,notes));
  assert.equal(values.length,500);assert.equal(values[0],await getPublishedTree('paper-0',notes));
  assert.equal(await getPublishedTree('paper-0',notes.map((n,i)=>i===0?{...n,data:{...n.data,visibility:'unlisted' as const}}:n)),undefined);
  manifest.entries={};await writeFile(join(dir,'release.json'),JSON.stringify({...manifest,releaseId:randomUUID()}));assert.equal(await getPublishedTree('paper-0',notes),undefined);
  console.info(`500 paper lookup elapsed: ${Math.round(performance.now()-started)}ms`);
 }finally {for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}await rm(dir,{recursive:true,force:true});}
});
