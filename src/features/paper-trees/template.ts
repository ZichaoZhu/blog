import type { DraftTree, TreeNode } from "./model";

function node(topic: string, children?: TreeNode[], note?: string): TreeNode {
	return {
		id: globalThis.crypto.randomUUID(),
		topic,
		...(children ? { children } : {}),
		...(note ? { note } : {}),
	};
}

function challenge(number: number): TreeNode {
	return node(`Technical challenge ${number}`, [
		node("Previous method"),
		node("Failure cases (Limitation)"),
		node("Technical reason"),
	]);
}

function contribution(number: number): TreeNode {
	return node(`technical contribution ${number}`, [
		node(`一句话介绍 technical contribution ${number}`),
		node("一句话介绍 technical contribution 的好处"),
	]);
}

function module(number: number): TreeNode {
	return node(`Pipeline module ${number}`, [
		node("Motivation"),
		node("做法"),
		node("为什么能 work"),
		node("technical advantage"),
	]);
}

export function createPaperTree(
	paperId: string,
	mode: "template" | "empty",
): DraftTree {
	const branches =
		mode === "empty"
			? undefined
			: [
					node("Abstract", [
						node("Task"),
						node(
							"Technical challenge for previous methods\n（围绕我们解决了的 technical challenge 展开讨论）",
						),
						node(
							"一句话介绍解决 challenge 的 key insight/motivation\n（insight 和 technical contribution 不一样，insight 是比较通用的 high-level 的思想）",
							[
								node("一句话介绍 insight/motivation"),
								node(
									"一句话介绍 insight 的好处\n（不一定要在这里说，因为如果后面要提 technical contribution，还会再说 technical advantage）",
								),
							],
						),
						node("介绍 technical contributions", [
							contribution(1),
							contribution(2),
						]),
						node("Experiment"),
					]),
					node("Introduction", [
						node("Task and application"),
						node(
							"Technical challenge for previous methods\n（围绕我们解决了的 technical challenge 展开讨论）",
							[challenge(1), challenge(2)],
						),
						node("介绍解决 challenge 的 our pipeline", [
							node("一句话介绍 key innovation/insight/contribution"),
							node("contribution 1", [
								node("具体怎么做的"),
								node("讨论 advantage/insight"),
							]),
							node("contribution 2", [
								node("为了解决什么问题"),
								node("具体怎么做的"),
								node("讨论 advantage/insight"),
							]),
						]),
						node("酷的 demos/applications"),
					]),
					node("Method", [
						node("Overview", [
							node("具体的任务\n输入：…\n输出：…"),
							node("方法\n第一步：…\n第二步：…\n第三步：…"),
						]),
						module(1),
						module(2),
					]),
					node("Experiments", [
						node("Comparison experiments"),
						node("Ablation studies", [
							node(
								"论文的 core contributions 以及一些重要的 components\n对论文方法 performance 的影响",
							),
							node(
								"列出每一个 pipeline module 中的 design choices\n对论文方法 performance 的影响",
							),
						]),
					]),
					node(
						"Limitation",
						undefined,
						"需要给 limitation 做出合理的解释：为什么我们的方法有这样的 limitation",
					),
				];
	return {
		schemaVersion: 1,
		paperId,
		templateId: mode === "template" ? "pengsida-paper-analysis-v1" : null,
		updatedAt: new Date().toISOString(),
		tree: { direction: 1, nodeData: node("论文解析树", branches) },
	};
}
