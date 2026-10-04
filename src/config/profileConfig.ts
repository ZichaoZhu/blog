import type { ProfileConfig } from "../types/profileConfig";
export const profileConfig: ProfileConfig = {
	avatar: "/avatars/MyGirl.webp",
	name: "Goongmly",
	bio: "课程笔记、论文阅读与科研记录。",
	links: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/ZichaoZhu",
			showName: true,
		},
		{ name: "RSS", icon: "fa7-solid:rss", url: "/rss.xml", showName: true },
	],
};
