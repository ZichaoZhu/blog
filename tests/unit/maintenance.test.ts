import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,rm,rename} from 'node:fs/promises';import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';import {noteDataSchema} from '../../src/content/schema';import {sha256} from '../../scripts/migration/convert';
test('ongoing verification allows edits, stable-ID moves and visibility changes but catches new broken links',async()=>{
 const root=await mkdtemp(join(tmpdir(),'firefly-maintain-'));const content=join(root,'posts'),site=join(root,'dist');const script=resolve('scripts/verify-site.ts'),loader=resolve('node_modules/tsx/dist/loader.mjs');
 const original='\nOriginal text\n';const data=noteDataSchema.parse({id:'stable',slug:'stable',title:'Stable',topics:[],visibility:'published'});
 const snapshot={version:1,sourceHead:'fixture',assets:[],records:[{...data,sourcePath:'old.md',targetPath:'old.md',bodySha256:sha256(original),hasBody:true,legacyPath:'/blog/old',canonicalPath:'/notes/stable/',anchorAliases:{}}]};
 const raw=(body:string,visibility='published')=>'---\nid: stable\nslug: stable\ntitle: Stable\ntopics: []\nvisibility: '+visibility+'\nupdatedAt: "2026-10-03"\n---\n'+body;
 const run=(audit=false)=>spawnSync(process.execPath,['--import',loader,script,'--content-root',content,'--site-root',site,'--manifest',join(root,'manifest.json'),...(audit?['--audit-migration']:[])],{cwd:root,encoding:'utf8'});
 try{await mkdir(content);await mkdir(join(site,'notes/stable'),{recursive:true});await writeFile(join(root,'manifest.json'),JSON.stringify(snapshot));await writeFile(join(content,'old.md'),raw('Corrected text'));await writeFile(join(site,'notes/stable/index.html'),'<h1>Stable</h1><h2 id="section">Section</h2>');
 let result=run();assert.equal(result.status,0,result.stdout+result.stderr);assert.notEqual(run(true).status,0,'frozen acceptance still detects changed migration bytes');
 await mkdir(join(content,'moved'));await rename(join(content,'old.md'),join(content,'moved/index.md'));assert.equal(run().status,0,'moving a stable slug keeps verification usable');
 await writeFile(join(content,'moved/index.md'),raw('Private','draft'));await rm(join(site,'notes/stable'),{recursive:true});assert.equal(run().status,0,'draft no longer requires historical output');
 await writeFile(join(content,'new.md'),'---\nid: new\nslug: new\ntitle: New\ntopics: []\n---\nNew content');await mkdir(join(site,'notes/new'),{recursive:true});await writeFile(join(site,'notes/new/index.html'),'<h1>New</h1><a href="/missing/">broken</a>');result=run();assert.equal(result.status,1);assert.match(result.stdout,/broken local link/);
 }finally{await rm(root,{recursive:true,force:true});}
});
