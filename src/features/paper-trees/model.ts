/** Shared browser/server contract. Never persist Mind Elixir runtime objects directly. */
export interface NodeStyle {
	fontSize?: 22 | 18 | 14 | 12;
	fontWeight?: 400 | 700;
	color?: string;
	background?: string;
}

export interface TreeNode {
	id: string;
	topic: string;
	note?: string;
	hyperLink?: string;
	expanded?: boolean;
	children?: TreeNode[];
	style?: NodeStyle;
}

export interface TreeData {
	nodeData: TreeNode;
	direction: 1;
}

export interface DraftTree {
	schemaVersion: 1;
	paperId: string;
	templateId: string | null;
	updatedAt: string;
	tree: TreeData;
}

export interface PublicSnapshot {
	schemaVersion: 1;
	snapshotId: string;
	paperId: string;
	publishedAt: string;
	tree: TreeData;
}

export class TreeValidationError extends Error {
	readonly code: string;
	readonly nodeId?: string;
	constructor(code: string, message: string, nodeId?: string) {
		super(message);
		this.name = "TreeValidationError";
		this.code = code;
		this.nodeId = nodeId;
	}
}

function fail(code: string, message: string, nodeId?: string): never {
	throw new TreeValidationError(code, message, nodeId);
}

function object(input: unknown, nodeId?: string): Record<string, unknown> {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		fail("INVALID_OBJECT", "需要有效的树或节点对象。", nodeId);
	}
	const prototype = Object.getPrototypeOf(input);
	if (prototype !== Object.prototype && prototype !== null) {
		fail("INVALID_OBJECT", "不能使用特殊对象作为树数据。", nodeId);
	}
	return input as Record<string, unknown>;
}

function text(
	input: unknown,
	max: number,
	field: string,
	nodeId?: string,
): string {
	if (typeof input !== "string")
		fail("INVALID_TEXT", `${field} 必须是文本。`, nodeId);
	if (Array.from(input).length > max)
		fail("TEXT_LIMIT", `${field} 超出 ${max} 字符限制。`, nodeId);
	return input;
}

export function isSafeHyperLink(input: string): boolean {
	if (
		!input ||
		input !== input.trim() ||
		Array.from(input).some(
			(char) =>
				char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\",
		)
	)
		return false;
	if (input.startsWith("#")) return input.length > 1;
	if (input.startsWith("/") && !input.startsWith("//")) return true;
	try {
		const url = new URL(input);
		return (
			["https:", "http:"].includes(url.protocol) &&
			!url.username &&
			!url.password
		);
	} catch {
		return false;
	}
}

function timestamp(input: unknown): string {
	if (
		typeof input !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input) ||
		!Number.isFinite(Date.parse(input))
	) {
		fail("INVALID_DATE", "时间必须使用有效的 UTC ISO 格式。");
	}
	return input;
}

function paperIdentifier(input: unknown): string {
	const value = text(input, 256, "论文 ID");
	if (
		!value.trim() ||
		Array.from(value).some(
			(char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
		)
	)
		fail("INVALID_PAPER", "论文 ID 无效。");
	return value;
}

function readStyle(input: unknown, nodeId: string): NodeStyle {
	const raw = object(input, nodeId);
	const style: NodeStyle = {};
	for (const key of Object.keys(raw)) {
		if (!["fontSize", "fontWeight", "color", "background"].includes(key))
			fail("INVALID_STYLE", "节点样式包含不支持的字段。", nodeId);
	}
	if (raw.fontSize !== undefined) {
		if (![22, 18, 14, 12].includes(raw.fontSize as number))
			fail("INVALID_STYLE", "字号必须为 22 / 18 / 14 / 12px。", nodeId);
		style.fontSize = raw.fontSize as NodeStyle["fontSize"];
	}
	if (raw.fontWeight !== undefined) {
		if (raw.fontWeight !== 400 && raw.fontWeight !== 700)
			fail("INVALID_STYLE", "字重必须为 400 或 700。", nodeId);
		style.fontWeight = raw.fontWeight;
	}
	for (const key of ["color", "background"] as const) {
		if (raw[key] !== undefined) {
			if (
				typeof raw[key] !== "string" ||
				!/^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(raw[key])
			)
				fail("INVALID_STYLE", "颜色必须为十六进制颜色。", nodeId);
			style[key] = raw[key];
		}
	}
	return style;
}

/** strict rejects upload/HTML fields; public projection deliberately drops them. */
function readTree(input: unknown, strict: boolean): TreeData {
	const rawTree = object(input);
	if (rawTree.direction !== 1)
		fail("INVALID_DIRECTION", "解析树须使用单侧向右布局。");
	const seen = new WeakSet<object>();
	const ids = new Set<string>();
	let count = 0;
	function visit(inputNode: unknown, depth: number): TreeNode {
		const raw = object(inputNode);
		const id = text(raw.id, 128, "节点 ID");
		if (!/^[\p{L}\p{N}_.:-]+$/u.test(id))
			fail("INVALID_ID", "节点 ID 无效。", id);
		if (seen.has(raw)) fail("CYCLE", "树包含循环或重复节点引用。", id);
		seen.add(raw);
		if (ids.has(id)) fail("DUPLICATE_ID", "节点 ID 重复。", id);
		ids.add(id);
		if (++count > 500) fail("NODE_LIMIT", "解析树最多包含 500 个节点。", id);
		if (depth > 32) fail("DEPTH_LIMIT", "解析树深度不能超过 32。", id);
		if (
			strict &&
			[
				"image",
				"images",
				"attachment",
				"attachments",
				"html",
				"dangerouslySetInnerHTML",
				"svg",
			].some((key) => Object.hasOwn(raw, key))
		) {
			fail(
				"UNSUPPORTED_CONTENT",
				"树数据不能包含图片、附件或原始 HTML 字段。",
				id,
			);
		}
		const node: TreeNode = { id, topic: text(raw.topic, 1000, "节点标题", id) };
		if (raw.note !== undefined)
			node.note = text(raw.note, 20000, "节点说明", id);
		if (raw.hyperLink !== undefined) {
			const link = text(raw.hyperLink, 2000, "链接", id);
			if (!isSafeHyperLink(link))
				fail("UNSAFE_LINK", "链接须为安全的 HTTP 地址或正文锚点。", id);
			node.hyperLink = link;
		}
		if (raw.expanded !== undefined) {
			if (typeof raw.expanded !== "boolean")
				fail("INVALID_EXPANDED", "展开状态必须为布尔值。", id);
			node.expanded = raw.expanded;
		}
		if (raw.style !== undefined) node.style = readStyle(raw.style, id);
		if (raw.children !== undefined) {
			if (!Array.isArray(raw.children))
				fail("INVALID_CHILDREN", "子节点必须为数组。", id);
			node.children = raw.children.map((child) => visit(child, depth + 1));
		}
		return node;
	}
	return { nodeData: visit(rawTree.nodeData, 0), direction: 1 };
}

function checkSize(input: unknown): void {
	let json: string | undefined;
	try {
		json = JSON.stringify(input, (key, value) =>
			key === "parent" ? undefined : value,
		);
	} catch {
		fail("INVALID_JSON", "树数据无法序列化为 JSON。");
	}
	if (!json || new TextEncoder().encode(json).byteLength > 1048576)
		fail("SIZE_LIMIT", "树 JSON 不能超过 1 MiB。");
}

export function validateDraft(input: unknown, paperId: string): DraftTree {
	const raw = object(input);
	if (raw.schemaVersion !== 1) fail("SCHEMA_VERSION", "不支持此树数据版本。");
	const identifier = paperIdentifier(raw.paperId);
	if (identifier !== paperIdentifier(paperId))
		fail("PAPER_MISMATCH", "树数据不属于当前论文。");
	const templateId =
		raw.templateId === null ? null : text(raw.templateId, 128, "模板 ID");
	const draft: DraftTree = {
		schemaVersion: 1,
		paperId: identifier,
		templateId,
		updatedAt: timestamp(raw.updatedAt),
		tree: readTree(raw.tree, true),
	};
	checkSize(input);
	return draft;
}

export function toPublicSnapshot(
	draft: DraftTree,
	snapshotId: string,
	publishedAt: string,
): PublicSnapshot {
	if (
		!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
			snapshotId,
		)
	)
		fail("INVALID_SNAPSHOT", "公开版本 ID 无效。");
	if (draft.schemaVersion !== 1) fail("SCHEMA_VERSION", "不支持此树数据版本。");
	const snapshot: PublicSnapshot = {
		schemaVersion: 1,
		snapshotId,
		paperId: paperIdentifier(draft.paperId),
		publishedAt: timestamp(publishedAt),
		tree: readTree(draft.tree, false),
	};
	checkSize(snapshot);
	return snapshot;
}

export function cloneBranch(node: TreeNode): TreeNode {
	const clean = readTree({ nodeData: node, direction: 1 }, true).nodeData;
	function reidentify(node: TreeNode): TreeNode {
		node.id = globalThis.crypto.randomUUID();
		for (const child of node.children ?? []) reidentify(child);
		return node;
	}
	return reidentify(clean);
}

export function importDraft(input: unknown, paperId: string): DraftTree {
	const raw = object(input);
	const validated = validateDraft(input, paperIdentifier(raw.paperId));
	return validateDraft(
		{
			...validated,
			paperId,
			updatedAt: new Date().toISOString(),
			tree: {
				...validated.tree,
				nodeData: cloneBranch(validated.tree.nodeData),
			},
		},
		paperId,
	);
}

export interface FlatTreeNode {
	node: TreeNode;
	depth: number;
	parentId?: string;
}

export function flattenTree(tree: TreeData): FlatTreeNode[] {
	const result: FlatTreeNode[] = [];
	function visit(node: TreeNode, depth: number, parentId?: string): void {
		result.push({ node, depth, ...(parentId ? { parentId } : {}) });
		for (const child of node.children ?? []) visit(child, depth + 1, node.id);
	}
	visit(tree.nodeData, 0);
	return result;
}
