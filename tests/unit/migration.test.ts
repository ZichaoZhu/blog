import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildManifest,convertContent} from '../../scripts/migration/convert';
test('conversion preserves CRLF body bytes and is idempotent without invented dates',async()=>{
 const root=await mkdtemp(join(tmpdir(),'firefly-convert-'));
 try {
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.test','-c','commit.gpgsign=false','commit','--allow-empty','-qm','init'],{cwd:root});
  await mkdir(join(root,'content/posts'),{recursive:true});
  const body='\r\n# 标题\r\n\r\n```ts\r\nconst a = 1;\r\n```\r\n';
  await writeFile(join(root,'content/posts/example.md'),'---\r\ntitle: Example\r\nid: example\r\nslug: example\r\n---\r\n'+body);
  const manifest=await buildManifest(root);const target=join(root,'target');
  await assert.rejects(convertContent(manifest,{sourceRoot:root,targetRoot:target,dryRun:true,selectedPaths:['missing.md']}),/unknown.*select/i);
  assert.equal(manifest.records[0].bodySha256,createHash('sha256').update(body).digest('hex'));
  await convertContent(manifest,{sourceRoot:root,targetRoot:target,dryRun:true});
  await assert.rejects(readdir(target),/ENOENT/);
  await convertContent(manifest,{sourceRoot:root,targetRoot:target,dryRun:false});
  const first=await readFile(join(target,'example.md'));
  assert.ok(first.toString().endsWith(body));assert.equal(manifest.records[0].date,undefined);
  const again=await convertContent(manifest,{sourceRoot:root,targetRoot:target,dryRun:false});
  assert.deepEqual(again.written,[]);assert.deepEqual(await readFile(join(target,'example.md')),first);
 } finally {await rm(root,{recursive:true,force:true});}
});
