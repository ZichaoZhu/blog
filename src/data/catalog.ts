import type {
	CourseDefinition,
	NoteType,
	TopicDefinition,
	Visibility,
} from "../utils/note-model";

export const courses: CourseDefinition[] = [
	{
		id: "compiler-principles",
		title: "编译原理",
		description: "从词法、语法与语义分析，到中间代码、指令选择和活跃性分析。",
		sourcePrefix: "Coure-Notebook/Compiler_Principle",
		topic: "compilers",
		introPath: "Coure-Notebook/Compiler_Principle",
	},
	{
		id: "operating-systems",
		title: "操作系统",
		description: "进程、线程、调度、同步、内存与文件系统课程笔记。",
		sourcePrefix: "Coure-Notebook/Operating_System",
		topic: "operating-systems",
	},
	{
		id: "reinforcement-learning",
		title: "强化学习",
		description: "从基本概念和 Bellman 方程，到动态规划与 Monte Carlo 学习。",
		sourcePrefix: "Coure-Notebook/Reinforcement_learning",
		topic: "reinforcement-learning",
	},
	{
		id: "deep-learning-computer-vision",
		title: "Deep Learning for Computer Vision",
		description: "Stanford CS231N 课程笔记。",
		sourcePrefix: "Coure-Notebook/Deep_Learning_for_Computer_Vision",
		topic: "3d-vision",
		introPath: "Coure-Notebook/Deep_Learning_for_Computer_Vision",
	},
	{
		id: "japanese",
		title: "日语学习",
		description: "五十音、声调、浊音与长音的学习记录。",
		sourcePrefix: "Language/JP_learning",
		topic: "japanese",
	},
];

export const topics: TopicDefinition[] = [
	{
		id: "reinforcement-learning",
		name: "强化学习",
		description: "价值函数、策略学习与机器人控制。",
	},
	{
		id: "robotics",
		name: "机器人",
		description: "机器人运动、控制与真实系统适应。",
	},
	{
		id: "imitation-learning",
		name: "模仿学习",
		description: "从动作数据和先验中学习技能。",
	},
	{
		id: "world-models",
		name: "世界模型",
		description: "环境建模、预测与规划。",
	},
	{
		id: "3d-vision",
		name: "三维视觉",
		description: "几何、深度、法线与三维视觉表示。",
	},
	{
		id: "gaussian-splatting",
		name: "高斯泼溅",
		description: "基于 3D Gaussian Splatting 的表示与应用。",
	},
	{
		id: "operating-systems",
		name: "操作系统",
		description: "计算机系统资源管理与抽象。",
	},
	{
		id: "compilers",
		name: "编译原理",
		description: "语言处理、程序分析与代码生成。",
	},
	{
		id: "japanese",
		name: "日语学习",
		description: "语音、文字与语言学习记录。",
	},
];

const collectionPaths = new Set([
	"Coure-Notebook",
	"Coure-Notebook/Compiler_Principle",
	"Coure-Notebook/Deep_Learning_for_Computer_Vision",
	"Paper-Reading",
	"Reaserch_Note",
]);

const titleOverrides: Record<string, string> = {
	"Paper-Reading/Computer-Vision/3D_Common_Corruptions_and_Data_Augmentation_笔记":
		"3D Common Corruptions and Data Augmentation 论文笔记",
	"Paper-Reading/Computer-Vision/InfiniDepth_笔记": "InfiniDepth 论文笔记",
	"Reaserch_Note/260707": "法线估计方法调研与数据集疑问",
};

const summaryOverrides: Record<string, string> = {
	"Reaserch_Note/260707":
		"记录 StableNormal 在 Hypersim 上的初步观察、数据集疑问与下一步验证计划。",
};

const tagTopics: Record<string, string> = {
	编译原理: "compilers",
	操作系统: "operating-systems",
	强化学习: "reinforcement-learning",
	机器人: "robotics",
	四足机器人: "robotics",
	机器人跑酷: "robotics",
	双臂操作: "robotics",
	模仿学习: "imitation-learning",
	对抗学习: "imitation-learning",
	世界模型: "world-models",
	高斯泼溅: "gaussian-splatting",
	日语: "japanese",
	日语学习: "japanese",
};

function asciiSlug(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/\+\+/g, "-plus-plus")
		.replace(/笔记/g, "")
		.replace(/&/g, "-and-")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

export function courseForPath(path: string): CourseDefinition | undefined {
	return courses.find(
		(course) =>
			path === course.sourcePrefix ||
			path.startsWith(`${course.sourcePrefix}/`),
	);
}

export function classifyContent(
	path: string,
	tags: string[],
	rawTitle: string,
): {
	contentKind: "note" | "collection";
	title: string;
	summary?: string;
	noteType: NoteType;
	visibility: Visibility;
	slug: string;
	topics: string[];
	courseId?: string;
	order?: number;
} {
	const course = courseForPath(path);
	const leaf = path.split("/").at(-1) ?? path;
	let noteType: NoteType = "note";
	let visibility: Visibility = "published";
	let slug = asciiSlug(leaf);
	let order: number | undefined;

	if (course) {
		noteType = "course";
		slug = `${course.id}-${asciiSlug(leaf)}`;
		const lecture = /^Lec(\d+)/i.exec(leaf);
		order = lecture ? Number(lecture[1]) : undefined;
	} else if (path.startsWith("Paper-Reading/")) {
		noteType = "paper";
		slug = `${asciiSlug(leaf)}-reading`;
	} else if (path.startsWith("Reaserch_Note/")) {
		noteType = "log";
		slug =
			path === "Reaserch_Note/260707"
				? "research-log-2026-07-07"
				: asciiSlug(leaf);
	}

	if (
		["callouts-demo", "typora-test", "hello-world"].includes(path) ||
		path === "Coure-Notebook/Deep_Learning_for_Computer_Vision/Lec1"
	)
		visibility = "unlisted";

	const topicIds = new Set(tags.map((tag) => tagTopics[tag]).filter(Boolean));
	if (course) topicIds.add(course.topic);
	if (path.startsWith("Paper-Reading/Robots/")) topicIds.add("robotics");
	if (path.startsWith("Paper-Reading/Manigaussian/"))
		topicIds.add("gaussian-splatting");
	if (
		path.startsWith("Paper-Reading/Computer-Vision/") ||
		path.startsWith("Reaserch_Note/")
	)
		topicIds.add("3d-vision");

	return {
		contentKind: collectionPaths.has(path)
			? ("collection" as const)
			: ("note" as const),
		title: titleOverrides[path] ?? rawTitle,
		summary: summaryOverrides[path],
		noteType,
		visibility,
		slug,
		topics: [...topicIds],
		courseId: course?.id,
		order,
	};
}

export const topicById = (id: string): TopicDefinition | undefined =>
	topics.find((topic) => topic.id === id);
export const courseById = (id: string): CourseDefinition | undefined =>
	courses.find((course) => course.id === id);

export const noteTypeLabels: Record<NoteType, string> = {
	course: "课程笔记",
	paper: "论文阅读",
	log: "科研日志",
	idea: "研究想法",
	experiment: "实验记录",
	note: "笔记",
};
