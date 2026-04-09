import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, PostFrontmatter, Folder, FolderMetadata, FileTreeItem, FileTree } from '@/types';
import { countWords } from '@/lib/utils';

const postsDirectory = path.join(process.cwd(), 'content/posts');

/** 递归扫描目录 */
function scanDirectory(
  dirPath: string,
  relativePath: string = ''
): FileTreeItem[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items: FileTreeItem[] = [];

  for (const entry of entries) {
    // 跳过隐藏文件和元数据文件
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const itemRelativePath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      // 递归扫描子文件夹
      const folder = loadFolder(itemRelativePath, fullPath);
      if (folder) items.push(folder);
    }
  }

  return items;
}

/** 加载文件夹 */
function loadFolder(relativePath: string, fullPath: string): Folder | null {
  const metaPath = path.join(fullPath, '.folder.json');
  let metadata: FolderMetadata = {
    name: path.basename(relativePath),
  };

  // 读取元数据
  if (fs.existsSync(metaPath)) {
    try {
      const metaContent = fs.readFileSync(metaPath, 'utf8');
      metadata = { ...metadata, ...JSON.parse(metaContent) };
    } catch (error) {
      console.error(`Error loading folder metadata: ${metaPath}`, error);
    }
  }

  const items: FileTreeItem[] = [];
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    if (entry.isFile() && entry.name.endsWith('.md')) {
      // index.md 对应路径为文件夹名，其他文件对应 文件夹名/文件名
      const mdRelativePath = entry.name === 'index.md'
        ? relativePath
        : `${relativePath}/${entry.name.replace(/\.md$/, '')}`;
      const post = loadPost(mdRelativePath, fullPath, entry.name);
      if (post) items.push(post);
    } else if (entry.isDirectory()) {
      const folder = loadFolder(`${relativePath}/${entry.name}`, path.join(fullPath, entry.name));
      if (folder) items.push(folder);
    }
  }

  if (items.length === 0) return null; // 空文件夹不显示

  // 计算文章总数
  const postCount = countPosts(items);

  return {
    type: 'folder',
    path: relativePath,
    metadata,
    children: items,
    postCount,
  };
}

/** 加载文章 */
function loadPost(relativePath: string, fullPath: string, mdFile: string = 'index.md'): Post | null {
  try {
    const mdPath = path.join(fullPath, mdFile);
    const fileContents = fs.readFileSync(mdPath, 'utf8');
    const { data, content } = matter(fileContents);

    if (data.draft) return null; // 跳过草稿

    const stats = readingTime(content);
    const pathParts = relativePath.split('/');
    const slug = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1
      ? pathParts.slice(0, -1).join('/')
      : undefined;

    // 规范化 frontmatter，避免缺失字段导致后续渲染崩溃
    let date: string;
    if (typeof data.date === 'string') {
      date = data.date;
    } else if (data.date instanceof Date) {
      date = data.date.toISOString().split('T')[0];
    } else {
      // 仅当 frontmatter 未提供日期时才 stat 文件
      date = fs.statSync(mdPath).mtime.toISOString().split('T')[0];
    }

    const frontmatter: PostFrontmatter = {
      title: typeof data.title === 'string' && data.title ? data.title : slug,
      date,
      description: typeof data.description === 'string' ? data.description : '',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      category: typeof data.category === 'string' ? data.category : '未分类',
      author: typeof data.author === 'string' ? data.author : '',
      coverImage: typeof data.coverImage === 'string' ? data.coverImage : undefined,
      draft: data.draft === true,
    };

    return {
      type: 'post',
      slug,
      path: relativePath,
      parentPath,
      frontmatter,
      content,
      readingTime: stats.text,
      wordCount: countWords(content),
    };
  } catch (error) {
    console.error(`Error loading post: ${relativePath}`, error);
    return null;
  }
}

/** 计算文章总数 */
function countPosts(items: FileTreeItem[]): number {
  return items.reduce((count, item) => {
    if (item.type === 'post') return count + 1;
    return count + item.postCount;
  }, 0);
}

/** 扁平化文章列表 */
function flattenPosts(items: FileTreeItem[]): Post[] {
  const posts: Post[] = [];
  
  for (const item of items) {
    if (item.type === 'post') {
      posts.push(item);
    } else {
      posts.push(...flattenPosts(item.children));
    }
  }
  
  return posts;
}

// 文件树缓存：
// - 生产构建：长 TTL（构建时只扫一次目录，进程结束就没了）
// - 开发模式：禁用缓存，新增/重命名文章无需重启 dev server
let fileTreeCache: { data: FileTree | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// dev 用 30 秒短 TTL,刚好能吸收一次交互内的多次 fetch,又不会让新文章等太久
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 30 * 1000;

/** 获取文件树 */
export async function getFileTree(): Promise<FileTree> {
  const now = Date.now();
  if (CACHE_TTL > 0 && fileTreeCache.data && now - fileTreeCache.timestamp < CACHE_TTL) {
    return fileTreeCache.data;
  }

  try {
    const root = scanDirectory(postsDirectory);
    const flat = flattenPosts(root);
    
    // 按日期排序
    flat.sort((a, b) => 
      new Date(b.frontmatter.date).getTime() - 
      new Date(a.frontmatter.date).getTime()
    );

    // 构建文件夹映射
    const folders = new Map<string, Folder>();
    function collectFolders(items: FileTreeItem[]) {
      for (const item of items) {
        if (item.type === 'folder') {
          folders.set(item.path, item);
          collectFolders(item.children);
        }
      }
    }
    collectFolders(root);

    const result = { root, flat, folders };
    
    // 更新缓存
    fileTreeCache = {
      data: result,
      timestamp: now,
    };

    return result;
  } catch (error) {
    console.error('Error building file tree:', error);
    const emptyResult = { root: [], flat: [], folders: new Map() };
    
    // 缓存空结果（避免错误情况频繁扫描）
    fileTreeCache = {
      data: emptyResult,
      timestamp: now,
    };
    
    return emptyResult;
  }
}

/** 获取所有文章(扁平) - 向后兼容 */
export async function getAllPosts(): Promise<Post[]> {
  const tree = await getFileTree();
  return tree.flat;
}

/** 根据路径获取文章 */
export async function getPostByPath(postPath: string): Promise<Post | null> {
  const tree = await getFileTree();
  return tree.flat.find(p => p.path === postPath) || null;
}

/** 根据作者 ID 获取文章(作者详情页用) */
export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => post.frontmatter.author === authorId);
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
