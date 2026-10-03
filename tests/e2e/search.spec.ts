import {test,expect} from '@playwright/test';import queries from '../fixtures/search-queries.json' with {type:'json'};
test('twenty real multilingual queries find unique public articles',async({page})=>{
 await page.goto('/search/');await expect(page.getByLabel('关键词')).toBeVisible();
 for(const q of queries){await page.getByLabel('关键词').fill(q.query);await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByRole('status')).toContainText('找到');await expect(page.locator('[data-search-result]')).not.toHaveCount(0);if(q.target)await expect.poll(async()=>{const links=await page.locator('[data-search-result] a').evaluateAll(es=>es.slice(0,5).map(e=>e.getAttribute('href')));return links.includes(`/notes/${q.target}/`);}).toBe(true);}
 const all=await page.request.get('/api/allPostMeta.json');const notes=await all.json();expect(notes.length).toBe(44);expect(notes.every((n:{body?:string;content?:string})=>!n.body&&!n.content)).toBe(true);
 const scope=await page.evaluate(async()=>{await window.__loadPagefind?.();const r=await window.pagefind.search(null);return Promise.all(r.results.map(n=>n.data()));});expect(scope.length).toBe(44);expect(new Set(scope.map(n=>n.url)).size).toBe(44);expect(scope.every(n=>n.url.startsWith('/notes/')&&!n.url.includes('/client/')&&!n.url.includes('typora-test'))).toBe(true);
 const absent=await page.evaluate(async()=>{const r=await window.pagefind.search('ピッチ');return r.results.length;});expect(absent).toBe(0);
 for(const path of ['/rss.xml','/atom.xml']){const xml=await (await page.request.get(path)).text();expect(xml).not.toContain('/notes/infinidepth-reading/');expect(xml).not.toContain('typora-test');expect(xml).not.toContain('<content:encoded>');expect(xml.match(path.includes('rss')?/<item>/g:/<entry>/g)?.length).toBe(42);}
});
test('filters, refresh, back, empty and missing queries retain usable state',async({page})=>{
 await page.goto('/search/?q=Bellman&type=course&topic=reinforcement-learning&course=reinforcement-learning');
 await expect(page.locator('[data-search-result]')).not.toHaveCount(0);await expect(page.getByLabel('课程',{exact:true})).toHaveValue('reinforcement-learning');
 await page.reload();await expect(page.getByLabel('关键词')).toHaveValue('Bellman');
 await page.getByLabel('关键词').fill('zzzzunfindable');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByText('没有匹配的公开笔记。')).toBeVisible();
 await page.goBack();await expect(page.getByLabel('关键词')).toHaveValue('Bellman');await expect(page.locator('[data-search-result]')).not.toHaveCount(0);
 await page.getByLabel('关键词').fill('');await page.getByLabel('类型',{exact:true}).selectOption('');await page.getByLabel('主题',{exact:true}).selectOption('');await page.getByLabel('课程',{exact:true}).selectOption('');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByText('输入关键词，或选择筛选条件。')).toBeVisible();
 await page.getByLabel('关键词').fill('"Typora 语法兼容性测试"');await page.getByRole('button',{name:'搜索',exact:true}).click();await expect(page.getByText('没有匹配的公开笔记。')).toBeVisible();
});
