import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCodeRelease} from '../../scripts/paper-trees/create-code-job';
import {runPublish,type PublishDependencies,type DeploymentRecord,type DeploymentProvider} from '../../scripts/paper-trees/publish';
import {reconcileRelease} from '../../scripts/paper-trees/reconcile';
import {restoreCodeDeployment} from '../../scripts/paper-trees/restore-code-deployment';
import {prepareRelease} from '../../scripts/paper-trees/prepare';
import {GitHubTreeStore} from '../../studio/src/server/github-store';
import {PaperTreeReleases,type ReleaseJob} from '../../studio/src/server/release';
import {authorConfig as config,catalog,FakeGitHub,paper} from '../fixtures/paper-tree-studio';
import {makeNote} from '../fixtures/notes';
import {createPaperTree} from '../../src/features/paper-trees/template';
import {toPublicSnapshot} from '../../src/features/paper-trees/model';
const newCode='d'.repeat(40);
class Provider implements DeploymentProvider {
 formal:DeploymentRecord|null=null;candidate:DeploymentRecord|null=null;fail=false;promotions=0;verified=false;
 constructor(readonly projectId:string){}
 async checkProtection(){} async build(){} async validateBuild(){}
 async upload(job:ReleaseJob){return this.candidate={id:`dpl_${this.projectId}`,url:`https://${this.projectId}.vercel.app`,projectId:this.projectId,codeSha:job.codeSha,releaseId:job.releaseId,jobId:job.jobId,readyState:'READY'};}
 async verifyCandidate(){this.verified=true;}
 async promote(deployment:DeploymentRecord){this.promotions++;if(this.fail)throw new Error('provider-secret');this.formal=deployment;}
 async getFormalDeployment(){if(!this.formal)throw new Error('not promoted');return this.formal;}
 async getDeployment(){if(!this.candidate)throw new Error('missing');return this.candidate;}
 async verifyFormal(){}
}
async function setup(){const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);const oldRelease=randomUUID();const snapshot=toPublicSnapshot(createPaperTree(paper.id,'empty'),randomUUID(),'2026-10-08T00:00:00.000Z');
 github.files().set('control.json',JSON.stringify({schemaVersion:1,activeReleaseId:oldRelease,activeCodeSha:catalog.codeSha,activeDeploymentId:'dpl_oldBlog',activeStudioDeploymentId:'dpl_oldStudio',activeJobId:null,baselineDeploymentId:'dpl_oldBlog'}));github.files().set(`releases/${oldRelease}.json`,JSON.stringify({schemaVersion:1,releaseId:oldRelease,codeSha:catalog.codeSha,createdAt:snapshot.publishedAt,parentReleaseId:null,entries:{[paper.id]:snapshot.snapshotId}}));github.files().set(`snapshots/${snapshot.snapshotId}.json`,JSON.stringify(snapshot));
 const nextCatalog={...catalog,codeSha:newCode,papers:catalog.papers.map(p=>({...p,title:'Renamed',slug:'renamed'}))};const outDir=await mkdtemp(join(tmpdir(),'paper-code-'));const provider=new Provider('prj_blog'),studioProvider=new Provider('prj_studio');
 const deps:PublishDependencies={store,catalog:nextCatalog,notes:[makeNote({id:paper.id,type:'paper',title:'Renamed',slug:'renamed'})],sourceSha:async()=>newCode,projectId:'prj_blog',provider,studioProvider,studioProjectId:'prj_studio',outDir,workflowRuns:async()=>[]};
 return {github,store,deps,provider,studioProvider,outDir,snapshot,oldRelease};}
test('code jobs require an allowed immutable commit, preserve stable associations and exclude newly private history',async()=>{
 const s=await setup();try{
 await assert.rejects(createCodeRelease(newCode,{...s.deps,allowedSource:async()=>false}));assert.equal(JSON.parse(s.github.files().get('control.json')!).activeJobId,null);
 const job=await createCodeRelease(newCode,{...s.deps,allowedSource:async()=>true});assert.equal(job.mode,'code');const dataSha=s.github.requests.find(r=>r.url.includes('/dispatches'))!.body.inputs.data_sha;
 const input=await prepareRelease(job,dataSha,s.outDir,s.deps);assert.equal(input.release.entries[paper.id],s.snapshot.snapshotId);
 const hidden=await prepareRelease(job,dataSha,s.outDir,{...s.deps,notes:[makeNote({id:paper.id,type:'paper',visibility:'unlisted'})]});assert.deepEqual(hidden.release.entries,{});assert.equal(hidden.snapshots.length,0);
 await assert.rejects(createCodeRelease(newCode,{...s.deps,allowedSource:async()=>true}),{code:'RELEASE_BUSY'});
 const oldStudio=new PaperTreeReleases(s.store,catalog);await assert.rejects(oldStudio.requestRollback(s.oldRelease),{code:'RELEASE_BUSY'});
 }finally{await rm(s.outDir,{recursive:true,force:true});}
});
test('both candidates are verified before code promotion and partial switching is recoverable without clearing the lock',async()=>{
 const s=await setup();try{
 const job=await createCodeRelease(newCode,{...s.deps,allowedSource:async()=>true});const dataSha=s.github.requests.find(r=>r.url.includes('/dispatches'))!.body.inputs.data_sha;
 s.studioProvider.fail=true;await assert.rejects(runPublish(job.jobId,dataSha,s.deps));assert.equal(s.provider.verified,true);assert.equal(s.studioProvider.verified,true);assert.equal(s.provider.formal?.codeSha,newCode);
 let control=JSON.parse(s.github.files().get('control.json')!);assert.equal(control.activeCodeSha,catalog.codeSha);assert.equal(control.activeJobId,job.jobId);assert.notEqual((await reconcileRelease(job.jobId,s.deps)).state,'published');
 // The operator completes the exact already-verified Studio candidate, then reconciliation verifies both IDs.
 s.studioProvider.fail=false;await s.studioProvider.promote(s.studioProvider.candidate!);assert.equal((await reconcileRelease(job.jobId,s.deps)).state,'published');control=JSON.parse(s.github.files().get('control.json')!);assert.equal(control.activeCodeSha,newCode);assert.equal(control.activeStudioDeploymentId,'dpl_prj_studio');assert.equal(control.activeJobId,null);
 await assert.rejects(new PaperTreeReleases(s.store,catalog).requestRollback(s.oldRelease),{code:'SOURCE_VERSION_MISMATCH'});
 const rollback=await new PaperTreeReleases(s.store,s.deps.catalog).requestRollback(s.oldRelease);assert.equal(rollback.codeSha,newCode);assert.equal(rollback.mode,'rollback');
 }finally{await rm(s.outDir,{recursive:true,force:true});}
});
test('emergency deployment rollback requires explicit whole-site scope and synchronizes both archived deployments and control',async()=>{
 const s=await setup();try {
 const job=await createCodeRelease(newCode,{...s.deps,allowedSource:async()=>true});const dataSha=s.github.requests.find(r=>r.url.includes('/dispatches'))!.body.inputs.data_sha;await runPublish(job.jobId,dataSha,s.deps);
 const control=JSON.parse(s.github.files().get('control.json')!);control.activeCodeSha='e'.repeat(40);s.github.files().set('control.json',JSON.stringify(control));
 await assert.rejects(restoreCodeDeployment(job.jobId,false,s.deps));assert.equal(JSON.parse(s.github.files().get('control.json')!).activeJobId,null);
 await restoreCodeDeployment(job.jobId,true,s.deps);const restored=JSON.parse(s.github.files().get('control.json')!);assert.equal(restored.activeCodeSha,newCode);assert.equal(restored.activeStudioDeploymentId,'dpl_prj_studio');assert.equal(restored.activeJobId,null);
 }finally{await rm(s.outDir,{recursive:true,force:true});}
});
