import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import {PaperTreeReleases,type ReleaseControl,type ReleaseJob} from '../../studio/src/server/release';
import {GitHubTreeStore} from '../../studio/src/server/github-store';
import {handleApi} from '../../studio/src/server/api';
import {signSession} from '../../studio/src/server/auth';
import {ApiError} from '../../studio/src/server/auth';
import {createPaperTree} from '../../src/features/paper-trees/template';
import {type ReleaseManifest,toPublicSnapshot} from '../../src/features/paper-trees/model';
import {authorConfig as config,catalog,FakeGitHub,paper} from '../fixtures/paper-tree-studio';
const priorId='8112b964-7c1b-4476-94d4-42a0417cc858';
const prior:ReleaseManifest={schemaVersion:1,releaseId:priorId,parentReleaseId:null,codeSha:catalog.codeSha,createdAt:'2026-10-08T01:00:00.000Z',entries:{}};
test('delayed dispatch errors preserve newer worker progress, deployment IDs and the active lock',async()=>{
 for(const code of ['DISPATCH_UNCERTAIN','DISPATCH_REJECTED'])for(const state of ['building','validating','deploying'] as const){
  const {github,store,releases}=setup();const saved=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);
  store.dispatchPublish=async(jobId)=>{
   const head=await store.getHead();const current=(await store.getFile<ReleaseJob>(`jobs/${jobId}.json`,head.sha))!.value;
   await store.commitFiles(head,{[`jobs/${jobId}.json`]:JSON.stringify({...current,state,deploymentId:'dpl_blogCandidate',studioDeploymentId:'dpl_studioCandidate'})});
   throw new ApiError(502,code);
  };
  const job=await releases.requestPublish(paper.paperKey,saved.blobSha);
  assert.equal(job.state,state);assert.equal(job.deploymentId,'dpl_blogCandidate');assert.equal(job.studioDeploymentId,'dpl_studioCandidate');
  assert.equal(JSON.parse(github.files().get('control.json')!).activeJobId,job.jobId);
  assert.deepEqual((await releases.getJob(job.jobId)),job);
 }
});
function setup(){
 const github=new FakeGitHub();const control:ReleaseControl={schemaVersion:1,activeReleaseId:priorId,activeCodeSha:catalog.codeSha,activeDeploymentId:'dpl_previous',activeStudioDeploymentId:'dpl_studio',activeJobId:null,baselineDeploymentId:'dpl_baseline'};
 github.files().set('control.json',JSON.stringify(control));github.files().set(`releases/${priorId}.json`,JSON.stringify(prior));
 const store=new GitHubTreeStore(config,github.fetch);return {github,store,control,releases:new PaperTreeReleases(store,catalog)};
}
test('save keeps the successful public pointer, publish freezes the requested blob and later edits remain private',async()=>{
 const {github,store,releases}=setup();const draft=createPaperTree(paper.id,'empty');draft.tree.nodeData.topic='Frozen Version';const saved=await store.saveDraft(paper,draft,null);
 assert.equal(JSON.parse(github.files().get('control.json')!).activeReleaseId,priorId);
 await assert.rejects(releases.requestPublish(paper.paperKey,'b'.repeat(40)),{code:'VERSION_CONFLICT'});
 const job=await releases.requestPublish(paper.paperKey,saved.blobSha);assert.equal(job.state,'queued');
 const control=JSON.parse(github.files().get('control.json')!);assert.equal(control.activeReleaseId,priorId);assert.equal(control.activeJobId,job.jobId);
 const candidate=JSON.parse(github.files().get(`releases/${job.releaseId}.json`)!);assert.equal(candidate.parentReleaseId,priorId);
 const snapshotId=candidate.entries[paper.id];const snapshot=JSON.parse(github.files().get(`snapshots/${snapshotId}.json`)!);assert.equal(snapshot.tree.nodeData.topic,'Frozen Version');assert.equal(snapshot.templateId,undefined);
 draft.tree.nodeData.topic='Newer Private';await store.saveDraft(paper,draft,saved.blobSha);assert.equal(JSON.parse(github.files().get(`snapshots/${snapshotId}.json`)!).tree.nodeData.topic,'Frozen Version');
 const dispatch=github.requests.find(request=>request.url.includes('/dispatches'))!;const pinned=dispatch.body.inputs.data_sha;assert.equal(github.commits.get(pinned)?.parent!==null,true);assert.equal(dispatch.body.inputs.code_sha,catalog.codeSha);
 assert.equal(JSON.parse(github.trees.get(github.commits.get(pinned)!.tree)!.get(`jobs/${job.jobId}.json`)!).state,'queued');
});
test('parallel requests create one active job, and a stale author source cannot dispatch',async()=>{
 const {github,store,releases}=setup();const saved=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);
 const attempts=await Promise.allSettled([releases.requestPublish(paper.paperKey,saved.blobSha),releases.requestPublish(paper.paperKey,saved.blobSha)]);
 assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);assert.equal(github.requests.filter(item=>item.url.includes('/dispatches')).length,1);
 await assert.rejects(releases.requestPublish(paper.paperKey,saved.blobSha),error=>{assert.equal((error as any).code,'RELEASE_BUSY');assert.match((error as any).details.jobId,/^[a-f\d-]{36}$/);return true;});
 const clean=setup();const other=new PaperTreeReleases(clean.store,{...catalog,codeSha:'b'.repeat(40)});await assert.rejects(other.requestPublish(paper.paperKey,'a'.repeat(40)),{code:'SOURCE_VERSION_MISMATCH'});assert.equal(clean.github.requests.some(r=>r.url.includes('/dispatches')),false);
});
test('new candidates use only the latest successful mapping and never carry a failed candidate',async()=>{
 const {github,store}=setup();const otherPaper={...paper,id:'second-paper',paperKey:createHash('sha256').update('second-paper').digest('hex'),slug:'second-paper'};
 const baselineTree=toPublicSnapshot(createPaperTree(paper.id,'empty'),randomUUID(),prior.createdAt);const baseline={...prior,entries:{[paper.id]:baselineTree.snapshotId}};
 github.files().set(`releases/${priorId}.json`,JSON.stringify(baseline));github.files().set(`snapshots/${baselineTree.snapshotId}.json`,JSON.stringify(baselineTree));
 const failedRelease=randomUUID(),failedSnapshot=randomUUID();github.files().set(`releases/${failedRelease}.json`,JSON.stringify({...prior,releaseId:failedRelease,entries:{[paper.id]:failedSnapshot}}));
 const saved=await store.saveDraft(otherPaper,createPaperTree(otherPaper.id,'empty'),null);const service=new PaperTreeReleases(store,{...catalog,papers:[paper,otherPaper]});const job=await service.requestPublish(otherPaper.paperKey,saved.blobSha);
 const candidate=JSON.parse(github.files().get(`releases/${job.releaseId}.json`)!);assert.equal(candidate.entries[paper.id],baselineTree.snapshotId);assert.notEqual(candidate.entries[paper.id],failedSnapshot);
});
test('history follows only the successful parent chain and rollback preserves private drafts',async()=>{
 const {github,store,control,releases}=setup();const nextId=randomUUID();github.files().set(`releases/${nextId}.json`,JSON.stringify({...prior,releaseId:nextId,parentReleaseId:priorId}));control.activeReleaseId=nextId;github.files().set('control.json',JSON.stringify(control));
 const saved=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);const before=github.files().get(`drafts/${paper.paperKey}.json`);
 const history=await releases.getHistory(null,1);assert.equal(history.items[0].releaseId,nextId);assert.equal(history.cursor,priorId);assert.equal((await releases.getHistory(history.cursor)).items[0].releaseId,priorId);
 const failedId=randomUUID();github.files().set(`releases/${failedId}.json`,JSON.stringify({...prior,releaseId:failedId}));await assert.rejects(releases.getHistory(failedId),{code:'RELEASE_NOT_SUCCESSFUL'});await assert.rejects(releases.requestRollback(failedId),{code:'RELEASE_NOT_SUCCESSFUL'});
 const job=await releases.requestRollback(priorId);assert.equal(job.mode,'rollback');assert.equal(github.files().get(`drafts/${paper.paperKey}.json`),before);assert.equal((await store.getFile(`drafts/${paper.paperKey}.json`,github.head))!.blobSha,saved.blobSha);
 await assert.rejects(releases.getHistory(null,21));
});
test('uncertain workflow dispatch retains the queued lock; definitive rejection fails the job and unlocks',async()=>{
 for(const status of [500,403]){
  const {github,control}=setup();const fetchImpl:typeof fetch=async(input,init)=>String(input).includes('/dispatches')?Response.json({private:'secret-error'},{status}):github.fetch(input,init);
  const store=new GitHubTreeStore(config,fetchImpl);const saved=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);const releases=new PaperTreeReleases(store,catalog);const job=await releases.requestPublish(paper.paperKey,saved.blobSha);
  const current=JSON.parse(github.files().get('control.json')!);assert.equal(current.activeReleaseId,control.activeReleaseId);assert.equal(job.state,status===500?'queued':'failed');assert.equal(current.activeJobId,status===500?job.jobId:null);assert.doesNotMatch(JSON.stringify(job),/secret-error/);
  assert.equal((await releases.getJob(job.jobId)).state,job.state);
 }
});
test('private and bodyless papers cannot publish and untrusted release input is rejected',async()=>{
 const {github,store}=setup();const service=new PaperTreeReleases(store,{...catalog,papers:[{...paper,visibility:'unlisted'}]});await assert.rejects(service.requestPublish(paper.paperKey,'a'.repeat(40)),{code:'PAPER_NOT_PUBLIC'});assert.equal(github.requests.length,0);
 const service2=new PaperTreeReleases(store,catalog);for(const id of ['../private','%2e%2e','not-a-uuid']){await assert.rejects(service2.getJob(id));await assert.rejects(service2.requestRollback(id));}
});
test('release APIs enforce owner, CSRF and immutable source inputs, return the active job and successful history only',async()=>{
 const {github,store,releases}=setup();const draft=await store.saveDraft(paper,createPaperTree(paper.id,'empty'),null);const dependencies={catalog,store,releases};
 const csrfToken='a'.repeat(48),token=signSession({userId:config.ownerUserId,expiresAt:Math.floor(Date.now()/1000)+7200,csrfToken},config.sessionSecret);
 const request=(path:string,method='GET',body?:unknown,authenticated=true)=>new Request(config.origin+path,{method,headers:{...(authenticated?{cookie:`__Host-paper-tree-session=${token}`} :{}),origin:config.origin,'X-CSRF-Token':csrfToken,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const initial=github.requests.length;assert.equal((await handleApi(request('/api/publish','POST',{paperKey:paper.paperKey,draftSha:draft.blobSha},false),config,dependencies)).status,401);assert.equal(github.requests.length,initial);
 const override=await handleApi(request('/api/publish','POST',{paperKey:paper.paperKey,draftSha:draft.blobSha,codeSha:'f'.repeat(40)}),config,dependencies);assert.equal(override.status,400);assert.equal(github.requests.length,initial);
 const created=await handleApi(request('/api/publish','POST',{paperKey:paper.paperKey,draftSha:draft.blobSha}),config,dependencies);assert.equal(created.status,202);const job=await created.json();
 const active=await handleApi(request('/api/jobs'),config,dependencies);assert.equal((await active.json()).jobId,job.jobId);assert.match(active.headers.get('cache-control')!,/no-store/);
 const busy=await handleApi(request('/api/publish','POST',{paperKey:paper.paperKey,draftSha:draft.blobSha}),config,dependencies);assert.equal(busy.status,409);assert.equal((await busy.json()).jobId,job.jobId);
 const history=await handleApi(request('/api/history'),config,dependencies);assert.deepEqual((await history.json()).items.map((item:ReleaseManifest)=>item.releaseId),[priorId]);
 const beforeInvalid=github.requests.length;assert.equal((await handleApi(request('/api/jobs?jobId=../private'),config,dependencies)).status,400);assert.equal(github.requests.length,beforeInvalid);
});
