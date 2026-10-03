import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,readdir} from 'node:fs/promises';import {join,dirname} from 'node:path';import {tmpdir} from 'node:os';
import {convertContent,type MigrationManifest} from '../../scripts/migration/convert';
import {verifyMigration} from '../../scripts/verify-site';
test('full manifest preserves every body and original asset and detects omissions and scope changes',async()=>{
 const manifest:MigrationManifest=JSON.parse(await readFile('migration/manifest.json','utf8'));
 const root=await mkdtemp(join(tmpdir(),'firefly-full-'));const source=join(root,'source'),target=join(root,'target');
 const local='src/content/posts';
 try{
  for(const item of [...manifest.records,...manifest.assets]){const dest=join(source,'content/posts',item.sourcePath);await mkdir(dirname(dest),{recursive:true});const current=join(local,item.sourcePath);await copyFile(current,dest);}
  await convertContent(manifest,{sourceRoot:source,targetRoot:target,dryRun:true});await assert.rejects(readdir(target),/ENOENT/);
  await convertContent(manifest,{sourceRoot:source,targetRoot:target,dryRun:false});
  assert.deepEqual(await verifyMigration(manifest,target),{records:53,published:44,assets:578,errors:[]});
  const second=await convertContent(manifest,{sourceRoot:source,targetRoot:target,dryRun:false});assert.deepEqual(second.written,[]);
  const image=manifest.assets[0];await writeFile(join(target,image.sourcePath),'corrupt');assert.ok((await verifyMigration(manifest,target)).errors.some(e=>e.includes(image.sourcePath)));
  await copyFile(join(source,'content/posts',image.sourcePath),join(target,image.sourcePath));
  const missing={...manifest,records:manifest.records.slice(1)};assert.ok((await verifyMigration(missing,target)).errors.some(e=>e.includes(manifest.records[0].sourcePath)));
  const demo=manifest.records.find(r=>r.slug==='typora-test')!;const path=join(target,demo.targetPath);await writeFile(path,(await readFile(path,'utf8')).replace('visibility: "unlisted"','visibility: "published"'));assert.ok((await verifyMigration(manifest,target)).errors.some(e=>e.includes(demo.sourcePath)&&e.includes('visibility')));
 }finally{await rm(root,{recursive:true,force:true});}
});
