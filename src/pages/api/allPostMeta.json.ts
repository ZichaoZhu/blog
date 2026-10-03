import { getSortedPosts } from "@/utils/content-utils";

export async function GET(): Promise<Response> {
	const posts = await getSortedPosts();

	const allPostsData = posts
		.map((post) => ({
			id: post.data.slug,
			title: post.data.title,
			description: post.data.description,
			published: post.data.published?.getTime() ?? null,
			category: post.data.category || "",
			password: !!post.data.password,
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => (b.published ?? -Infinity) - (a.published ?? -Infinity));

	return new Response(JSON.stringify(allPostsData));
}
