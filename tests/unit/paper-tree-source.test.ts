import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readCleanSourceSha} from '../../scripts/paper-trees/worker';

test('publication source rejects tracked, staged and untracked changes before labeling a catalog with HEAD',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paper-source-'));
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git(['init','-q']);await writeFile(join(root,'paper.md'),'published');git(['add','.']);git(['-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','source']);
  const head=git(['rev-parse','HEAD']);assert.equal(readCleanSourceSha(root),head);
  await writeFile(join(root,'paper.md'),'draft');assert.throws(()=>readCleanSourceSha(root),{code:'SOURCE_WORKTREE_DIRTY'});
  git(['add','.']);assert.throws(()=>readCleanSourceSha(root),{code:'SOURCE_WORKTREE_DIRTY'});
  await writeFile(join(root,'paper.md'),'published');git(['add','.']);assert.equal(readCleanSourceSha(root),head);
  await writeFile(join(root,'new-paper.md'),'untracked');assert.throws(()=>readCleanSourceSha(root),{code:'SOURCE_WORKTREE_DIRTY'});
 }finally{await rm(root,{recursive:true,force:true});}
});
