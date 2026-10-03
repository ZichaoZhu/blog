import {readCurrentManifest} from '../../scripts/verify-site';
import {test,expect} from '@playwright/test';import manifest from '../../migration/manifest.json' with {type:'json'};
const current=await readCurrentManifest('src/content/posts');
test('old content routes preserve addresses and current visibility',async({page})=>{
 for(const r of manifest.records){const old=await page.request.get(encodeURI(r.legacyPath));expect(old.status(),r.legacyPath).toBe(200);const html=await old.text();expect(html).toContain('noindex,follow');expect(html).toContain(r.canonicalPath);const target=await page.request.get(r.canonicalPath);const live=current.records.find(n=>n.id===r.id);const hidden=live?.contentKind==='note'&&live.visibility==='draft';expect(target.status(),r.canonicalPath).toBe(hidden?404:200);}
 await page.goto('/blog/?folder=Coure-Notebook%2FCompiler_Principle');await expect(page).toHaveURL(/\/courses\/compiler-principles\/$/);
 await page.goto('/notes/?page=2');await expect(page).toHaveURL(/\/notes\/page\/2\/$/);
 const article=manifest.records.find(r=>r.slug==='operating-systems-lec0')!;const html=await (await page.request.get(article.canonicalPath)).text();const id=html.match(/<h2 id="([^"]+)"/)![1];await page.goto(encodeURI(article.legacyPath)+'#'+encodeURIComponent(id));await expect(page).toHaveURL(new RegExp('/notes/operating-systems-lec0/#'));await expect.poll(()=>page.evaluate(()=>!!document.getElementById(decodeURIComponent(location.hash.slice(1))))).toBe(true);
});
test('all old image endpoints remain real images in static preview',async({request})=>{
 for(let i=0;i<manifest.assets.length;i+=8)await Promise.all(manifest.assets.slice(i,i+8).map(async a=>{const r=await request.get('/api/images/'+encodeURI(a.sourcePath)+'?w=640');expect(r.status(),a.sourcePath).toBe(200);expect(r.headers()['content-type']).toContain('image/png');expect((await r.body()).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');}));
});
test('preview metadata and public-only sitemap never use demo origin',async({page})=>{
 const note=current.records.find(n=>n.contentKind==='note'&&n.visibility==='published'&&n.hasBody&&!n.date)??current.records.find(n=>n.contentKind==='note'&&n.visibility==='published'&&n.hasBody)!;
 await page.goto(note.canonicalPath);await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','http://127.0.0.1:4321'+note.canonicalPath);
 const structured=await page.locator('script[type="application/ld+json"]').allTextContents();expect(structured.join('')).not.toContain('firefly.cuteleaf.cn');const article=structured.map(s=>JSON.parse(s)).find(s=>s['@type']==='BlogPosting');expect(article.datePublished).toBe(note.date?note.date+'T00:00:00.000Z':undefined);
 const sitemap=await (await page.request.get('/sitemap.xml')).text();expect(sitemap).not.toContain('/blog/');for(const privateNote of current.records.filter(n=>n.contentKind==='note'&&n.visibility!=='published'))expect(sitemap).not.toContain(privateNote.canonicalPath);const date=note.updatedAt??note.date;expect(sitemap).toContain(note.canonicalPath+'</loc>'+(date?'<lastmod>'+date+'</lastmod>':'')+'</url>');expect((await (await page.request.get('/robots.txt')).text())).toContain('Disallow: /');

});
test('changed old heading ids remain usable on canonical article links',async({page})=>{const record=manifest.records.find(r=>Object.keys(r.anchorAliases).length)!;const alias=Object.keys(record.anchorAliases)[0];await page.goto(record.canonicalPath+'#'+encodeURIComponent(alias));await expect.poll(()=>page.evaluate(()=>!!document.getElementById(decodeURIComponent(location.hash.slice(1))))).toBe(true);});
