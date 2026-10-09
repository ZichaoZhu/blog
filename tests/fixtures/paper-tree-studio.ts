import { createHash, generateKeyPairSync } from 'node:crypto';
import type { AuthorConfig } from '../../studio/src/server/config';
import type { PaperCatalog, PaperRef } from '../../scripts/paper-trees/catalog';
const keys=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
export const authorConfig:AuthorConfig={appId:'1',clientId:'Iv.test',clientSecret:'test-client-secret',privateKey:keys.privateKey,installationId:'2',ownerUserId:'12345',sessionSecret:'test-session-secret-'.repeat(4),origin:'https://studio.example.com',dataRepo:'owner/private-trees',dataBranch:'main',blogRepo:'owner/blog',blogBranch:'feat/astro-firefly'};
export const paper:PaperRef={id:'论文/强化学习',paperKey:createHash('sha256').update('论文/强化学习').digest('hex'),slug:'fixture-paper',title:'Private Catalog Sentinel',visibility:'published',contentKind:'note',hasBody:true};
export const catalog:PaperCatalog={codeSha:'c'.repeat(40),papers:[paper]};
export function gitBlob(text:string):string{return createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0${text}`).digest('hex');}
export class FakeGitHub {
 head='a'.repeat(40);treeSha='b'.repeat(40);counter=0;
 commits=new Map<string,{tree:string;parent:string|null}>([[this.head,{tree:this.treeSha,parent:null}]]);
 trees=new Map<string,Map<string,string>>([[this.treeSha,new Map()]]);
 requests:{url:string;method:string;body:any}[]=[];
 beforePatch:(()=>void)|null=null;
 errorStatus:number|null=null;
 fetch:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));const method=init?.method??'GET';const body=typeof init?.body==='string'?JSON.parse(init.body):null;this.requests.push({url:url.href,method,body});
  if(url.pathname==='/app/installations/2/access_tokens')return Response.json({token:'server-only-installation-token',expires_at:new Date(Date.now()+3600000).toISOString()});
  if(this.errorStatus)return Response.json({secret:'provider-private-error'}, {status:this.errorStatus});
  const path=url.pathname.replace('/repos/owner/private-trees','');
  if(path==='/git/ref/heads/main')return Response.json({object:{sha:this.head}});
  if(path.startsWith('/git/commits/')&&method==='GET'){const commit=this.commits.get(path.split('/').at(-1)!);return Response.json({tree:{sha:commit?.tree},parents:commit?.parent?[{sha:commit.parent}]:[]});}
  if(path.startsWith('/contents/')){const file=path.slice('/contents/'.length).split('/').map(decodeURIComponent).join('/');const ref=url.searchParams.get('ref')!;const head=this.commits.get(ref);const text=head&&this.trees.get(head.tree)?.get(file);return text===undefined?Response.json({message:'missing'},{status:404}):Response.json({type:'file',encoding:'base64',sha:gitBlob(text),content:Buffer.from(text).toString('base64')});}
  if(path==='/git/trees'&&method==='POST'){const sha=this.sha();const files=new Map(this.trees.get(body.base_tree));for(const file of body.tree)files.set(file.path,file.content);this.trees.set(sha,files);return Response.json({sha});}
  if(path==='/git/commits'&&method==='POST'){const sha=this.sha();this.commits.set(sha,{tree:body.tree,parent:body.parents[0]});return Response.json({sha});}
  if(path==='/git/refs/heads/main'&&method==='PATCH'){this.beforePatch?.();this.beforePatch=null;if(body.force!==false||this.commits.get(body.sha)?.parent!==this.head)return Response.json({message:'not fast forward'},{status:422});this.head=body.sha;this.treeSha=this.commits.get(this.head)!.tree;return Response.json({object:{sha:this.head}});}
  if(path==='/actions/workflows/publish.yml/dispatches')return new Response(null,{status:204});
  throw new Error('Unexpected fake GitHub request '+method+' '+url.href);
 };
 sha(){return createHash('sha1').update(String(++this.counter)).digest('hex');}
 files(){return this.trees.get(this.commits.get(this.head)!.tree)!;}
 advance(){const sha=this.sha();this.commits.set(sha,{tree:this.commits.get(this.head)!.tree,parent:this.head});this.head=sha;}
}
