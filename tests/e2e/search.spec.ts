import {readCurrentManifest} from '../../scripts/verify-site';import {isPublicNote} from '../../src/utils/note-model';import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';import queries from '../fixtures/search-queries.json' with {type:'json'};
const current=await readCurrentManifest('src/content/posts');const publicNotes=current.records.filter(r=>isPublicNote({entryId:r.sourcePath,data:r,hasBody:r.hasBody}));
test('navbar search preserves the first query while Pagefind loads in either layout',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firefly-effects','off'));
 for(const width of [1024,1440]){
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  let intercepted!:()=>void;const held=new Promise<void>(r=>intercepted=r);
  await page.route('**/pagefind/pagefind.js',async route=>{if(route.request().method()==='HEAD'){intercepted();await gate;}await route.continue();});
  await page.setViewportSize({width,height:900});await page.goto('/');
  await page.waitForFunction(()=>!document.querySelector('#search-switch')?.closest('astro-island')?.hasAttribute('ssr'));
  if(width<1280)await page.locator('#search-switch').click();
  const input=page.locator(width<1280?'#search-bar-inside input':'#search-input-desktop');
  await input.fill('pandas');await held;release();
  await expect(page.locator('#search-panel a[href="/notes/machine-learning-lec2/"]')).toBeVisible();
  await input.fill('');await expect(page.locator('#search-panel a[href^="/notes/"]')).toHaveCount(0);
  await page.keyboard.press('Escape');await page.unroute('**/pagefind/pagefind.js');
  if(width===1440){
   await input.fill('pandas');await expect(page.locator('#search-panel a[href="/notes/machine-learning-lec2/"]')).toBeVisible();await page.keyboard.press('Escape');
   await page.setViewportSize({width:1024,height:900});await page.locator('#search-switch').click();
   await page.locator('#search-bar-inside input').fill('Bellman');await expect(page.locator('#search-panel a[href*="reinforcement-learning"]').first()).toBeVisible();await page.keyboard.press('Escape');
   await page.setViewportSize({width:1440,height:900});await input.focus();await expect(page.locator('#search-panel a[href="/notes/machine-learning-lec2/"]')).toBeVisible();await page.keyboard.press('Escape');
  }
 }
});
test('twenty real multilingual queries find unique public articles',async({page})=>{
 await page.goto('/search/');await expect(page.getByLabel('关键词')).toBeVisible();
 for(const q of queries){await page.getByLabel('关键词').fill(q.query);await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByRole('status')).toContainText(/找到|没有匹配/);if(!q.target||publicNotes.some(n=>n.slug===q.target))await expect(page.locator('[data-search-result]')).not.toHaveCount(0);}

 const all=await page.request.get('/api/allPostMeta.json');const notes=await all.json();expect(notes.length).toBe(publicNotes.length);expect(notes.every((n:{body?:string;content?:string})=>!n.body&&!n.content)).toBe(true);
 const scope=await page.evaluate(async()=>{await window.__loadPagefind?.();const r=await window.pagefind.search(null);return Promise.all(r.results.map(n=>n.data()));});expect(scope.map(n=>n.url).sort()).toEqual(publicNotes.map(n=>n.canonicalPath).sort());
 const absent=await page.evaluate(async()=>{const r=await window.pagefind.search('ピッチ');return r.results.length;});const pitchAuthored=(await Promise.all(publicNotes.map(n=>readFile('src/content/posts/'+n.targetPath,'utf8')))).some(raw=>raw.includes('ピッチ'));if(pitchAuthored)expect(absent).toBeGreaterThan(0);else expect(absent).toBe(0);
 for(const path of ['/rss.xml','/atom.xml']){const xml=await (await page.request.get(path)).text();for(const n of current.records.filter(n=>!publicNotes.includes(n)||!n.date))if(n.contentKind==='note')expect(xml).not.toContain(n.canonicalPath);expect(xml).not.toContain('<content:encoded>');expect(xml.match(path.includes('rss')?/<item>/g:/<entry>/g)?.length??0).toBe(publicNotes.filter(n=>n.date).length);}
});
test('filters, refresh, back, empty and missing queries retain usable state',async({page})=>{
 await page.goto('/search/?q=Bellman&type=course&topic=reinforcement-learning&course=reinforcement-learning');
 await expect(page.locator('[data-search-result]')).not.toHaveCount(0);await expect(page.getByLabel('课程',{exact:true})).toHaveValue('reinforcement-learning');
 await page.reload();await expect(page.getByLabel('关键词')).toHaveValue('Bellman');
 await page.getByLabel('关键词').fill('zzzzunfindable');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByText('没有匹配的公开记录。')).toBeVisible();
 await page.goBack();await expect(page.getByLabel('关键词')).toHaveValue('Bellman');await expect(page.locator('[data-search-result]')).not.toHaveCount(0);
 await page.getByLabel('关键词').fill('');await page.getByLabel('类型',{exact:true}).selectOption('');await page.getByLabel('主题',{exact:true}).selectOption('');await page.getByLabel('课程',{exact:true}).selectOption('');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByText('输入关键词，或选择筛选条件。')).toBeVisible();
 await page.getByLabel('关键词').fill('"Typora 语法兼容性测试"');await page.getByRole('button',{name:'搜索',exact:true}).click();if(!publicNotes.some(n=>n.slug==='typora-test'))await expect(page.getByText('没有匹配的公开记录。')).toBeVisible();
});
test('a delayed old Pagefind fragment cannot overwrite a newer query',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let intercepted!:()=>void;const held=new Promise<void>(r=>intercepted=r);let first=true;let heldUrl='';
 await page.route('**/pagefind/fragment/*',async route=>{if(first){first=false;heldUrl=route.request().url();intercepted();await gate;}await route.continue();});
 await page.goto('/search/');await page.getByLabel('关键词').fill('InfiniDepth');await page.getByRole('button',{name:'搜索',exact:true}).click();await held;
 await page.getByLabel('关键词').fill('Bellman');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.locator('[data-search-result] a[href*="reinforcement-learning"]')).not.toHaveCount(0);
 const finished=page.waitForResponse(r=>r.url()===heldUrl);release();await (await finished).finished();await page.waitForTimeout(300);
 await expect(page.locator('[data-search-result] a[href="/notes/infinidepth-reading/"]')).toHaveCount(0);await expect(page.locator('[data-search-result] a[href*="reinforcement-learning"]')).not.toHaveCount(0);expect(new URL(page.url()).searchParams.get('q')).toBe('Bellman');
});
