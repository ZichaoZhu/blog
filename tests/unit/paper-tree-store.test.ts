import assert from 'node:assert/strict';
import test from 'node:test';
import { GitHubTreeStore } from '../../studio/src/server/github-store';
import { handleApi } from '../../studio/src/server/api';
import { signSession } from '../../studio/src/server/auth';
import { createPaperTree } from '../../src/features/paper-trees/template';
import { authorConfig as config, catalog, FakeGitHub, paper } from '../fixtures/paper-tree-studio';
const session={userId:config.ownerUserId,expiresAt:Math.floor(Date.now()/1000)+7200,csrfToken:'a'.repeat(48)};
function req(path:string,method='GET',body?:unknown,authenticated=true){return new Request(config.origin+path,{method,headers:{...(authenticated?{cookie:`__Host-paper-tree-session=${signSession(session,config.sessionSecret)}`} :{}),origin:config.origin,'X-CSRF-Token':session.csrfToken,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('private store creates, updates and rejects stale versions with non-force atomic commits',async()=>{
 const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);const draft=createPaperTree(paper.id,'empty');
 const first=await store.saveDraft(paper,draft,null);assert.equal(first.value.paperId,paper.id);assert.match(first.blobSha,/^[a-f\d]{40}$/);
 const newer=structuredClone(draft);newer.tree.nodeData.topic='Updated';const second=await store.saveDraft(paper,newer,first.blobSha);assert.notEqual(second.blobSha,first.blobSha);
 await assert.rejects(store.saveDraft(paper,draft,first.blobSha),{code:'VERSION_CONFLICT'});
 assert.equal(JSON.parse(github.files().get(`drafts/${paper.paperKey}.json`)!).tree.nodeData.topic,'Updated');
 const refRequests=github.requests.filter(r=>r.method==='PATCH');assert.equal(refRequests.length,2);assert.ok(refRequests.every(r=>r.body.force===false));
 const token=github.requests.find(r=>r.url.includes('/access_tokens'))!;assert.deepEqual(token.body,{repositories:['private-trees'],permissions:{contents:'write',actions:'write'}});
});
test('two simultaneous draft saves and a concurrent unrelated ref update cannot overwrite current data',async()=>{
 const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);const draft=createPaperTree(paper.id,'empty');
 const saved=await store.saveDraft(paper,draft,null);
 const left=structuredClone(draft),right=structuredClone(draft);left.tree.nodeData.topic='Left';right.tree.nodeData.topic='Right';
 const result=await Promise.allSettled([store.saveDraft(paper,left,saved.blobSha),store.saveDraft(paper,right,saved.blobSha)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);const rejected=result.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.code,'VERSION_CONFLICT');
 const base=await store.getHead();github.beforePatch=()=>github.advance();await assert.rejects(store.commitFiles(base,{'control.json':'{}'}),{code:'VERSION_CONFLICT'});assert.equal(github.files().has('control.json'),false);
});
test('provider failures preserve drafts and do not expose response contents or credentials',async()=>{
 const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);const draft=createPaperTree(paper.id,'empty');const saved=await store.saveDraft(paper,draft,null);const before=github.files().get(`drafts/${paper.paperKey}.json`);
 for(const status of [401,403,429,500]){github.errorStatus=status;await assert.rejects(store.saveDraft(paper,draft,saved.blobSha),error=>{assert.doesNotMatch(String(error),/provider-private|installation-token/);return true;});assert.equal(github.files().get(`drafts/${paper.paperKey}.json`),before);}
 await assert.rejects(new GitHubTreeStore(config,async()=>{throw new Error('secret-network-content');}).getHead(),error=>{assert.doesNotMatch(String(error),/secret-network/);return true;});
});
test('API authenticates before storage, validates stable hashed IDs and returns private conflict responses',async()=>{
 const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);const dependencies={catalog,store};const draft=createPaperTree(paper.id,'empty');
 assert.equal((await handleApi(req('/api/papers','GET',undefined,false),config,dependencies)).status,401);assert.equal(github.requests.length,0);
 const list=await handleApi(req('/api/papers'),config,dependencies);assert.equal((await list.json()).papers[0].paperKey,paper.paperKey);
 for(const key of ['../secret','%2e%2e%2fsecret','x'.repeat(64),'a'.repeat(64)])assert.equal((await handleApi(req('/api/draft?paperKey='+encodeURIComponent(key)),config,dependencies)).status,404);
 assert.equal(github.requests.length,0);
 const wrong={...draft,paperId:'forged'};assert.equal((await handleApi(req('/api/draft?paperKey='+paper.paperKey,'PUT',{draft:wrong,expectedBlobSha:null}),config,dependencies)).status,400);
 const saved=await handleApi(req('/api/draft?paperKey='+paper.paperKey,'PUT',{draft,expectedBlobSha:null}),config,dependencies);assert.equal(saved.status,200);assert.match(saved.headers.get('cache-control')!,/no-store/);
 const version=await saved.json();const read=await handleApi(req('/api/draft?paperKey='+paper.paperKey),config,dependencies);assert.equal((await read.json()).blobSha,version.blobSha);
 const conflict=await handleApi(req('/api/draft?paperKey='+paper.paperKey,'PUT',{draft,expectedBlobSha:null}),config,dependencies);assert.equal(conflict.status,409);assert.equal((await conflict.json()).error,'VERSION_CONFLICT');
 assert.equal((await handleApi(req('/api/draft?paperKey='+paper.paperKey,'DELETE'),config,dependencies)).status,405);
 assert.equal((await handleApi(req('/api/unknown'),config,dependencies)).status,404);
});
test('store rejects arbitrary paths and invalid graph IDs before GitHub requests',async()=>{
 const github=new FakeGitHub();const store=new GitHubTreeStore(config,github.fetch);
 for(const path of ['../drafts/private.json','drafts/%2e%2e.json','arbitrary.json'])await assert.rejects(store.getFile(path,'a'.repeat(40)));
 await assert.rejects(store.saveDraft({...paper,paperKey:'../unsafe'},createPaperTree(paper.id,'empty'),null));assert.equal(github.requests.length,0);
});
test('oversized requests and provider responses are rejected without copying private content into errors',async()=>{
 const github=new FakeGitHub();const dependencies={catalog,store:new GitHubTreeStore(config,github.fetch)};
 const response=await handleApi(req('/api/draft?paperKey='+paper.paperKey,'PUT',{draft:'private-marker'.repeat(100000),expectedBlobSha:null}),config,dependencies);
 assert.equal(response.status,413);assert.doesNotMatch(await response.text(),/private-marker/);assert.equal(github.requests.length,0);
 const store=new GitHubTreeStore(config,async()=>new Response('x'.repeat(2*1024*1024+1)));
 await assert.rejects(store.getHead(),{code:'GITHUB_RESPONSE_TOO_LARGE'});
});
