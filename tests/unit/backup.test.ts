import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { backupWorkspace } from '../../scripts/migration/backup.ts';

const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
async function fixture() {
 const root = await mkdtemp(join(tmpdir(), 'firefly-backup-'));
 const source = join(root,'source');
 await mkdir(source);
 const git = (...args:string[]) => execFileSync('git',args,{cwd:source});
 git('init','-q');
 await writeFile(join(source,'note.md'),'before');
 await writeFile(join(source,'deleted.md'),'deleted');
 git('add','.');
 git('-c','user.name=Fixture','-c','user.email=fixture@example.test','-c','commit.gpgsign=false','commit','-qm','fixture');
 await writeFile(join(source,'note.md'),'after');
 await writeFile(join(source,'untracked.md'),'new authored note');
 await rm(join(source,'deleted.md'));
 return {root,source,backup:join(root,'backup')};
}
test('backup preserves modified and untracked bytes and tracked deletions',async()=>{
 const {root,source,backup}=await fixture();
 try {
  const result=await backupWorkspace(source,backup);
  assert.deepEqual(result.deletedTrackedFiles,['deleted.md']);
  assert.equal((await readFile(join(backup,'files/note.md'))).toString(),'after');
  assert.equal((await readFile(join(backup,'files/untracked.md'))).toString(),'new authored note');
  assert.equal(result.files.find(f=>f.path==='note.md')?.sha256,hash(Buffer.from('after')));
  await assert.rejects(backupWorkspace(source,backup),/exist/i);
 } finally {await rm(root,{recursive:true,force:true});}
});
test('backup rejects image bytes that are actually LFS pointers',async()=>{
 const {root,source,backup}=await fixture();
 try {
  await writeFile(join(source,'image.png'),'version https://git-lfs.github.com/spec/v1\noid sha256:0123\nsize 123\n');
  await assert.rejects(backupWorkspace(source,backup),/LFS pointer/);
 } finally {await rm(root,{recursive:true,force:true});}
});
