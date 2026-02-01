export interface Author {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  tags: string[];
  category: string;
  author: string;
  coverImage?: string;
  draft?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime?: string;
  // 预留扩展字段
  series?: string;
  relatedPosts?: string[];
}

export type ViewType = 'list' | 'card';
