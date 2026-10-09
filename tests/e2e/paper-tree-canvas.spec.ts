import { test, expect } from "@playwright/test";
test('tree keyboard navigation and editor undo shortcuts preserve focus and data',async({page})=>{
 await page.goto('/?mode=editor');await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 const root=page.getByRole('treeitem',{name:'论文解析树',exact:true});await root.focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('treeitem',{name:'Abstract',exact:true})).toBeFocused();
 await page.keyboard.press('Home');await expect(root).toBeFocused();await page.keyboard.press('End');await expect(root).not.toBeFocused();
 await page.getByRole('button',{name:'修改测试说明'}).click();await expect(page.getByTestId('export-data')).toContainText('NEW_NOTE');await root.focus();await page.keyboard.press('Control+z');await expect(page.getByTestId('export-data')).not.toContainText('NEW_NOTE');await page.keyboard.press('Control+Shift+z');await expect(page.getByTestId('export-data')).toContainText('NEW_NOTE');
});

test("root folding and expander buttons work with the keyboard", async ({page})=>{
	await page.goto("/?mode=viewer");
	await expect(page.locator('.paper-tree-canvas[data-ready="true"]')).toBeVisible();
	const root=page.getByRole("treeitem",{name:"论文解析树",exact:true});
	await root.focus(); await page.keyboard.press("Enter");
	await expect(root).toHaveAttribute("aria-expanded","false");
	await expect(page.getByRole("treeitem",{name:"Abstract",exact:true})).toBeHidden();
	await root.focus(); await page.keyboard.press("Enter");
	await expect(root).toHaveAttribute("aria-expanded","true");
	const abstract=page.getByRole("treeitem",{name:"Abstract",exact:true});
	const expander=abstract.locator("..").getByRole("button",{name:"收起分支",exact:true});
	await expander.focus(); await page.keyboard.press("Enter");
	await expect(abstract).toHaveAttribute("aria-expanded","false");
});

test("readers fold complete branches, open parent notes, follow links and cannot edit", async ({page}) => {
	const writes: string[] = [];
	page.on("request", request => {if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());});
	await page.goto("/?mode=viewer");
	const canvas = page.locator(".paper-tree-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true");
	const abstract = canvas.getByRole("treeitem", {name:"Abstract", exact:true});
	await expect(abstract).toHaveAttribute("aria-expanded", "true");
	await abstract.click();
	await expect(abstract).toHaveAttribute("aria-expanded", "false");
	await expect(canvas.getByRole("treeitem", {name:"Task", exact:true})).toHaveCount(0);
	await abstract.focus(); await page.keyboard.press("Enter");
	await expect(canvas.getByRole("treeitem", {name:"Task", exact:true})).toBeVisible();
	const challenge = canvas.getByRole("treeitem", {name:/Technical challenge for previous methods/}).first();
	await challenge.getByRole("button",{name:"查看节点说明"}).click();
	await expect(page.getByRole("region", {name:"节点详情"})).toContainText("父节点说明");
	const pipeline = canvas.getByRole("treeitem", {name:"介绍 technical contributions",exact:true});
	await expect(pipeline).toHaveAttribute("aria-expanded", "false");
	await pipeline.getByRole("link",{name:"打开节点链接"}).click();
	await expect(pipeline).toHaveAttribute("aria-expanded", "false");
	await page.goto("/?mode=viewer");
	await expect(page.locator('.paper-tree-canvas[data-ready="true"]')).toBeVisible();
	await page.getByRole("treeitem",{name:"Abstract",exact:true}).dblclick();
	await expect(page.locator(".paper-tree-canvas [contenteditable=true]")).toHaveCount(0);
	await page.keyboard.press("Tab"); await page.keyboard.press("Delete");
	await expect(page.getByRole("treeitem",{name:"Abstract",exact:true})).toHaveCount(1);
	expect(writes).toEqual([]);
});

test("editor commands keep unique IDs, reject descendant moves and undo note edits", async ({page}) => {
	await page.goto("/?mode=editor");
	await expect(page.locator('.paper-tree-canvas[data-ready="true"]')).toBeVisible();
	await page.getByRole("button",{name:"添加测试子节点"}).click();
	await expect(page.getByRole("treeitem",{name:"新节点",exact:true})).toBeVisible();
	await page.getByRole("button",{name:"复制测试分支"}).click();
	await expect(page.getByRole("treeitem",{name:"Abstract",exact:true})).toHaveCount(2);
	await page.getByRole("button",{name:"修改测试说明"}).click();
	await expect(page.getByTestId("export-data")).toContainText("NEW_NOTE");
	await page.getByRole("button",{name:"撤销" ,exact:true}).click();
	await expect(page.getByTestId("export-data")).not.toContainText("NEW_NOTE");
	await page.getByRole("button",{name:"重做",exact:true}).click();
	await expect(page.getByTestId("export-data")).toContainText("NEW_NOTE");
	await page.getByRole("button",{name:"移动到后代测试"}).click();
	await expect(page.getByRole("status")).toContainText("后代");
	const json = JSON.parse(await page.getByTestId("export-data").innerText());
	const ids: string[] = [];
	function walk(n: {id:string;children?:any[]}) {ids.push(n.id); for(const child of n.children??[]) walk(child);}
	walk(json.nodeData);
	expect(new Set(ids).size).toBe(ids.length);
});

for (const width of [390,1440]) {
	for (const count of [100,500]) {
		test(`${count} nodes at ${width}px preserve every node, formula height and page bounds`, async ({page},info) => {
			await page.setViewportSize({width,height:900});
			const started = Date.now();
			await page.goto(`/?mode=viewer&count=${count}`);
			await expect(page.locator('.paper-tree-canvas[data-ready="true"]')).toBeVisible();
			await expect(page.getByRole("treeitem")).toHaveCount(count);
			const measurement = await page.evaluate(() => ({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,nodes:document.querySelectorAll('me-tpc').length,fractionHeight:document.querySelector('.mfrac')?.getBoundingClientRect().height??0}));
			const operation=await page.evaluate(async()=>{const root=document.querySelector('me-tpc') as HTMLElement;const started=performance.now();root.click();root.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {foldExpandMs:performance.now()-started,heapBytes:(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null};});
			expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.width+1);
			expect(measurement.fractionHeight).toBeGreaterThan(18);
			await info.attach("measurement",{body:JSON.stringify({count,width,loadMs:Date.now()-started,...measurement,...operation}),contentType:"application/json"});
		});
	}
}
test('full screen exits cleanly and dark mode preserves keyboard interaction',async({page})=>{
 await page.goto('/?mode=viewer');await expect(page.locator('.paper-tree-canvas[data-ready=true]')).toBeVisible();
 await page.evaluate(()=>document.documentElement.classList.add('dark'));const root=page.getByRole('treeitem',{name:'论文解析树',exact:true});await root.focus();await page.keyboard.press('Enter');await expect(root).toHaveAttribute('aria-expanded','false');await page.keyboard.press('Enter');await expect(root).toHaveAttribute('aria-expanded','true');
 await page.getByRole('button',{name:'全屏',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await page.evaluate(()=>document.exitFullscreen());await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 await root.focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('treeitem',{name:'Abstract',exact:true})).toBeFocused();
});

test("unmounting an initialized or initializing canvas leaves one instance after remount",async({page})=>{
	await page.goto("/?mode=viewer");
	await expect(page.locator('.paper-tree-canvas[data-ready="true"]')).toBeVisible();
	for(let i=0;i<4;i++) {await page.getByRole("button",{name:"切换挂载"}).click(); await page.getByRole("button",{name:"切换挂载"}).click();}
	await expect(page.locator(".map-container")).toHaveCount(1);
	await page.getByRole("treeitem",{name:"Abstract",exact:true}).click();
	await expect(page.getByRole("treeitem",{name:"Abstract",exact:true})).toHaveAttribute("aria-expanded","false");
});
