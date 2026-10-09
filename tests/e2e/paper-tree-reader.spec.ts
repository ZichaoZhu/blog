import {test,expect} from '@playwright/test';
test('failed graphical modules retain the full readable public outline',async({page})=>{
 await page.route('**/_astro/*.js',route=>route.abort());
 await page.goto('/notes/tree-fixture/');await expect(page.getByRole('list',{name:'论文解析树文字大纲'})).toContainText('DeepPublicNodeSentinel');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('paper outline, canvas and snapshot use one release and both article TOCs reach its unique anchor',async({page})=>{
	await page.goto('/notes/tree-fixture/');
	const section=page.locator('[data-paper-tree-snapshot]');
	await expect(section).toHaveAttribute('data-paper-tree-snapshot','c8e2da5d-545e-4ed1-944c-9d54e91b8488');
	await expect(section.getByRole('heading',{name:'论文解析树',exact:true})).toHaveAttribute('id','paper-analysis-tree-2');
	const anchors=page.locator('a[href="#paper-analysis-tree-2"]');
	expect(await anchors.count()).toBeGreaterThanOrEqual(2);
	await page.setViewportSize({width:1280,height:900});
	await page.locator('article .inline-toc summary').click();
	await page.locator('article a[href="#paper-analysis-tree-2"]').click();
	await expect(page).toHaveURL(/#paper-analysis-tree-2$/);
	await expect(section.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
	await expect(section.getByRole('list',{name:'论文解析树文字大纲'})).toContainText('PublicTreeReadingSentinel');
	const snapshot=await (await page.request.get('/paper-trees/snapshots/c8e2da5d-545e-4ed1-944c-9d54e91b8488.json')).json();
	expect(snapshot.snapshotId).toBe(await section.getAttribute('data-paper-tree-snapshot'));
	expect(snapshot.tree.nodeData.children[0].note).toBe('PublicTreeReadingSentinel');
});

test('public node notes are searchable but drafts, unlisted graphs and failed snapshots are absent',async({page})=>{
	await page.goto('/search/?q=PublicTreeReadingSentinel');
	await expect(page.locator('[data-search-result] a[href="/notes/tree-fixture/"]')).toBeVisible();
	for(const query of ['PrivateTreeDraftSentinel','UnlistedTreeSentinel','FailedTreeSentinel']){
		await page.getByLabel('关键词').fill(`"${query}"`); await page.getByRole('button',{name:'搜索',exact:true}).click();
		await expect(page.locator('[role=status]')).toContainText('没有匹配');
	}
});

test('full public outline remains readable without JavaScript, and non-paper and unlisted pages have no graph',async({browser})=>{
	const context=await browser.newContext({javaScriptEnabled:false});
	try{
		const page=await context.newPage();await page.goto('/notes/tree-fixture/');
		await expect(page.getByRole('list',{name:'论文解析树文字大纲'})).toContainText('PublicTreeReadingSentinel');
		await expect(page.getByRole('list',{name:'论文解析树文字大纲'})).toContainText('DeepPublicNodeSentinel');
		for(const slug of ['no-tree-fixture','unlisted-tree-fixture','ordinary-tree-fixture']){
			await page.goto(`/notes/${slug}/`);await expect(page.locator('[data-paper-tree-snapshot]')).toHaveCount(0);
		}
	}finally{await context.close();}
});

test('mobile reading and repeated Swup navigation leave one canvas and working back links',async({page})=>{
	await page.setViewportSize({width:390,height:844});
	await page.goto('/notes/tree-fixture/');
	for(let i=0;i<3;i++){
		await page.locator('.paper-tree-canvas').scrollIntoViewIfNeeded();
		await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toHaveCount(1);
		expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
		await page.getByRole('link',{name:'返回论文',exact:true}).click();
		await expect(page).toHaveURL(/\/papers\/$/);
		await page.locator('main a.topic-group[href="/papers/topics/robotics/"]').click();
		await page.getByRole('link',{name:/Paper Tree Fixture/}).first().click();
		await expect(page).toHaveURL(/\/notes\/tree-fixture\/$/);
	}
});
