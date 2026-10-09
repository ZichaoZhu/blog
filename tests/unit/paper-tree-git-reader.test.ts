import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PinnedGitReader} from '../../scripts/paper-trees/git-reader';
test('pinned Git input reads only allowlisted paths at an immutable commit and batches snapshots without a working checkout',async()=>{
 const root=await mkdtemp(join(tmpdir(),'private-git-fixture-'));let reader:PinnedGitReader|undefined;
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try {
  git(['init','-q']);await mkdir(join(root,'snapshots'));await mkdir(join(root,'drafts'));const id=randomUUID();const path=`snapshots/${id}.json`;
  await writeFile(join(root,path),JSON.stringify({public:'version-one'}));await writeFile(join(root,'control.json'),'{}');await writeFile(join(root,'drafts','a'.repeat(64)+'.json'),'PrivateDraftSentinel');
  git(['add','.']);git(['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','fixture']);const pinned=git(['rev-parse','HEAD']);
  await writeFile(join(root,path),JSON.stringify({public:'version-two'}));git(['add','.']);git(['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','newer']);
  reader=new PinnedGitReader(root,'not-a-real-token');await reader.prefetch([path],pinned);assert.deepEqual((await reader.getFile(path,pinned))?.value,{public:'version-one'});
  await assert.rejects(reader.getFile(`drafts/${'a'.repeat(64)}.json`,pinned));await assert.rejects(reader.getFile('../private',pinned));await assert.rejects(reader.getFile(path,'main'));
  assert.equal((await readdir(reader.directory!)).some(name=>name==='drafts'||name==='snapshots'),false);
 }finally {await reader?.dispose();await rm(root,{recursive:true,force:true});}
});
