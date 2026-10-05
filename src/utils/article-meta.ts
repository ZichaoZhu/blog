import { courses, topics } from "../data/catalog";
import type { NoteData } from "./note-model";
import { getTagUrl } from "./url-utils";

export const noteTypeLabels = {
	course: "课程笔记",
	paper: "论文阅读",
	log: "研究日志",
	idea: "研究想法",
	experiment: "实验记录",
	note: "笔记",
};

export interface ArticleMetaValue {
	text: string;
	url?: string;
	date?: string;
}
export interface ArticleMetaField {
	key: string;
	label: string;
	icon: string;
	values: ArticleMetaValue[];
	caption?: boolean;
}

export function getArticleMetadata(
	data: NoteData,
	stats: { words?: number; minutes?: number },
): ArticleMetaField[][] {
	const identity: ArticleMetaField[] = [
		{
			key: "author",
			label: "作者",
			icon: "material-symbols:person-outline-rounded",
			values: [{ text: data.author }],
		},
		{
			key: "date",
			label: "发布日期",
			icon: "material-symbols:calendar-today-outline-rounded",
			caption: true,
			values: [
				data.date
					? { text: data.date, date: data.date }
					: { text: "日期未记录" },
			],
		},
	];
	if (data.updatedAt)
		identity.push({
			key: "updatedAt",
			label: "更新日期",
			icon: "material-symbols:edit-calendar-outline-rounded",
			caption: true,
			values: [{ text: data.updatedAt, date: data.updatedAt }],
		});
	identity.push({
		key: "type",
		label: "记录类型",
		icon: "material-symbols:book-2-outline-rounded",
		values: [{ text: noteTypeLabels[data.type] }],
	});

	const subjects: ArticleMetaField[] = [];
	const course =
		data.type === "course" &&
		courses.find((item) => item.id === data.course?.id);
	if (course)
		subjects.push({
			key: "course",
			label: "课程",
			icon: "material-symbols:school-outline-rounded",
			values: [
				{ text: course.title, url: `/courses/${course.id}/` },
				...(data.course?.order !== undefined
					? [{ text: `第 ${data.course.order} 讲` }]
					: []),
			],
		});
	const topicValues = data.topics.flatMap((id) => {
		const topic = topics.find((item) => item.id === id);
		return topic ? [{ text: topic.name, url: `/topics/${id}/` }] : [];
	});
	if (topicValues.length)
		subjects.push({
			key: "topics",
			label: "主题",
			icon: "material-symbols:category-outline-rounded",
			values: topicValues,
		});
	if (data.tags?.length)
		subjects.push({
			key: "tags",
			label: "标签",
			icon: "material-symbols:tag-rounded",
			values: data.tags.map((tag) => ({ text: tag, url: getTagUrl(tag) })),
		});

	const reading: ArticleMetaField[] = [];
	if (typeof stats.words === "number")
		reading.push({
			key: "words",
			label: "字数",
			icon: "material-symbols:notes-rounded",
			caption: true,
			values: [{ text: `${stats.words.toLocaleString("en-US")} 字` }],
		});
	if (typeof stats.minutes === "number")
		reading.push({
			key: "minutes",
			label: "预计阅读时长",
			icon: "material-symbols:schedule-outline-rounded",
			caption: true,
			values: [{ text: `${stats.minutes} 分钟阅读` }],
		});
	return [identity, subjects, reading].filter((row) => row.length);
}
