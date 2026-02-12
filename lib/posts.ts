import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Post, PostFrontmatter, Folder, FolderMetadata, FileTreeItem, FileTree } from '@/types';

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
      // 检查是否是文章目录(包含 index.mdx)
      const mdxPath = path.join(fullPath, 'index.mdx');
      
      if (fs.existsSync(mdxPath)) {
        // 是文章
        const post = loadPost(itemRelativePath, fullPath);
        if (post) items.push(post);
      } else {
        // 是文件夹 - 递归扫描
        const folder = loadFolder(itemRelativePath, fullPath);
        if (folder) items.push(folder);
      }
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

  // 递归加载子项
  const children = scanDirectory(fullPath, relativePath);

  if (children.length === 0) return null; // 空文件夹不显示

  // 计算文章总数
  const postCount = countPosts(children);

  return {
    type: 'folder',
    path: relativePath,
    metadata,
    children,
    postCount,
  };
}

/** 加载文章 */
function loadPost(relativePath: string, fullPath: string): Post | null {
  try {
    const mdxPath = path.join(fullPath, 'index.mdx');
    const fileContents = fs.readFileSync(mdxPath, 'utf8');
    const { data, content } = matter(fileContents);

    if (data.draft) return null; // 跳过草稿

    const stats = readingTime(content);
    const pathParts = relativePath.split('/');
    const slug = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 
      ? pathParts.slice(0, -1).join('/') 
      : undefined;

    return {
      type: 'post',
      slug,
      path: relativePath,
      parentPath,
      frontmatter: data as PostFrontmatter,
      content,
      readingTime: stats.text,
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

// 文件树缓存（60秒 TTL）
let fileTreeCache: { data: FileTree | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/** 获取文件树 */
export async function getFileTree(): Promise<FileTree> {
  // 检查缓存
  const now = Date.now();
  if (fileTreeCache.data && now - fileTreeCache.timestamp < CACHE_TTL) {
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

/** 根据 slug 获取文章 - 向后兼容 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const tree = await getFileTree();
  return tree.flat.find(p => p.slug === slug) || null;
}

/** 根据文件夹路径获取文章 */
export async function getPostsByFolder(folderPath: string): Promise<Post[]> {
  const tree = await getFileTree();
  const folder = tree.folders.get(folderPath);
  
  if (!folder) return [];
  return flattenPosts(folder.children);
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
