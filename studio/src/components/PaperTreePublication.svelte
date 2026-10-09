<script lang="ts">
 import {onMount} from 'svelte';
 import PaperTreeCanvas from '../../../src/features/paper-trees/PaperTreeCanvas.svelte';
 import {flattenTree,toPublicSnapshot,type DraftTree,type TreeData,type ReleaseManifest} from '../../../src/features/paper-trees/model';
 import type {PaperRef} from '../../../scripts/paper-trees/catalog';
 import type {Versioned} from '../server/github-store';
 import type {ReleaseJob,JobState} from '../server/release';
 import {getActiveJob,getJob,getHistory,requestPublish,requestRollback} from '../client/api';
 import {renderNodeMarkdown} from '../../../src/features/paper-trees/render';
 interface Props {paper:PaperRef;draft:DraftTree;save:()=>Promise<Versioned<DraftTree>|undefined>;onfreeze:(value:boolean)=>void;disabled:boolean}
 let {paper,draft,save,onfreeze,disabled}:Props=$props();
 let job=$state<ReleaseJob|null>(null),locked=$state(false),requesting=$state(false),error=$state('');
 let history=$state<ReleaseManifest[]>([]),cursor=$state<string|null>(null),initializing=$state(true),historyLoading=$state(false);
 let preview=$state<TreeData|null>(null),dialog=$state<HTMLDialogElement>();
 let alive=true,timer:ReturnType<typeof setTimeout>|undefined;
 const labels:Record<JobState,string>={queued:'等待发布',building:'构建中',validating:'校验中',deploying:'部署中',published:'已发布',failed:'发布失败'};
 function date(value:string){return new Date(value).toLocaleString('zh-CN');}
 function failure(reason:unknown){error=reason instanceof Error?reason.message:'发布请求未完成，请稍后重试。';}
 async function loadHistory(more=false){historyLoading=true;try{const result=await getHistory(more?cursor:null);if(!alive)return;history=more?[...history,...result.items]:result.items;cursor=result.cursor;}catch(reason){if(alive)failure(reason);}finally{if(alive)historyLoading=false;}}
 function schedule(){clearTimeout(timer);if(alive&&locked)timer=setTimeout(()=>void poll(),3000);}
 async function poll(){
  if(!alive)return;
  if(document.hidden){schedule();return;}
  try{if(job)job=await getJob(job.jobId);if(!alive)return;error='';if(job&&['published','failed'].includes(job.state)){const active=await getActiveJob();if(!alive)return;locked=!!active;if(active)job=active;else await loadHistory();}}catch(reason){if(alive)failure(reason);}finally{schedule();}
 }
 async function restore(){try{const current=await getActiveJob();if(!alive)return;job=current;locked=!!current;await loadHistory();}catch(reason){if(alive)failure(reason);}finally{if(alive){initializing=false;schedule();}}}
 function openPreview(){try{const projected=toPublicSnapshot(draft,crypto.randomUUID(),new Date().toISOString());dialog?.showModal();preview=projected.tree;error='';}catch(reason){failure(reason);}}
 async function publish(){
  if(requesting||locked||disabled||initializing)return;
  if(!confirm('所有节点标题、说明和链接都会公开。发布当前保存的解析树吗？后续编辑会保留为新的私人草稿。'))return;
  requesting=true;onfreeze(true);error='';
  try{const saved=await save();if(!alive)return;if(!saved)throw new Error('草稿尚未成功保存，未创建发布任务。');job=await requestPublish(paper.paperKey,saved.blobSha);if(!alive)return;locked=!!await getActiveJob();schedule();}
  catch(reason){if(alive){failure(reason);const current=await getActiveJob().catch(()=>null);if(current){job=current;locked=true;schedule();}}}
  finally{if(alive){requesting=false;onfreeze(false);}}
 }
 async function rollback(releaseId:string){
  if(requesting||locked||initializing)return;
  if(!confirm('仅回退解析树的公开版本，当前私人草稿不会改变。确定回退吗？'))return;
  requesting=true;error='';
  try{job=await requestRollback(releaseId);if(!alive)return;locked=!!await getActiveJob();schedule();}catch(reason){if(alive)failure(reason);}finally{if(alive)requesting=false;}
 }
 onMount(()=>{alive=true;void restore();const visible=()=>{if(!document.hidden&&locked)void poll();};document.addEventListener('visibilitychange',visible);return()=>{alive=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};});
</script>

<section class="publication-panel" aria-label="解析树公开版本">
 <h2>公开版本</h2><p class="publication-caption">私人草稿与公开版本分别保存。所有节点标题与说明，以及链接都将公开。</p>
 {#if error}<p role="alert">{error}</p>{/if}
 <div class="publication-actions"><button class="btn-plain knowledge-action" onclick={openPreview}>预览公开版</button><button class="btn-regular knowledge-action" disabled={requesting||locked||disabled||initializing||paper.visibility!=='published'} onclick={publish}>手动发布解析树</button></div>
 {#if paper.visibility!=='published'}<p class="publication-caption">文章尚未公开，解析树只能保存为私人草稿。</p>{/if}
 <p role="status" aria-label="发布状态" aria-live="polite">{requesting?'正在提交发布请求…':job?labels[job.state]:initializing?'正在读取发布状态…':'暂无活动发布'}{job?.error?`：${job.error.message}`:''}{locked&&job?.state==='failed'?' 发布结果正在核对，暂不能再次发布。':''}</p>
 <h2>成功版本历史</h2><ul>{#each history as release,index (release.releaseId)}<li class="publication-history"><span>{date(release.createdAt)}{index===0?' · 当前公开版':''}</span>{#if index>0}<button class="btn-plain knowledge-action" disabled={locked||requesting} onclick={()=>rollback(release.releaseId)}>回退到 {date(release.createdAt)}</button>{/if}</li>{/each}</ul>
 {#if !history.length&&!historyLoading}<p class="publication-caption">尚无成功发布的解析树版本。</p>{/if}
 {#if cursor}<button class="btn-plain knowledge-action" disabled={historyLoading} onclick={()=>loadHistory(true)}>更多成功版本</button>{/if}
</section>
<dialog bind:this={dialog} aria-label="论文解析树公开预览" onclose={()=>preview=null}>
 <div class="publication-actions"><h2>论文解析树公开预览</h2><button class="btn-plain knowledge-action" onclick={()=>dialog?.close()}>关闭公开预览</button></div><p>所有节点标题与说明，以及链接都将公开；预览不会保存或发布。</p>
 {#if preview}<PaperTreeCanvas tree={preview} editable={false}/><ol aria-label="将公开的节点大纲">{#each flattenTree(preview) as entry}<li class="paper-tree-richtext" style={`margin-left:${Math.min(entry.depth,8)*.4}rem`}><div>{@html renderNodeMarkdown(entry.node.topic)}</div>{#if entry.node.note}<div>{@html renderNodeMarkdown(entry.node.note)}</div>{/if}{#if entry.node.hyperLink}<p>{entry.node.hyperLink}</p>{/if}</li>{/each}</ol>{/if}
</dialog>
<style>
 .publication-panel{border-top:1px solid var(--line-divider);padding-top:1rem;margin-top:1rem}.publication-caption{font-size:var(--type-small);color:var(--meta-content-color);margin:.5rem 0}.publication-actions,.publication-history{display:flex;align-items:center;gap:.5rem;justify-content:space-between;flex-wrap:wrap}.publication-actions{margin:1rem 0}.publication-history{padding:.5rem 0;font-size:var(--type-small)}dialog{width:min(96rem,95vw);max-height:90vh;border:0;border-radius:var(--radius-large);padding:1.25rem;background:var(--card-bg);color:var(--deep-text);overflow:auto}dialog::backdrop{background:rgb(0 0 0/.25)}dialog ol{padding:.5rem;max-height:22rem;overflow:auto}dialog li{margin-bottom:.5rem;overflow-wrap:anywhere}button:disabled{opacity:.45;cursor:not-allowed}
</style>
