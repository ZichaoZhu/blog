import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareRelease} from '../../scripts/paper-trees/prepare';
import {runPublish,type PublishDependencies,type DeploymentRecord,type DeploymentProvider} from '../../scripts/paper-trees/publish';
import {reconcileRelease} from '../../scripts/paper-trees/reconcile';
import {PaperTreeReleases,type ReleaseControl,type ReleaseJob} from '../../studio/src/server/release';
import {GitHubTreeStore} from '../../studio/src/server/github-store';
import {ApiError} from '../../studio/src/server/auth';
import {createPaperTree} from '../../src/features/paper-trees/template';
import {toPublicSnapshot} from '../../src/features/paper-trees/model';
import {authorConfig as config,catalog,FakeGitHub,paper} from '../fixtures/paper-tree-studio';
import {makeNote} from '../fixtures/notes';
const projectId='prj_correct';
class FakeVercel implements DeploymentProvider {
 calls:string[]=[]; fail:string|null=null; wrongProject=false; anonymousReadable=false; staleReceipt=false; promoted:DeploymentRecord|null=null;
 async checkProtection(){this.calls.push('protection');if(this.fail==='protection')throw new Error('secret-provider-content');}
 async build(){this.calls.push('build');if(this.fail==='build')throw new Error('secret-provider-content');}
 async validateBuild(){this.calls.push('validate');if(this.fail==='validate')throw new Error('secret-provider-content');}
 async upload(job:ReleaseJob){this.calls.push('upload');if(this.fail==='upload')throw new Error('secret-provider-content');return {id:'dpl_candidate',url:'https://candidate.vercel.app',projectId:this.wrongProject?'prj_other':projectId,codeSha:job.codeSha,releaseId:job.releaseId,jobId:job.jobId,readyState:'READY'};}
 async verifyCandidate(){this.calls.push('candidate');if(this.anonymousReadable||this.fail==='candidate')throw new ApiError(502,'CANDIDATE_UNPROTECTED');}
 async promote(deployment:DeploymentRecord){this.calls.push('promote');if(this.fail==='promote')throw new Error('secret-provider-content');this.promoted=deployment;}
 async getFormalDeployment(){this.calls.push('formal-id');return this.promoted??{id:'dpl_previous',url:'https://previous.vercel.app',projectId,codeSha:catalog.codeSha,releaseId:null,jobId:null,readyState:'READY'};}
 async getDeployment(id:string){assert.equal(id,'dpl_candidate');if(!this.promoted)throw new Error('missing candidate');return this.promoted;}
 async verifyFormal(){this.calls.push('formal-receipt');if(this.staleReceipt||this.fail==='formal')throw new ApiError(502,'RECEIPT_MISMATCH');}
}
async function setup(){
 const outDir=await mkdtemp(join(tmpdir(),'paper-tree-workflow-'));const github=new FakeGitHub();
 const control:ReleaseControl={schemaVersion:1,activeReleaseId:null,activeCodeSha:catalog.codeSha,activeDeploymentId:'dpl_previous',activeStudioDeploymentId:null,activeJobId:null,baselineDeploymentId:'dpl_previous'};
 github.files().set('control.json',JSON.stringify(control));const store=new GitHubTreeStore(config,github.fetch);const releases=new PaperTreeReleases(store,catalog);
 const saved=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);const job=await releases.requestPublish(paper.paperKey,saved.blobSha);const dataSha=github.requests.find(request=>request.url.includes('/dispatches'))!.body.inputs.data_sha;
 const notes=[makeNote({id:paper.id,slug:paper.slug,type:'paper',visibility:'published',contentKind:'note'})];const provider=new FakeVercel();
 const dependencies:PublishDependencies={store,catalog,notes,provider,outDir,projectId,sourceSha:async()=>catalog.codeSha,workflowRuns:async()=>[{name:`paper-tree:${job.jobId}`,status:'completed',conclusion:'failure'}]};
 return {github,store,releases,job,dataSha,provider,dependencies,outDir};
}
test('preparation reads a pinned public allowlist, retains successful history and excludes private or failed snapshots',async()=>{
 const state=await setup();try{
  const frozen=state.github.trees.get(state.github.commits.get(state.dataSha)!.tree)!;const release=JSON.parse(frozen.get(`releases/${state.job.releaseId}.json`)!);
  const historyId=randomUUID(),historySnapshot=toPublicSnapshot(createPaperTree(paper.id,'empty'),randomUUID(),'2026-10-08T01:00:00.000Z');release.parentReleaseId=historyId;frozen.set(`releases/${state.job.releaseId}.json`,JSON.stringify(release));const control=JSON.parse(frozen.get('control.json')!);control.activeReleaseId=historyId;frozen.set('control.json',JSON.stringify(control));
  frozen.set(`releases/${historyId}.json`,JSON.stringify({...release,releaseId:historyId,parentReleaseId:null,entries:{[paper.id]:historySnapshot.snapshotId,'private-paper':randomUUID()}}));frozen.set(`snapshots/${historySnapshot.snapshotId}.json`,JSON.stringify(historySnapshot));frozen.set(`snapshots/${randomUUID()}.json`,'FailedTreeSentinel');
  const before=state.github.requests.length;
  const input=await prepareRelease(state.job,state.dataSha,state.outDir,state.dependencies);assert.equal(input.snapshots.length,2);assert.equal(input.release.entries[paper.id],release.entries[paper.id]);assert.equal((await readFile(join(state.outDir,'snapshot-ids.json'),'utf8')).includes(historySnapshot.snapshotId),true);
  const files=state.github.requests.slice(before).filter(request=>request.url.includes('/contents/'));assert.equal(files.some(request=>request.url.includes('/drafts/')),false);
  const allowed=new Set(input.snapshots.map(snapshot=>snapshot.snapshotId));assert.equal(allowed.has(historySnapshot.snapshotId),true);
  await assert.rejects(prepareRelease({...state.job,codeSha:'f'.repeat(40)},state.dataSha,state.outDir,state.dependencies));
 }finally{await rm(state.outDir,{recursive:true,force:true});}
});
test('build, validation, upload and candidate failures leave the successful pointer untouched and do not promote',async()=>{
 for(const stage of ['protection','build','validate','upload','candidate']){
  const state=await setup();try{state.provider.fail=stage;await assert.rejects(runPublish(state.job.jobId,state.dataSha,state.dependencies));const control=JSON.parse(state.github.files().get('control.json')!);assert.equal(control.activeReleaseId,null,stage);assert.equal(control.activeDeploymentId,'dpl_previous');assert.equal(control.activeJobId,null);assert.equal(state.provider.calls.includes('promote'),false);const job=await state.releases.getJob(state.job.jobId);assert.equal(job.state,'failed');assert.doesNotMatch(JSON.stringify(job),/secret-provider-content/);}finally{await rm(state.outDir,{recursive:true,force:true});}
 }
});
test('wrong project and anonymously readable candidates are refused before promotion',async()=>{
 for(const option of ['wrongProject','anonymousReadable'] as const){const state=await setup();try{state.provider[option]=true;await assert.rejects(runPublish(state.job.jobId,state.dataSha,state.dependencies));assert.equal(state.provider.calls.includes('promote'),false);assert.equal(JSON.parse(state.github.files().get('control.json')!).activeReleaseId,null);}finally{await rm(state.outDir,{recursive:true,force:true});}}
});
test('promote failure and stale receipt keep the lock for reconciliation instead of guessing success',async()=>{
 for(const option of ['promote','stale']){const state=await setup();try{if(option==='promote')state.provider.fail='promote';else state.provider.staleReceipt=true;await assert.rejects(runPublish(state.job.jobId,state.dataSha,state.dependencies));const control=JSON.parse(state.github.files().get('control.json')!);assert.equal(control.activeReleaseId,null);assert.equal(control.activeJobId,state.job.jobId);const job=await reconcileRelease(state.job.jobId,state.dependencies);assert.notEqual(job.state,'published');assert.equal(JSON.parse(state.github.files().get('control.json')!).activeJobId,state.job.jobId);}finally{await rm(state.outDir,{recursive:true,force:true});}}
});
test('a verified deployment is published once, and duplicate workflows cannot promote it again',async()=>{
 const state=await setup();try{await runPublish(state.job.jobId,state.dataSha,state.dependencies);const control=JSON.parse(state.github.files().get('control.json')!);assert.equal(control.activeReleaseId,state.job.releaseId);assert.equal(control.activeDeploymentId,'dpl_candidate');assert.equal(control.activeJobId,null);assert.equal((await state.releases.getJob(state.job.jobId)).state,'published');await runPublish(state.job.jobId,state.dataSha,state.dependencies);assert.equal(state.provider.calls.filter(call=>call==='promote').length,1);}finally{await rm(state.outDir,{recursive:true,force:true});}
});
test('formal receipt and deployment identity recover a failed private success write without a second promote',async()=>{
 const state=await setup();const original=state.store.commitFiles.bind(state.store);let failed=false;
 state.store.commitFiles=async(base,files)=>{if(!failed&&files['control.json']&&JSON.parse(files['control.json']).activeReleaseId===state.job.releaseId){failed=true;throw new ApiError(502,'GITHUB_UNAVAILABLE');}return original(base,files);};
 try{await assert.rejects(runPublish(state.job.jobId,state.dataSha,state.dependencies));assert.equal(state.provider.promoted?.id,'dpl_candidate');const job=await reconcileRelease(state.job.jobId,state.dependencies);assert.equal(job.state,'published');assert.equal(JSON.parse(state.github.files().get('control.json')!).activeReleaseId,state.job.releaseId);assert.equal(state.provider.calls.filter(call=>call==='promote').length,1);}finally{await rm(state.outDir,{recursive:true,force:true});}
});
