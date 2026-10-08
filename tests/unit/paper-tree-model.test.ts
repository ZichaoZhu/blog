import assert from "node:assert/strict";
import test from "node:test";
import {
	cloneBranch,
	flattenTree,
	importDraft,
	TreeValidationError,
	toPublicSnapshot,
	validateDraft,
} from "../../src/features/paper-trees/model";
import { createPaperTree } from "../../src/features/paper-trees/template";
import { deepDraft, draftFixture, wideDraft } from "../fixtures/paper-trees";

test("the screenshot template preserves every question, hierarchy and multiline prompt", () => {
	const draft = createPaperTree("paper/中文", "template");
	assert.deepEqual(
		draft.tree.nodeData.children?.map((node) => node.topic),
		["Abstract", "Introduction", "Method", "Experiments", "Limitation"],
	);
	const paths: string[] = [];
	function walk(node: typeof draft.tree.nodeData, parent: string) {
		const path = parent ? `${parent}/${node.topic.split("\n")[0]}` : node.topic;
		paths.push(path);
		for (const child of node.children ?? []) walk(child, path);
	}
	walk(draft.tree.nodeData, "");
	const expected = [
		"Abstract/Task",
		"Abstract/Technical challenge for previous methods",
		"Abstract/一句话介绍解决 challenge 的 key insight/motivation/一句话介绍 insight/motivation",
		"Abstract/一句话介绍解决 challenge 的 key insight/motivation/一句话介绍 insight 的好处",
		"Abstract/介绍 technical contributions/technical contribution 1/一句话介绍 technical contribution 1",
		"Abstract/介绍 technical contributions/technical contribution 1/一句话介绍 technical contribution 的好处",
		"Abstract/介绍 technical contributions/technical contribution 2/一句话介绍 technical contribution 2",
		"Abstract/介绍 technical contributions/technical contribution 2/一句话介绍 technical contribution 的好处",
		"Abstract/Experiment",
		"Introduction/Task and application",
		"Introduction/Technical challenge for previous methods/Technical challenge 1/Previous method",
		"Introduction/Technical challenge for previous methods/Technical challenge 1/Failure cases (Limitation)",
		"Introduction/Technical challenge for previous methods/Technical challenge 1/Technical reason",
		"Introduction/Technical challenge for previous methods/Technical challenge 2/Previous method",
		"Introduction/Technical challenge for previous methods/Technical challenge 2/Failure cases (Limitation)",
		"Introduction/Technical challenge for previous methods/Technical challenge 2/Technical reason",
		"Introduction/介绍解决 challenge 的 our pipeline/一句话介绍 key innovation/insight/contribution",
		"Introduction/介绍解决 challenge 的 our pipeline/contribution 1/具体怎么做的",
		"Introduction/介绍解决 challenge 的 our pipeline/contribution 1/讨论 advantage/insight",
		"Introduction/介绍解决 challenge 的 our pipeline/contribution 2/为了解决什么问题",
		"Introduction/介绍解决 challenge 的 our pipeline/contribution 2/具体怎么做的",
		"Introduction/介绍解决 challenge 的 our pipeline/contribution 2/讨论 advantage/insight",
		"Introduction/酷的 demos/applications",
		"Method/Overview/具体的任务",
		"Method/Overview/方法",
		"Method/Pipeline module 1/Motivation",
		"Method/Pipeline module 1/做法",
		"Method/Pipeline module 1/为什么能 work",
		"Method/Pipeline module 1/technical advantage",
		"Method/Pipeline module 2/Motivation",
		"Method/Pipeline module 2/做法",
		"Method/Pipeline module 2/为什么能 work",
		"Method/Pipeline module 2/technical advantage",
		"Experiments/Comparison experiments",
		"Experiments/Ablation studies/论文的 core contributions 以及一些重要的 components",
		"Experiments/Ablation studies/列出每一个 pipeline module 中的 design choices",
		"Limitation",
	];
	for (const path of expected)
		assert.ok(paths.includes(`论文解析树/${path}`), path);
	const nodes = flattenTree(draft.tree);
	assert.equal(nodes.length, 56);
	assert.ok(nodes.every(({ node }) => node.topic !== "…"));
	assert.equal(
		nodes.find(({ node }) => node.topic.startsWith("具体的任务"))?.node.topic,
		"具体的任务\n输入：…\n输出：…",
	);
	assert.equal(
		nodes.find(({ node }) => node.topic.startsWith("方法\n"))?.node.topic,
		"方法\n第一步：…\n第二步：…\n第三步：…",
	);
	assert.match(
		nodes.find(({ node }) => node.topic.startsWith("Limitation"))!.node.note!,
		/为什么我们的方法有这样的 limitation/,
	);
	assert.equal(
		validateDraft(draft, "paper/中文").templateId,
		"pengsida-paper-analysis-v1",
	);
});

test("new trees, cloned branches and cross-paper imports have disjoint IDs and no publish state", () => {
	const first = createPaperTree("paper-A", "template");
	const second = createPaperTree("paper-A", "template");
	const imported = importDraft(
		{ ...first, snapshotId: "private-snapshot", published: true },
		"paper-B",
	);
	const clone = cloneBranch(first.tree.nodeData.children![1]);
	const all = [
		first.tree,
		second.tree,
		imported.tree,
		{ nodeData: clone, direction: 1 as const },
	].flatMap(flattenTree);
	assert.equal(new Set(all.map(({ node }) => node.id)).size, all.length);
	assert.equal(imported.paperId, "paper-B");
	assert.equal("snapshotId" in imported, false);
	assert.equal("published" in imported, false);
	assert.equal(
		createPaperTree("paper-A", "empty").tree.nodeData.children?.length ?? 0,
		0,
	);
	assert.throws(
		() => validateDraft(first, "paper-B"),
		(error) =>
			error instanceof TreeValidationError && error.code === "PAPER_MISMATCH",
	);
});

test("inclusive node, depth and Unicode character limits reject only their next value", () => {
	assert.equal(
		flattenTree(validateDraft(wideDraft(500), "paper/中文").tree).length,
		500,
	);
	assert.throws(
		() => validateDraft(wideDraft(501), "paper/中文"),
		TreeValidationError,
	);
	assert.equal(
		flattenTree(validateDraft(deepDraft(32), "paper/中文").tree).at(-1)?.depth,
		32,
	);
	assert.throws(
		() => validateDraft(deepDraft(33), "paper/中文"),
		TreeValidationError,
	);
	for (const [key, max] of [
		["topic", 1000],
		["note", 20000],
	] as const) {
		const draft = draftFixture();
		draft.tree.nodeData[key] = "😀".repeat(max);
		assert.equal(
			validateDraft(draft, draft.paperId).tree.nodeData[key],
			"😀".repeat(max),
		);
		draft.tree.nodeData[key] += "😀";
		assert.throws(
			() => validateDraft(draft, draft.paperId),
			TreeValidationError,
		);
	}
});

test("the JSON cap is UTF-8 bytes, including unknown fields, and accepts exactly 1 MiB", () => {
	const draft = { ...draftFixture(), extra: "" };
	const overhead = Buffer.byteLength(JSON.stringify(draft));
	draft.extra =
		"中".repeat(Math.floor((1048576 - overhead) / 3)) +
		"x".repeat((1048576 - overhead) % 3);
	assert.equal(Buffer.byteLength(JSON.stringify(draft)), 1048576);
	assert.doesNotThrow(() => validateDraft(draft, draft.paperId));
	draft.extra += "a";
	assert.throws(
		() => validateDraft(draft, draft.paperId),
		(error) =>
			error instanceof TreeValidationError && error.code === "SIZE_LIMIT",
	);
});

test("duplicate IDs and real child cycles report the responsible node without persisting runtime parent references", () => {
	const duplicate = wideDraft(2);
	duplicate.tree.nodeData.children![0].id = "root";
	assert.throws(
		() => validateDraft(duplicate, duplicate.paperId),
		(error) => error instanceof TreeValidationError && error.nodeId === "root",
	);
	const cyclic = draftFixture();
	cyclic.tree.nodeData.children = [cyclic.tree.nodeData];
	assert.throws(
		() => validateDraft(cyclic, cyclic.paperId),
		TreeValidationError,
	);
	const runtime = wideDraft(2);
	Object.assign(runtime.tree.nodeData.children![0], {
		parent: runtime.tree.nodeData,
	});
	assert.equal(
		"parent" in
			validateDraft(runtime, runtime.paperId).tree.nodeData.children![0],
		false,
	);
});

test("invalid roots, versions, URLs, raw HTML, images, attachments and arbitrary CSS are refused", () => {
	for (const mutate of [
		(d: any) => (d.schemaVersion = 2),
		(d: any) => (d.tree.nodeData = []),
		(d: any) => (d.tree.direction = 0),
		(d: any) => (d.tree.nodeData.id = ""),
		(d: any) => (d.tree.nodeData.topic = 2),
		(d: any) => (d.updatedAt = "nonsense"),
		(d: any) => (d.tree.nodeData.children = {}),
		(d: any) => (d.tree.nodeData.expanded = "false"),
		(d: any) =>
			(d.tree.nodeData.image = { url: "https://example.org/image.png" }),
		(d: any) => (d.tree.nodeData.attachments = []),
		(d: any) =>
			(d.tree.nodeData.dangerouslySetInnerHTML = "<img onerror=alert(1)>"),
		(d: any) => (d.tree.nodeData.html = "<b>raw</b>"),
		(d: any) => (d.tree.nodeData.style = { fontSize: 500 }),
		(d: any) =>
			(d.tree.nodeData.style = { background: "url(https://evil.test)" }),
		(d: any) => (d.tree.nodeData.style = { color: "red;position:fixed" }),
	]) {
		const draft = draftFixture();
		mutate(draft);
		assert.throws(
			() => validateDraft(draft, draft.paperId),
			TreeValidationError,
		);
	}
	for (const url of [
		"javascript:alert(1)",
		"data:text/html,evil",
		"//evil.test",
		"https://user:secret@host.test/",
		"java\nscript:evil",
	]) {
		const draft = draftFixture();
		draft.tree.nodeData.hyperLink = url;
		assert.throws(
			() => validateDraft(draft, draft.paperId),
			TreeValidationError,
			url,
		);
	}
	for (const url of [
		"https://example.org/paper",
		"http://example.org/",
		"#method",
		"/notes/paper/#method",
	]) {
		const draft = draftFixture();
		draft.tree.nodeData.hyperLink = url;
		assert.equal(
			validateDraft(draft, draft.paperId).tree.nodeData.hyperLink,
			url,
		);
	}
});

test("the public projection retains notes but drops every private or runtime field", () => {
	const draft = draftFixture();
	Object.assign(draft, { session: "SECRET", author: "SECRET", repo: "SECRET" });
	Object.assign(draft.tree, {
		arrows: [{ label: "SECRET" }],
		summaries: [{ text: "SECRET" }],
	});
	Object.assign(draft.tree.nodeData, {
		note: "published note",
		metadata: { private: "SECRET" },
		privateNote: "SECRET",
		html: "SECRET",
	});
	draft.tree.nodeData.style = {
		fontSize: 18,
		fontWeight: 700,
		color: "#3399ff",
		background: "#fff",
	};
	const output = toPublicSnapshot(
		draft,
		"c8e2da5d-545e-4ed1-944c-9d54e91b8488",
		"2026-10-08T01:00:00.000Z",
	);
	assert.equal(output.tree.nodeData.note, "published note");
	assert.equal(JSON.stringify(output).includes("SECRET"), false);
	assert.deepEqual(Object.keys(output).sort(), [
		"paperId",
		"publishedAt",
		"schemaVersion",
		"snapshotId",
		"tree",
	]);
	assert.deepEqual(output.tree.nodeData.style, {
		fontSize: 18,
		fontWeight: 700,
		color: "#3399ff",
		background: "#fff",
	});
	assert.equal("updatedAt" in output, false);
});
