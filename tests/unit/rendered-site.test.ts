import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {verifyRenderedSite} from '../../scripts/verify-site';import {sha256,type MigrationManifest} from '../../scripts/migration/convert';
test('render verification resolves URL-encoded spaces and plus signs once',async()=>{
 const root=await mkdtemp(join(tmpdir(),'firefly-render-'));const bytes=Buffer.from('image');
 const manifest={version:1,sourceHead:'fixture',records:[{sourcePath:'a.md',canonicalPath:'/notes/a/',hasBody:true,visibility:'published'}],assets:[{sourcePath:'assets/a.png',sha256:sha256(bytes),width:20,height:10,publishedVariants:[]}]} as unknown as MigrationManifest;
 try{await mkdir(join(root,'notes/a'),{recursive:true});await mkdir(join(root,'_astro'));await mkdir(join(root,'images/original'),{recursive:true});await writeFile(join(root,'_astro/图 a+b.webp'),bytes);await writeFile(join(root,'images/original/a.png'),bytes);
 await writeFile(join(root,'notes/a/index.html'),'<h1>A</h1><img src="/_astro/图%20a%2Bb.webp" srcset="/_astro/图%20a%2Bb.webp 20w" width="20" height="10" data-source-asset="assets/a.png" data-original-url="/images/original/a.png">');
 assert.deepEqual(await verifyRenderedSite(root,manifest),{errors:[]});
 }finally{await rm(root,{recursive:true,force:true});}
});
