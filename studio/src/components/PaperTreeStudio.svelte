<script lang="ts">
 import {onMount,tick} from 'svelte';
 import PaperTreeCanvas from '../../../src/features/paper-trees/PaperTreeCanvas.svelte';
 import {flattenTree,importDraft,validateDraft,type DraftTree,type TreeData,type TreeCommand} from '../../../src/features/paper-trees/model';
 import {createPaperTree} from '../../../src/features/paper-trees/template';
 import type {PaperRef} from '../../../scripts/paper-trees/catalog';
 import {ClientError,forgetSession,getSession,getPapers,getDraft,saveDraft,logout,type ClientSession} from '../client/api';

 let {paperKey}: {paperKey?:string}=$props();
 let session=$state<ClientSession|null>(null);
 let papers=$state<PaperRef[]>([]);
 let paper=$state<PaperRef|null>(null);
 let draft=$state<DraftTree|null>(null);
 let blobSha:string|null=null;
 let canvas=$state<PaperTreeCanvas|undefined>();
 let loaded=$state(false),saving=$state(false),error=$state(''),conflict=$state(false),message=$state('');
 let revision=$state(0),savedRevision=$state(0),pending=$state(false),selectedId=$state('');
 let title=$state(''),note=$state(''),link=$state(''),parentId=$state('');
 let generation=0;
 const nodes=$derived(draft?flattenTree(draft.tree):[]);
 const selected=$derived(nodes.find(entry=>entry.node.id===selectedId));
 const dirty=$derived(revision!==savedRevision||pending);
 const descendants=$derived(selected?new Set(flattenTree({nodeData:selected.node,direction:1}).map(entry=>entry.node.id)):new Set<string>());
 const parents=$derived(nodes.filter(entry=>!descendants.has(entry.node.id)));
 const returnTo=$derived(`/studio/paper-trees/${paperKey?paperKey+'/':''}`);

 function showError(reason:unknown){error=reason instanceof Error?reason.message:'操作未完成，请重试。';conflict=reason instanceof ClientError&&reason.code==='VERSION_CONFLICT';}
 function fields(){const current=nodes.find(entry=>entry.node.id===selectedId);if(!current)return;title=current.node.topic;note=current.node.note??'';link=current.node.hyperLink??'';parentId=current.parentId??'';pending=false;}
 function change(tree:TreeData){if(!draft)return;draft={...draft,tree};revision++;if(!nodes.some(entry=>entry.node.id===selectedId))selectedId=tree.nodeData.id;if(!pending)fields();message='';}
 async function applyNode():Promise<boolean>{
  if(!pending)return true;
  try{if(!canvas||!selectedId)throw new Error('请先选择节点。');await canvas.command({type:'edit',nodeId:selectedId,patch:{topic:title,note,hyperLink:link}});pending=false;fields();error='';return true;}catch(reason){showError(reason);return false;}
 }
 async function selectNode(id:string){if(!await applyNode())return;selectedId=id;fields();}
 async function replace(value:DraftTree|null,saved:boolean){
  draft=value?validateDraft(value,value.paperId):null;selectedId=draft?.tree.nodeData.id??'';pending=false;
  revision=saved?0:revision+1;savedRevision=saved?0:savedRevision;
  await tick();if(draft)canvas?.replaceData(draft.tree);fields();
 }
 async function loadDraft(confirmDiscard=false){
  if(!paper||confirmDiscard&&dirty&&!confirm('当前修改尚未保存。确定重新加载草稿并放弃这些修改吗？'))return;
  const epoch=generation;
  try{const saved=await getDraft(paper.paperKey);if(epoch!==generation)return;blobSha=saved?.blobSha??null;await replace(saved?.value??null,true);conflict=false;error='';message=saved?'已载入私人草稿':'';}catch(reason){if(epoch===generation)showError(reason);}
 }
 async function create(mode:'empty'|'template'){if(!paper)return;await replace(createPaperTree(paper.id,mode),false);message='私人草稿尚未保存。';}
 async function execute(action:TreeCommand){
  if(!await applyNode()||!canvas)return;
  const ids=new Set(nodes.map(entry=>entry.node.id));
  try{await canvas.command(action);error='';if(['addChild','addSibling','clone'].includes(action.type)){const added=nodes.find(entry=>!ids.has(entry.node.id));if(added)selectedId=added.node.id;}fields();}catch(reason){showError(reason);}
 }
 async function remove(){if(!selected?.parentId)return;const count=flattenTree({nodeData:selected.node,direction:1}).length;if(confirm(`删除「${selected.node.topic}」及其子树，共 ${count} 个节点？删除后可撤销。`))await execute({type:'remove',nodeId:selectedId});}
 async function shift(direction:number){if(!selected?.parentId)return;const siblings=nodes.find(entry=>entry.node.id===selected.parentId)?.node.children??[];const index=siblings.findIndex(node=>node.id===selectedId);const target=index+direction;if(target<0||target>=siblings.length)return;await execute({type:'move',nodeId:selectedId,parentId:selected.parentId,index:target});}
 async function save(){
  if(saving||!paper||!draft||!await applyNode())return;
  const epoch=generation,version=revision,value=validateDraft(draft,paper.id),expected=blobSha;
  saving=true;error='';conflict=false;message='';
  try{const saved=await saveDraft(paper.paperKey,value,expected);if(epoch!==generation)return;blobSha=saved.blobSha;savedRevision=version;if(draft)draft={...draft,updatedAt:saved.value.updatedAt};message=revision===version&&!pending?'已保存私人草稿':'已保存；仍有未保存修改';}
  catch(reason){if(epoch===generation)showError(reason);}
  finally{if(epoch===generation)saving=false;}
 }
 async function exportBackup(){
  if(!draft||!paper||!await applyNode())return;
  const value=validateDraft(draft,paper.id);const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`${paper.paperKey}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function importFile(event:Event){
  const input=event.currentTarget as HTMLInputElement;const file=input.files?.[0];
  if(!file||!paper)return;
  try{if(file.size>1024*1024)throw new Error('解析树文件超过 1 MiB。');const value=importDraft(JSON.parse(await file.text()),paper.id);if(confirm('导入将替换当前工作区内容，并生成新的节点 ID。导入后需要另行保存。确定导入吗？')){await replace(value,false);error='';message='已导入；尚未保存。';}}
  catch(reason){showError(reason);}finally{input.value='';}
 }
 async function signOut(){
  if(dirty&&!confirm('当前修改尚未保存。确定退出并丢弃这些修改吗？'))return;
  try{await logout();generation++;forgetSession();session={authenticated:false};papers=[];paper=null;draft=null;selectedId='';blobSha=null;pending=false;revision=0;savedRevision=0;saving=false;error='';message='';}catch(reason){showError(reason);}
 }
 onMount(()=>{
  let alive=true;const epoch=generation;
  void (async()=>{try{const current=await getSession();if(!alive||epoch!==generation)return;session=current;if(current.authenticated){const catalog=await getPapers();if(!alive||epoch!==generation)return;papers=catalog.papers.filter(item=>item.contentKind==='note'&&item.hasBody);paper=paperKey?papers.find(item=>item.paperKey===paperKey)??null:null;if(paperKey&&!paper)throw new Error('找不到该论文。');if(paper)await loadDraft();}}catch(reason){if(alive)showError(reason);}finally{if(alive)loaded=true;}})();
  const leave=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
  const keyboard=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();void save();}};
  window.addEventListener('beforeunload',leave);window.addEventListener('keydown',keyboard);
  return()=>{alive=false;generation++;forgetSession();window.removeEventListener('beforeunload',leave);window.removeEventListener('keydown',keyboard);};
 });
</script>

<section class="card-base studio-panel">
 <div class="studio-heading"><h1>{paper?.title??'论文解析树工作区'}</h1>{#if session?.authenticated}<button class="btn-plain knowledge-action" onclick={signOut}>退出登录</button>{/if}</div>
 {#if error}<p role="alert" class="studio-error">{error}</p>{/if}
 {#if !loaded}<p>正在加载工作区…</p>
 {:else if !session?.authenticated}<p>保存私人草稿，确认后手动发布。</p><a class="btn-regular knowledge-action" href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>使用 GitHub 登录</a>
 {:else if !paperKey}
  <p>选择一篇论文，创建或继续编辑私人解析树。</p><ul class="studio-papers">{#each papers as item}<li><a class="toc-item sidebar-nav-item" href={`/studio/paper-trees/${item.paperKey}/`}><span class="toc-label">{item.title}</span><span class="studio-small">{item.visibility==='published'?'公开文章':'非公开文章'}</span></a></li>{/each}</ul>
 {:else if paper}
  <div class="studio-actions"><a class="btn-plain knowledge-action" href="/studio/paper-trees/">‹ 返回工作区</a><span class="studio-small">保存私人草稿不会改变网站的公开版本。</span></div>
  {#if !draft}<div class="studio-actions"><button class="btn-regular knowledge-action" onclick={()=>create('template')}>从论文解析模板创建</button><button class="btn-plain knowledge-action" onclick={()=>create('empty')}>创建空树</button></div>
  {:else}
   <div class="studio-actions"><button class="btn-regular knowledge-action" disabled={saving} onclick={save}>保存私人草稿</button><button class="btn-plain knowledge-action" onclick={exportBackup}>导出备份</button><button class="btn-plain knowledge-action" onclick={()=>loadDraft(true)}>重新加载草稿</button><label class="btn-plain knowledge-action studio-import">导入 JSON<input type="file" accept=".json,application/json" aria-label="导入解析树 JSON" onchange={importFile}/></label></div>
   <p role="status" aria-live="polite">{saving?'保存中…':message||(dirty?'有未保存修改':'已保存私人草稿')}{conflict?' 请先导出备份，再手动重新加载。':''}</p>
   <div class="studio-editor-grid">
    <nav class="studio-outline" aria-label="编辑解析树大纲"><ol>{#each nodes as entry (entry.node.id)}<li><button data-outline-node class:active={entry.node.id===selectedId} class="toc-item sidebar-nav-item" style={`--node-depth:${Math.min(entry.depth,8)}`} onclick={()=>selectNode(entry.node.id)}><span class="toc-label">{entry.node.topic}</span></button></li>{/each}</ol></nav>
    <div class="studio-canvas"><PaperTreeCanvas tree={draft.tree} editable={true} bind:this={canvas} onchange={change} onselect={id=>void selectNode(id)}/></div>
    <div class="studio-node-editor"><h2>节点编辑</h2><label>节点标题<input aria-label="节点标题" maxlength="1000" bind:value={title} oninput={()=>pending=true}/></label><label>节点说明<textarea aria-label="节点说明" maxlength="20000" rows="7" bind:value={note} oninput={()=>pending=true}></textarea></label><label>节点链接<input aria-label="节点链接" type="url" bind:value={link} oninput={()=>pending=true}/></label><button class="btn-regular knowledge-action" onclick={applyNode}>应用节点修改</button>
     <div class="studio-actions"><button class="btn-plain knowledge-action" onclick={()=>execute({type:'addChild',nodeId:selectedId})}>添加子节点</button><button class="btn-plain knowledge-action" disabled={!selected?.parentId} onclick={()=>execute({type:'addSibling',nodeId:selectedId})}>添加同级节点</button><button class="btn-plain knowledge-action" disabled={!selected?.parentId} onclick={()=>execute({type:'clone',nodeId:selectedId})}>复制子树</button><button class="btn-plain knowledge-action" disabled={!selected?.parentId} onclick={remove}>删除子树</button><button class="btn-plain knowledge-action" disabled={!selected?.parentId} onclick={()=>shift(-1)}>上移</button><button class="btn-plain knowledge-action" disabled={!selected?.parentId} onclick={()=>shift(1)}>下移</button></div>
     <label>新的父节点<select aria-label="新的父节点" bind:value={parentId} disabled={!selected?.parentId}>{#each parents as entry}<option value={entry.node.id}>{entry.node.topic}</option>{/each}</select></label><button class="btn-plain knowledge-action" disabled={!selected?.parentId||!parentId} onclick={()=>execute({type:'move',nodeId:selectedId,parentId,index:0})}>移动到该父节点</button>
     <div class="studio-actions"><button class="btn-plain knowledge-action" onclick={()=>execute({type:'undo'})}>撤销修改</button><button class="btn-plain knowledge-action" onclick={()=>execute({type:'redo'})}>重做修改</button></div>
    </div>
   </div>
  {/if}
 {/if}
</section>
<style>
 .studio-panel{padding:1.25rem;min-width:0}.studio-heading,.studio-actions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem}.studio-heading{justify-content:space-between}.studio-heading h1{min-width:0;overflow-wrap:anywhere}.studio-small{font-size:var(--type-small);color:var(--meta-content-color)}.studio-error{color:var(--deep-text);padding:.75rem;border:1px solid var(--primary);border-radius:.75rem}.studio-papers{display:grid;gap:.5rem}.studio-import{position:relative;cursor:pointer}.studio-import input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.studio-editor-grid{display:grid;grid-template-columns:1fr;gap:1rem;min-width:0}.studio-outline,.studio-node-editor,.studio-canvas{min-width:0}.studio-outline{max-height:24rem;overflow:auto}.studio-outline button{width:100%;padding-left:calc(.5rem + var(--node-depth)*.45rem);text-align:left}.studio-node-editor{display:flex;flex-direction:column;gap:.75rem}.studio-node-editor label{display:flex;flex-direction:column;gap:.25rem;font-size:var(--type-small)}.studio-node-editor input,.studio-node-editor textarea,.studio-node-editor select{width:100%;min-width:0;padding:.6rem;border:1px solid var(--line-divider);background:var(--card-bg);color:var(--deep-text);border-radius:.5rem;font-size:var(--type-body)}.studio-node-editor textarea{resize:vertical}.studio-actions button{white-space:normal}button:disabled{opacity:.45;cursor:not-allowed}input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--primary);outline-offset:2px}@media(min-width:1200px){.studio-editor-grid{grid-template-columns:14rem minmax(0,1fr) 18rem}.studio-outline{max-height:42rem}}
</style>
