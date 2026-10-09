import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertPublicArtifacts} from '../../scripts/paper-trees/verify-output';
test('artifact privacy gate detects leaked bytes and private filenames in actual output and passes after removal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tree-artifact-gate-'));
 try {
  await mkdir(join(root,'_astro'));await writeFile(join(root,'index.html'),'<p>Public text</p>');await assertPublicArtifacts(root,['PrivateDraftSentinel']);
  for(const file of ['index.html','release.json','_astro/client.js','rss.xml','sitemap.xml','index.pf_fragment','image.bin']) {
   const path=join(root,file);await writeFile(path,'PrivateDraftSentinel');await assert.rejects(assertPublicArtifacts(root,['PrivateDraftSentinel']));await rm(path);
  }
  await mkdir(join(root,'drafts'));await writeFile(join(root,'drafts','private.json'),'{}');await assert.rejects(assertPublicArtifacts(root,[]));await rm(join(root,'drafts'),{recursive:true});
  await assertPublicArtifacts(root,['PrivateDraftSentinel']);
 }finally {await rm(root,{recursive:true,force:true});}
});
if(process.env.PAPER_TREE_OUTPUT_DIR)test('real isolated site and Studio client artifacts pass privacy gate',async()=>{
 await assertPublicArtifacts(process.env.PAPER_TREE_OUTPUT_DIR!,['PrivateTreeDraftSentinel','UnlistedTreeSentinel','FailedTreeSentinel','NonPaperTreeSentinel','PrivateStudioCatalogSentinel']);
 if(process.env.PAPER_TREE_STUDIO_STATIC_DIR)await assertPublicArtifacts(process.env.PAPER_TREE_STUDIO_STATIC_DIR,['PrivateStudioCatalogSentinel']);
});
