import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createPaperTree} from '../../src/features/paper-trees/template';
import type {DraftTree} from '../../src/features/paper-trees/model';
const paper={id:'private-editor-fixture',paperKey:'d'.repeat(64),slug:'private-editor-fixture',title:'Studio Private Fixture',visibility:'published',contentKind:'note',hasBody:true};
const path=`/studio/paper-trees/${paper.paperKey}/`;
async function mock(page:Page){
 let draft:DraftTree|null=null;let blobSha:string|null=null;let error=0;let delay:Promise<void>|null=null;let release:(()=>void)|null=null;
 await page.route('**/api/**',async route=>{
  const request=route.request();const url=new URL(request.url());const headers={'cache-control':'private, no-store'};
  if(url.pathname==='/api/session')return route.fulfill({json:{authenticated:true,csrfToken:'a'.repeat(48),expiresAt:Math.floor(Date.now()/1000)+7200},headers});
  if(url.pathname==='/api/papers')return route.fulfill({json:{codeSha:'c'.repeat(40),papers:[paper]},headers});
  if(url.pathname==='/api/logout')return route.fulfill({json:{authenticated:false},headers});
  if(url.pathname==='/api/draft'){
   if(request.method()==='GET')return route.fulfill({json:{draft,blobSha},headers});
   const body=request.postDataJSON();if(delay)await delay;
   if(error)return route.fulfill({status:error,json:{error:error===409?'VERSION_CONFLICT':'GITHUB_UNAVAILABLE',message:error===409?'草稿已有新版本，请先备份。':'保存失败，请稍后重试。'},headers});
   draft=body.draft;blobSha=(blobSha==='e'.repeat(40)?'f':'e').repeat(40);return route.fulfill({json:{draft,blobSha},headers});
  }
  return route.fulfill({status:404,json:{error:'NOT_FOUND'},headers});
 });
 return {get draft(){return draft;},seed(value:DraftTree){draft=value;blobSha='e'.repeat(40);},fail(value:number){error=value;},pause(){delay=new Promise(resolve=>release=resolve);},resume(){release?.();delay=null;}};
}
test('author creates a private template, edits nodes, saves with keyboard, reloads and logs out',async({page})=>{
 const state=await mock(page);await page.goto('/studio/paper-trees/');await page.getByRole('link',{name:paper.title}).click();await expect(page).toHaveURL(new RegExp(paper.paperKey));
 await page.getByRole('button',{name:'从论文解析模板创建',exact:true}).click();await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 await page.getByRole('button',{name:'Abstract',exact:true}).click();await page.getByLabel('节点标题', {exact:true}).fill('My Abstract');await page.getByLabel('节点说明',{exact:true}).fill('Private note $\\frac{1}{2}$');await page.getByLabel('节点链接',{exact:true}).fill('https://example.com/paper');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();
 await page.keyboard.press('ControlOrMeta+s');await expect(page.getByRole('status')).toContainText('已保存');expect(state.draft?.tree.nodeData.children?.[0].topic).toBe('My Abstract');
 await page.reload();await expect(page.getByRole('button',{name:'My Abstract',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'退出登录',exact:true}).click();await expect(page.locator('.paper-tree-canvas')).toHaveCount(0);await expect(page.getByText(paper.title,{exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'使用 GitHub 登录'})).toBeVisible();
});
test('empty trees support explicit add, clone, delete, move, undo and redo at mobile width',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mock(page);await page.goto(path);await page.getByRole('button',{name:'创建空树',exact:true}).click();await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 await page.getByRole('button',{name:'添加子节点',exact:true}).click();await page.getByLabel('节点标题',{exact:true}).fill('First');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();
 await page.getByRole('button',{name:'添加同级节点',exact:true}).click();await page.getByLabel('节点标题',{exact:true}).fill('Second');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();
 await page.getByRole('button',{name:'上移',exact:true}).click();await expect(page.locator('[data-outline-node]').nth(1)).toHaveText('Second');
 await page.getByRole('button',{name:'撤销修改',exact:true}).click();await expect(page.locator('[data-outline-node]').nth(1)).toHaveText('First');await page.getByRole('button',{name:'重做修改',exact:true}).click();
 await page.getByRole('button',{name:'复制子树',exact:true}).click();expect(await page.locator('[data-outline-node]').count()).toBe(4);
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('1 个节点');void dialog.accept();});await page.getByRole('button',{name:'删除子树',exact:true}).click();expect(await page.locator('[data-outline-node]').count()).toBe(3);
 await page.getByRole('button',{name:'Second',exact:true}).click();await page.getByLabel('新的父节点').selectOption({label:'First'});await page.getByRole('button',{name:'移动到该父节点',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);await page.getByRole('button',{name:'切换亮暗主题'}).click();await expect(page.locator('html')).toHaveClass(/dark/);
});
test('a delayed save keeps later edits dirty, provider failure and conflicts preserve the working tree',async({page})=>{
 const state=await mock(page);state.seed(createPaperTree(paper.id,'empty'));await page.goto(path);await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 await page.getByLabel('节点标题',{exact:true}).fill('Frozen Save');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();state.pause();await page.getByRole('button',{name:'保存私人草稿',exact:true}).click();await expect(page.getByRole('status')).toContainText('保存中');
 await page.getByLabel('节点标题',{exact:true}).fill('Newer Local');await page.getByRole('button',{name:'应用节点修改',exact:true}).click();state.resume();await expect(page.getByRole('status')).toContainText('未保存修改');await expect(page.getByLabel('节点标题',{exact:true})).toHaveValue('Newer Local');
 state.fail(500);await page.getByRole('button',{name:'保存私人草稿',exact:true}).click();await expect(page.getByRole('alert')).toContainText('保存失败');await expect(page.getByLabel('节点标题',{exact:true})).toHaveValue('Newer Local');
 state.fail(409);await page.getByRole('button',{name:'保存私人草稿',exact:true}).click();await expect(page.getByRole('alert')).toContainText('新版本');await expect(page.getByRole('button',{name:'重新加载草稿',exact:true})).toBeVisible();
});
test('JSON import regenerates IDs and remains unsaved, export includes local edits without session data',async({page})=>{
 await mock(page);await page.goto(path);await page.getByRole('button',{name:'创建空树',exact:true}).click();await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 const imported=createPaperTree('different-paper','empty');imported.tree.nodeData.topic='Imported';const oldId=imported.tree.nodeData.id;
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('导入');void dialog.accept();});await page.getByLabel('导入解析树 JSON').setInputFiles({name:'tree.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 await expect(page.getByRole('status')).toContainText('未保存');await page.getByLabel('节点说明',{exact:true}).fill('Unsaved Export Sentinel');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份',exact:true}).click();const download=await downloadPromise;const data=JSON.parse(await readFile((await download.path())!,'utf8'));
 expect(data.paperId).toBe(paper.id);expect(data.tree.nodeData.id).not.toBe(oldId);expect(data.tree.nodeData.note).toBe('Unsaved Export Sentinel');expect(JSON.stringify(data)).not.toContain('csrfToken');
});
test('anonymous shell contains no paper list or tree and links to a safe login return path',async({page})=>{
 await page.route('**/api/session',route=>route.fulfill({json:{authenticated:false}}));await page.goto(path);await expect(page.getByRole('link',{name:'使用 GitHub 登录'})).toHaveAttribute('href',`/api/auth/login?returnTo=${encodeURIComponent(path)}`);await expect(page.locator('.paper-tree-canvas')).toHaveCount(0);await expect(page.getByText(paper.title,{exact:true})).toHaveCount(0);
});
test('unsaved changes trigger the native leave confirmation and dismiss keeps the working draft',async({page})=>{
 await mock(page);await page.goto(path);await page.getByRole('button',{name:'创建空树',exact:true}).click();await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 const dialogPromise=page.waitForEvent('dialog');const navigation=page.getByRole('link',{name:'解析树工作区',exact:true}).click({noWaitAfter:true});const dialog=await dialogPromise;expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();await navigation;
 await expect(page).toHaveURL(new RegExp(paper.paperKey));await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
});
