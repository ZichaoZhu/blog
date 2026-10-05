<script lang="ts">
import { onMount } from "svelte";
import { courses, topics } from "../../data/catalog";
import type { SearchResult } from "../../global";

let keyword = "";
let type = "";
let topic = "";
let course = "";
let loading = false;
let error = "";
let searched = false;
let total = 0;
let results: SearchResult[] = [];
let pending: Array<{ data: () => Promise<SearchResult> }> = [];
let requestId = 0;
const types = [
	["course", "课程"],
	["paper", "论文"],
	["log", "日志"],
	["idea", "想法"],
	["experiment", "实验"],
	["note", "笔记"],
	["project", "项目"],
];
function restore() {
	const p = new URLSearchParams(location.search);
	keyword = p.get("q") ?? "";
	type = p.get("type") ?? "";
	topic = p.get("topic") ?? "";
	course = p.get("course") ?? "";
}
async function search(push = false) {
	const id = ++requestId;
	error = "";
	results = [];
	pending = [];
	total = 0;
	searched = !!(keyword.trim() || type || topic || course);
	if (push) {
		const params = new URLSearchParams();
		for (const [key, value] of [
			["q", keyword.trim()],
			["type", type],
			["topic", topic],
			["course", course],
		])
			if (value) params.set(key, value);
		history.pushState(
			null,
			"",
			"/search/" + (params.size ? "?" + params.toString() : ""),
		);
	}
	if (!searched) {
		loading = false;
		return;
	}
	loading = true;
	try {
		await window.__loadPagefind?.();
		if (!window.pagefind || window.__pagefindError)
			throw new Error("索引尚不可用");
		const filters: Record<string, string> = {};
		if (type) filters.type = type;
		if (topic) filters.topic = topic;
		if (course) filters.course = course;
		const response = await window.pagefind.search(keyword.trim() || null, {
			filters,
		});
		if (id !== requestId) return;
		pending = response.results;
		total = pending.length;
		const resolved = await Promise.all(
			pending.slice(0, 20).map((r) => r.data()),
		);
		if (id === requestId) results = resolved;
	} catch {
		if (id === requestId)
			error = "搜索暂不可用，请从课程、论文、研究、项目或主题入口浏览。";
	} finally {
		if (id === requestId) loading = false;
	}
}
async function more() {
	const id = requestId;
	loading = true;
	try {
		const next = await Promise.all(
			pending.slice(results.length, results.length + 20).map((r) => r.data()),
		);
		if (id === requestId) results = [...results, ...next];
	} catch {
		if (id === requestId) error = "加载失败，请重试搜索。";
	} finally {
		if (id === requestId) loading = false;
	}
}
onMount(() => {
	restore();
	search();
	const back = () => {
		restore();
		search();
	};
	window.addEventListener("popstate", back);
	return () => {
		requestId++;
		window.removeEventListener("popstate", back);
	};
});
</script>
<div class="card-base p-5 md:p-8">
<form on:submit|preventDefault={()=>search(true)} class="knowledge-form grid gap-4" aria-label="搜索公开记录">
 <label class="grid gap-1">关键词<input name="q" type="search" bind:value={keyword} class="border rounded-lg p-3 w-full bg-transparent" placeholder="标题、术语或正文" /></label>
 <div class="grid gap-3 sm:grid-cols-3">
 <label class="grid gap-1">类型<select aria-label="类型" name="type" bind:value={type} class="border rounded-lg p-2 bg-(--card-bg)"><option value="">全部类型</option>{#each types as [id,label]}<option value={id}>{label}</option>{/each}</select></label>
 <label class="grid gap-1">主题<select aria-label="主题" name="topic" bind:value={topic} class="border rounded-lg p-2 bg-(--card-bg)"><option value="">全部主题</option>{#each topics as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
 <label class="grid gap-1">课程<select aria-label="课程" name="course" bind:value={course} class="border rounded-lg p-2 bg-(--card-bg)"><option value="">全部课程</option>{#each courses as item}<option value={item.id}>{item.title}</option>{/each}</select></label>
 </div><button type="submit" class="btn-regular rounded-lg px-5 py-3 justify-self-start">搜索</button>
</form>
<p role="status" aria-live="polite" class="my-5">{loading?'正在搜索…':error||(!searched?'输入关键词，或选择筛选条件。':total?`找到 ${total} 篇公开记录。`:'没有匹配的公开记录。')}</p>
<ul class="collection-list">{#each results as result}<li data-search-result><a href={result.url} class="topic-group search-result" aria-label={result.meta.title}><div><h2>{result.meta.title}</h2><p>{@html result.excerpt}</p></div><span class="topic-arrow" aria-hidden="true">›</span></a></li>{/each}</ul>
{#if results.length<total}<button type="button" on:click={more} disabled={loading} class="btn-regular px-5 py-3 mt-5 rounded-lg">加载更多</button>{/if}
</div>
