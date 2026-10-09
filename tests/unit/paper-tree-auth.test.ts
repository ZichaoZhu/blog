import assert from 'node:assert/strict';
import test from 'node:test';
import { handleApi } from '../../studio/src/server/api';
import { readSession, requireAuthor, signSession } from '../../studio/src/server/auth';
import { readAuthorConfig, type AuthorConfig } from '../../studio/src/server/config';

const config:AuthorConfig={appId:'1',clientId:'Iv.test',clientSecret:'private-test-client-secret',privateKey:'private-test-key',installationId:'2',ownerUserId:'12345',sessionSecret:'test-session-secret-'.repeat(4),origin:'https://studio.example.com',dataRepo:'owner/private-trees',dataBranch:'main',blogRepo:'owner/blog',blogBranch:'feat/astro-firefly'};
const session={userId:config.ownerUserId,expiresAt:Math.floor(Date.now()/1000)+7200,csrfToken:'a'.repeat(48)};
function request(path:string, options:RequestInit={}){return new Request(config.origin+path,options);}
function cookie(value=signSession(session,config.sessionSecret)){return `__Host-paper-tree-session=${value}`;}
function writes(extra:Record<string,string>={}){return {cookie:cookie(),origin:config.origin,'X-CSRF-Token':session.csrfToken,...extra};}

test('only the signed numeric owner can read and write, with exact origin and CSRF',()=>{
 assert.equal(requireAuthor(request('/api/papers',{headers:{cookie:cookie()}}),config,false).userId,'12345');
 assert.equal(requireAuthor(request('/api/draft',{method:'PUT',headers:writes()}),config,true).csrfToken,session.csrfToken);
 for(const s of [{...session,userId:'999'},{...session,expiresAt:1}])assert.equal(readSession(request('/api/session',{headers:{cookie:cookie(signSession(s,config.sessionSecret))}}),config),null);
 assert.equal(readSession(request('/api/session',{headers:{cookie:cookie(signSession(session,config.sessionSecret)+'tampered')}}),config),null);
 assert.equal(readSession(request('/api/session',{headers:{cookie:cookie()}}),{...config,sessionSecret:'rotated-secret'.repeat(4)}),null);
 for(const headers of [{cookie:cookie()},writes({'X-CSRF-Token':'bad'}),writes({origin:'https://evil.example'})])assert.throws(()=>requireAuthor(request('/api/draft',{method:'PUT',headers}),config,true));
});

test('anonymous session and logout never expose tokens and are not cached',async()=>{
 const anonymous=await handleApi(request('/api/session'),config);
 assert.deepEqual(await anonymous.json(),{authenticated:false});assert.match(anonymous.headers.get('cache-control')! ,/no-store/);
 const author=await handleApi(request('/api/session',{headers:{cookie:cookie()}}),config);
 assert.deepEqual(await author.json(),{authenticated:true,csrfToken:session.csrfToken,expiresAt:session.expiresAt});
 assert.equal((await handleApi(request('/api/logout',{method:'POST'}),config)).status,401);
 const logout=await handleApi(request('/api/logout',{method:'POST',headers:writes()}),config);
 assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie')!,/__Host-paper-tree-session=;.*Max-Age=0/);assert.match(logout.headers.get('set-cookie')!,/HttpOnly; Secure; SameSite=Lax/);
});

test('OAuth state is browser bound and redirects only to validated local workspace paths',async()=>{
 for(const returnTo of ['https://evil.example','//evil.example','/%2f%2fevil.example','/studio/paper-trees/%2f%2fevil.example','/studio/paper-trees/../api/logout']){
  const response=await handleApi(request('/api/auth/login?returnTo='+encodeURIComponent(returnTo)),config);assert.equal(response.status,400);
 }
 const target='/studio/paper-trees/'+'f'.repeat(64)+'/';
 const login=await handleApi(request('/api/auth/login?returnTo='+encodeURIComponent(target)),config);
 assert.equal(login.status,302);const location=new URL(login.headers.get('location')!);assert.equal(location.origin,'https://github.com');
 const state=location.searchParams.get('state')!;const stateCookie=login.headers.get('set-cookie')!.split(';')[0];
 assert.match(login.headers.get('set-cookie')!,/Max-Age=300; Path=\/; HttpOnly; Secure; SameSite=Lax/);
 for(const suffix of ['?code=ok','?code=ok&state=bad',`?code=ok&state=${state}`]){
  assert.equal((await handleApi(request('/api/auth/callback'+suffix),config)).status,400);
 }
 let calls=0;
 const fetchImpl:typeof fetch=async(input,init)=>{
  calls++;
  if(String(input)==='https://github.com/login/oauth/access_token'){assert.equal(init?.method,'POST');return Response.json({access_token:'server-only-oauth-token'});}
  assert.equal(String(input),'https://api.github.com/user');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer server-only-oauth-token');return Response.json({id:12345,login:'name-can-change'});
 };
 const callback=await handleApi(request(`/api/auth/callback?code=ok&state=${state}`,{headers:{cookie:stateCookie}}),config,{fetchImpl});
 assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),target);assert.equal(calls,2);
 const result=callback.headers.get('set-cookie')!;assert.match(result,/__Host-paper-tree-session=/);assert.doesNotMatch(result,/server-only-oauth-token/);
 assert.equal(await callback.text(),'');
});

test('other GitHub users, stale state and failed exchanges never receive an author session',async()=>{
 const login=await handleApi(request('/api/auth/login'),config);const state=new URL(login.headers.get('location')!).searchParams.get('state')!;const stateCookie=login.headers.get('set-cookie')!.split(';')[0];
 const req=()=>request(`/api/auth/callback?code=ok&state=${state}`,{headers:{cookie:stateCookie}});
 const denied=await handleApi(req(),config,{fetchImpl:async(input)=>Response.json(String(input).includes('access_token')?{access_token:'private-oauth'}:{id:999,login:'owner'})});
 assert.equal(denied.status,403);assert.doesNotMatch(denied.headers.get('set-cookie')??'',/__Host-paper-tree-session=[^;]/);assert.doesNotMatch(await denied.text(),/private-oauth/);
 const failed=await handleApi(req(),config,{fetchImpl:async()=>Response.json({error:'bad_code',private:'secret-provider-content'},{status:500})});assert.equal(failed.status,502);assert.doesNotMatch(await failed.text(),/secret-provider/);
 const stale=await handleApi(req(),config,{now:()=>Date.now()+301000});assert.equal(stale.status,400);
});

test('configuration rejects incomplete credentials, arbitrary origins and unsafe repository refs',()=>{
 assert.throws(()=>readAuthorConfig({}));
 const env={GITHUB_APP_ID:'1',GITHUB_APP_CLIENT_ID:'client',GITHUB_APP_CLIENT_SECRET:'secret',GITHUB_APP_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',GITHUB_APP_INSTALLATION_ID:'2',AUTHOR_GITHUB_USER_ID:'12345',AUTHOR_SESSION_SECRET:'x'.repeat(64),AUTHOR_ORIGIN:config.origin,PAPER_TREE_DATA_REPO:config.dataRepo,PAPER_TREE_DATA_BRANCH:'main',BLOG_SOURCE_REPO:config.blogRepo,BLOG_SOURCE_BRANCH:config.blogBranch};
 assert.equal(readAuthorConfig(env).ownerUserId,'12345');
 for(const patch of [{AUTHOR_ORIGIN:'http://evil.example'},{AUTHOR_ORIGIN:'https://studio.example.com/path'},{PAPER_TREE_DATA_REPO:'../private'},{PAPER_TREE_DATA_BRANCH:'../main'},{AUTHOR_GITHUB_USER_ID:'owner-name'}])assert.throws(()=>readAuthorConfig({...env,...patch}));
});
