import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {VercelProvider} from '../../scripts/paper-trees/vercel';
import {randomUUID} from 'node:crypto';
import type {ReleaseJob} from '../../studio/src/server/release';
const job:ReleaseJob={jobId:randomUUID(),releaseId:randomUUID(),codeSha:'c'.repeat(40),createdAt:'2026-10-08T00:00:00.000Z',state:'queued',mode:'tree'};
const record={id:'dpl_candidate',url:'https://candidate.vercel.app',projectId:'prj_blog',codeSha:job.codeSha,releaseId:job.releaseId,jobId:job.jobId,readyState:'READY'};
test('Studio candidate and formal verification bind the same code, release and job without exposing a paper catalog',async()=>{
 let version={schemaVersion:1,codeSha:job.codeSha,releaseId:job.releaseId,jobId:job.jobId};
 const fetchImpl:typeof fetch=async(input,init)=>{const url=String(input);if(url.includes('candidate.vercel.app')&&!new Headers(init?.headers).has('x-vercel-protection-bypass'))return new Response('',{status:401});return Response.json(version,{headers:{'cache-control':'private, no-store'}});};
 const provider=new VercelProvider({role:'studio',root:'/unused',projectId:'prj_blog',teamId:'team_test',token:'private-token',bypass:'private-bypass',origin:'https://studio.blessingworld.cn'},fetchImpl,async()=>({stdout:''}));
 await provider.verifyCandidate(record,job,'/unused');await provider.verifyFormal(record,job);
 version={...version,codeSha:'f'.repeat(40)};await assert.rejects(provider.verifyFormal(record,job));
});
test('native provider rejects preview-only protection, anonymous JSON, stale receipt and foreign deployment URLs',async()=>{
 const inputDir=await mkdtemp(join(tmpdir(),'vercel-provider-'));await writeFile(join(inputDir,'release.json'),JSON.stringify({schemaVersion:1,releaseId:job.releaseId,codeSha:job.codeSha,createdAt:job.createdAt,parentReleaseId:null,entries:{}}));
 try {
 let protection='all_except_custom_domains',anonymousStatus=401,receipt={schemaVersion:1,releaseId:job.releaseId,codeSha:job.codeSha,publishedAt:job.createdAt};
 const requests:{url:string;init?:RequestInit}[]=[];
 const fetchImpl:typeof fetch=async(input,init)=>{const url=String(input);requests.push({url,init});if(url.includes('api.vercel.com/v9/projects/'))return Response.json({id:'prj_blog',ssoProtection:{deploymentType:protection}});if(!new Headers(init?.headers).has('x-vercel-protection-bypass')&&url.includes('candidate.vercel.app'))return new Response('',{status:anonymousStatus});return Response.json(receipt,{headers:{'cache-control':'no-store'}});};
 const provider=new VercelProvider({root:'/unused',projectId:'prj_blog',teamId:'team_test',token:'private-token',bypass:'private-bypass',origin:'https://blog.blessingworld.cn'},fetchImpl,async()=>({stdout:'https://candidate.vercel.app'}));
 await provider.checkProtection();protection='preview';await assert.rejects(provider.checkProtection());protection='all_except_custom_domains';
 await provider.verifyCandidate(record,job,inputDir);anonymousStatus=200;await assert.rejects(provider.verifyCandidate(record,job,inputDir));anonymousStatus=401;
 receipt={...receipt,codeSha:'b'.repeat(40)};await assert.rejects(provider.verifyFormal(record,job));receipt={...receipt,codeSha:job.codeSha,releaseId:randomUUID()};await assert.rejects(provider.verifyFormal(record,job));
 await assert.rejects(provider.verifyCandidate({...record,url:'https://evil.test'},job,'/unused'));assert.equal(requests.some(r=>r.url.includes('evil.test')),false);
 assert.equal(requests.filter(r=>r.url.includes('api.vercel.com')).every(r=>new Headers(r.init?.headers).get('authorization')==='Bearer private-token'),true);
 assert.equal(requests.filter(r=>!r.url.includes('api.vercel.com')).every(r=>!new Headers(r.init?.headers).has('authorization')),true);
 }finally {await rm(inputDir,{recursive:true,force:true});}
});
