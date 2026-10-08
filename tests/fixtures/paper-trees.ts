import type { DraftTree, TreeNode } from "../../src/features/paper-trees/model";

export function draftFixture(paperId = "paper/中文"): DraftTree {
	return {
		schemaVersion: 1,
		paperId,
		templateId: null,
		updatedAt: "2026-10-08T00:00:00.000Z",
		tree: { direction: 1, nodeData: { id: "root", topic: "论文解析树" } },
	};
}

export function wideDraft(count: number): DraftTree {
	const draft = draftFixture();
	draft.tree.nodeData.children = Array.from(
		{ length: count - 1 },
		(_, index) => ({
			id: `node-${index}`,
			topic: `问题 ${index}`,
			note: "回答 $r_{bound}=1$",
		}),
	);
	return draft;
}

export function deepDraft(depth: number): DraftTree {
	const draft = draftFixture();
	let node: TreeNode = draft.tree.nodeData;
	for (let index = 1; index <= depth; index++) {
		const child: TreeNode = { id: `level-${index}`, topic: `层级 ${index}` };
		node.children = [child];
		node = child;
	}
	return draft;
}
