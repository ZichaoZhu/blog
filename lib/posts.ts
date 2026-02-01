import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, PostFrontmatter } from '@/types';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export async function getAllPosts(): Promise<Post[]> {
  try {
    const entries = fs.readdirSync(postsDirectory, { withFileTypes: true });
    
    const posts = await Promise.all(
      entries
        .filter(entry => entry.isDirectory())
        .map(async entry => {
          const slug = entry.name;
          return await getPostBySlug(slug);
        })
    );
    
    return posts
      .filter((post): post is Post => post !== null && !post.frontmatter.draft)
      .sort((a, b) => 
        new Date(b.frontmatter.date).getTime() - 
        new Date(a.frontmatter.date).getTime()
      );
  } catch (error) {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = path.join(postsDirectory, slug, 'index.mdx');
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    const stats = readingTime(content);
    
    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content,
      readingTime: stats.text
    };
  } catch (error) {
    return null;
  }
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => 
    post.frontmatter.tags.includes(tag)
  );
}

export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => 
    post.frontmatter.author === authorId
  );
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => 
    post.frontmatter.category === category
  );
}

export async function getAllTags(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const tags = new Set<string>();
  
  allPosts.forEach(post => {
    post.frontmatter.tags.forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).sort();
}

export async function getAllCategories(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const categories = new Set<string>();
  
  allPosts.forEach(post => {
    categories.add(post.frontmatter.category);
  });
  
  return Array.from(categories).sort();
}
