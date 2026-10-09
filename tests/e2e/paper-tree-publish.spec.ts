import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {createPaperTree} from '../../src/features/paper-trees/template';
import type {ReleaseJob} from '../../studio/src/server/release';
const paper={id:'private-publish-fixture',paperKey:'d'.repeat(64),slug:'private-publish-fixture',title:'Private Publish Fixture',visibility:'published',contentKind:'note',hasBody:true};
const path=`/studio/paper-trees/${paper.paperKey}/`;
async function mock(page:Page){
 let draft=createPaperTree(paper.id,'empty'),blobSha='e'.repeat(40),job:ReleaseJob|null=null,active=false,publishes=0;const snapshots:string[]=[];
 const old={schemaVersion:1,releaseId:randomUUID(),parentReleaseId:null,codeSha:'c'.repeat(40),createdAt:'2026-10-08T01:00:00.000Z',entries:{}};let history=[{...old,releaseId:randomUUID(),parentReleaseId:old.releaseId,createdAt:'2026-10-09T01:00:00.000Z'},old];
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname==='/api/session')return route.fulfill({json:{authenticated:true,csrfToken:'a'.repeat(48),expiresAt:Math.floor(Date.now()/1000)+7200}});
  if(url.pathname==='/api/papers')return route.fulfill({json:{codeSha:'c'.repeat(40),papers:[paper]}});
  if(url.pathname==='/api/draft'){if(request.method()==='PUT'){draft=request.postDataJSON().draft;blobSha=(blobSha==='e'.repeat(40)?'f':'e').repeat(40);}return route.fulfill({json:{draft,blobSha}});}
  if(url.pathname==='/api/history')return route.fulfill({json:{items:history,cursor:null}});
  if(url.pathname==='/api/jobs')return route.fulfill({json:url.searchParams.has('jobId')?job:active?job:null});
  if(url.pathname==='/api/publish'||url.pathname==='/api/rollback'){
   if(active)return route.fulfill({status:409,json:{error:'RELEASE_BUSY',message:'已有发布任务。',jobId:job?.jobId}});
   publishes++;active=true;job={jobId:randomUUID(),releaseId:randomUUID(),codeSha:'c'.repeat(40),state:'queued',createdAt:new Date().toISOString(),mode:url.pathname.endsWith('rollback')?'rollback':'tree'};
   if(job.mode==='tree'){expect(request.postDataJSON().draftSha).toBe(blobSha);snapshots.push(draft.tree.nodeData.topic);}
   return route.fulfill({status:202,json:job});
  }
  return route.fulfill({status:404,json:{error:'NOT_FOUND'}});
 });
 return {get publishes(){return publishes;},snapshots,get draft(){return draft;},finish(state:'published'|'failed'){if(!job)return;job={...job,state,...(state==='failed'?{error:{code:'BUILD_FAILED',message:'候选构建失败，线上版本保持不变。'}}:{deploymentId:'dpl_candidate'})};active=false;if(state==='published')history=[{...old,releaseId:job.releaseId,parentReleaseId:history[0].releaseId,createdAt:job.createdAt},...history];}};
}
test('preview exposes exactly the projected tree, publication saves and freezes while later changes remain private',async({page})=>{
 const state=await mock(page);await page.goto(path);await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();await page.getByLabel('节点标题',{exact:true}).fill('Frozen Public');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();
 await page.getByRole('button',{name:'预览公开版',exact:true}).click();await expect(page.getByRole('dialog',{name:'论文解析树公开预览'})).toContainText('所有节点标题与说明');await expect(page.getByRole('list',{name:'将公开的节点大纲'})).toContainText('Frozen Public');await page.getByRole('button',{name:'关闭公开预览',exact:true}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'手动发布解析树',exact:true}).click();await expect(page.getByRole('status',{name:'发布状态'})).toContainText('等待发布');expect(state.publishes).toBe(1);expect(state.snapshots).toEqual(['Frozen Public']);await expect(page.getByRole('button',{name:'手动发布解析树',exact:true})).toBeDisabled();
 await page.getByLabel('节点标题',{exact:true}).fill('Newer Private');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();await expect(page.getByRole('status',{name:'草稿保存状态'})).toContainText('未保存');state.finish('published');await expect(page.getByRole('status',{name:'发布状态'})).toContainText('已发布');expect(state.snapshots).toEqual(['Frozen Public']);await expect(page.getByLabel('节点标题',{exact:true})).toHaveValue('Newer Private');
});
test('preview applies pending title, note and link without a remote save and matches the published version',async({page})=>{
 const state=await mock(page);await page.goto(path);await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 const before=JSON.stringify(state.draft);
 await page.getByLabel('节点标题',{exact:true}).fill('Pending Public Title');await page.getByLabel('节点说明',{exact:true}).fill('Pending Public Note');await page.getByLabel('节点链接',{exact:true}).fill('https://example.com/pending');
 await page.getByRole('button',{name:'预览公开版',exact:true}).click();const outline=page.getByRole('list',{name:'将公开的节点大纲'});
 await expect(outline).toContainText('Pending Public Title');await expect(outline).toContainText('Pending Public Note');await expect(outline).toContainText('https://example.com/pending');expect(JSON.stringify(state.draft)).toBe(before);
 await page.getByRole('button',{name:'关闭公开预览',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'手动发布解析树',exact:true}).click();await expect.poll(()=>state.publishes).toBe(1);expect(state.snapshots).toEqual(['Pending Public Title']);expect(state.draft.tree.nodeData.note).toBe('Pending Public Note');
});
test('active jobs resume after reload and a failed attempt can be retried, rollback does not change draft data',async({page})=>{
 const state=await mock(page);await page.goto(path);await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'手动发布解析树',exact:true}).click();await expect(page.getByRole('status',{name:'发布状态'})).toContainText('等待发布');await page.reload();await expect(page.getByRole('status',{name:'发布状态'})).toContainText('等待发布');expect(state.publishes).toBe(1);
 state.finish('failed');await expect(page.getByRole('status',{name:'发布状态'})).toContainText('发布失败');await expect(page.getByRole('button',{name:'手动发布解析树',exact:true})).toBeEnabled();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'手动发布解析树',exact:true}).click();await expect.poll(()=>state.publishes).toBe(2);state.finish('published');await expect(page.getByRole('status',{name:'发布状态'})).toContainText('已发布');
 const before=JSON.stringify(state.draft);await expect(page.getByRole('heading',{name:'全站解析树成功版本历史'})).toBeVisible();page.once('dialog',dialog=>{expect(dialog.message()).toContain('私人草稿');expect(dialog.message()).toContain('所有论文');expect(dialog.message()).toContain('不只当前论文');void dialog.accept();});await page.getByRole('button',{name:/回退到/}).first().click();await expect(page.getByRole('status',{name:'发布状态'})).toContainText('等待发布');expect(JSON.stringify(state.draft)).toBe(before);
});
test('anonymous users have no preview, history or publishing controls',async({page})=>{
 await page.route('**/api/session',route=>route.fulfill({json:{authenticated:false}}));await page.goto(path);await expect(page.getByRole('link',{name:'使用 GitHub 登录'})).toBeVisible();await expect(page.getByRole('button',{name:'手动发布解析树'})).toHaveCount(0);await expect(page.getByText('成功版本历史')).toHaveCount(0);
});
