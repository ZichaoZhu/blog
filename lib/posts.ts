import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type {
  PostDocument,
  PostFrontmatter,
  PostSummary,
  Folder,
  FolderMetadata,
  FileTreeItem,
  FileTree,
  ContentTree,
} from '@/types';
import { countWords } from '@/lib/utils';
import { siteConfig } from '@/lib/site';

const postsDirectory = path.join(process.cwd(), 'content/posts');

interface ScanContext {
  postsDirectory: string;
  sourceFiles: Map<string, string>;
}

/** 仅服务端持有的路由 -> Markdown 源文件映射。 */
let sourceFiles = new Map<string, string>();

/** 自然序比较 (Lec1 < Lec2 < Lec10,而不是字典序 Lec1 < Lec10 < Lec2) */
const NATURAL = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * 同一层级内排序:
 *   1. 文件夹永远在文章之前
 *   2. 同为文件夹: .folder.json 的 order 优先,缺失者视为 +∞;相同则按 displayName 自然序
 *   3. 同为文章:   frontmatter.order 优先,缺失者视为 +∞;相同则按 slug 自然序
 */
function sortTreeItems(items: FileTreeItem[]): void {
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

    if (a.type === 'folder' && b.type === 'folder') {
      const ao = a.metadata.order ?? Number.POSITIVE_INFINITY;
      const bo = b.metadata.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return NATURAL.compare(
        a.metadata.displayName || a.metadata.name,
        b.metadata.displayName || b.metadata.name,
      );
    }

    if (a.type === 'post' && b.type === 'post') {
      const ao = a.frontmatter.order ?? Number.POSITIVE_INFINITY;
      const bo = b.frontmatter.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return NATURAL.compare(a.slug, b.slug);
    }

    return 0;
  });
}

/** 递归扫描目录 */
function scanDirectory(
  dirPath: string,
  context: ScanContext,
  relativePath: string = '',
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
      const folder = loadFolder(itemRelativePath, fullPath, context);
      if (folder) items.push(folder);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const postPath = itemRelativePath.replace(/\.md$/, '');
      const post = loadPost(postPath, dirPath, entry.name, context);
      if (post) items.push(post);
    }
  }

  sortTreeItems(items);
  return items;
}

/** 加载文件夹 */
function loadFolder(
  relativePath: string,
  fullPath: string,
  context: ScanContext,
): Folder | null {
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
      const post = loadPost(mdRelativePath, fullPath, entry.name, context);
      if (post) items.push(post);
    } else if (entry.isDirectory()) {
      const folder = loadFolder(
        `${relativePath}/${entry.name}`,
        path.join(fullPath, entry.name),
        context,
      );
      if (folder) items.push(folder);
    }
  }

  if (items.length === 0) return null; // 空文件夹不显示

  sortTreeItems(items);

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
function createExcerpt(content: string, maxLength = 220): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+] |\d+\.\s+)/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~=^]/g, '')
    .replace(/\$+[^$]*\$+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length > maxLength
    ? `${plain.slice(0, maxLength).trimEnd()}…`
    : plain;
}

function normalizeDate(value: unknown, mdPath: string): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return fs.statSync(mdPath).mtime.toISOString().split('T')[0];
}

function loadPost(
  relativePath: string,
  fullPath: string,
  mdFile: string,
  context: ScanContext,
): PostSummary | null {
  try {
    const mdPath = path.join(fullPath, mdFile);
    const fileContents = fs.readFileSync(mdPath, 'utf8');
    const { data, content } = matter(fileContents);

    if (data.draft === true) return null; // 仅跳过显式布尔草稿

    const stats = readingTime(content);
    const pathParts = relativePath.split('/');
    const slug = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1
      ? pathParts.slice(0, -1).join('/')
      : undefined;

    // 规范化 frontmatter，避免缺失字段导致后续渲染崩溃
    const date = normalizeDate(data.date, mdPath);

    const frontmatter: PostFrontmatter = {
      title: typeof data.title === 'string' && data.title ? data.title : slug,
      date,
      description: typeof data.description === 'string' ? data.description : '',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      category: typeof data.category === 'string' ? data.category : '未分类',
      author: typeof data.author === 'string' && data.author.trim()
        ? data.author.trim()
        : siteConfig.primaryAuthorId,
      coverImage: typeof data.coverImage === 'string' ? data.coverImage : undefined,
      draft: data.draft === true,
      order: typeof data.order === 'number' ? data.order : undefined,
    };

    const post: PostSummary = {
      type: 'post',
      slug,
      path: relativePath,
      parentPath,
      frontmatter,
      excerpt: typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : createExcerpt(content),
      readingTime: stats.text,
      wordCount: countWords(content),
    };

    context.sourceFiles.set(
      relativePath,
      path.relative(context.postsDirectory, mdPath),
    );
    return post;
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
function flattenPosts(items: FileTreeItem[]): PostSummary[] {
  const posts: PostSummary[] = [];
  
  for (const item of items) {
    if (item.type === 'post') {
      posts.push(item);
    } else {
      posts.push(...flattenPosts(item.children));
    }
  }
  
  return posts;
}

function buildContentIndex(
  directory: string,
  scannedSourceFiles: Map<string, string>,
): FileTree {
  const context: ScanContext = {
    postsDirectory: directory,
    sourceFiles: scannedSourceFiles,
  };
  const root = scanDirectory(directory, context);
  const flat = flattenPosts(root);
  const seenPaths = new Set<string>();

  for (const post of flat) {
    if (seenPaths.has(post.path)) {
      throw new Error(`Duplicate post path: ${post.path}`);
    }
    seenPaths.add(post.path);
  }

  flat.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );

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

  return { root, flat, folders };
}

/**
 * Build a content summary index from an arbitrary posts directory. This is
 * also used by fixture-based validation without changing the process cwd.
 */
export function buildContentIndexFromDirectory(directory: string): FileTree {
  return buildContentIndex(path.resolve(directory), new Map());
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
    const scannedSourceFiles = new Map<string, string>();
    const result = buildContentIndex(postsDirectory, scannedSourceFiles);
    sourceFiles = scannedSourceFiles;
    
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
export async function getAllPosts(): Promise<PostSummary[]> {
  const tree = await getFileTree();
  return tree.flat;
}

/** 根据路径获取文章 */
export async function getPostByPath(postPath: string): Promise<PostSummary | null> {
  const tree = await getFileTree();
  return tree.flat.find(p => p.path === postPath) || null;
}

/** 根据作者 ID 获取文章(作者详情页用) */
export async function getPostsByAuthor(authorId: string): Promise<PostSummary[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => post.frontmatter.author === authorId);
}

/** 新的显式摘要索引 API。 */
export async function getContentIndex(): Promise<ContentTree> {
  return getFileTree();
}

/** 仅读取当前文章正文，不把它塞入全站文件树。 */
export async function getPostDocument(postPath: string): Promise<PostDocument | null> {
  const summary = await getPostByPath(postPath);
  if (!summary) return null;

  const sourceFile = sourceFiles.get(postPath);
  if (!sourceFile) return null;

  try {
    const absolutePath = path.join(postsDirectory, sourceFile);
    const raw = await fs.promises.readFile(absolutePath, 'utf8');
    const { content } = matter(raw);
    return { ...summary, content, sourceFile };
  } catch (error) {
    console.error(`Error loading post document: ${postPath}`, error);
    return null;
  }
}

/** 文章页左侧只需要当前顶层主题，不必序列化整棵树。 */
export async function getTopicTreeForPost(postPath: string): Promise<FileTreeItem[]> {
  const tree = await getFileTree();
  const topLevelPath = postPath.split('/')[0];
  const topic = tree.root.find((item) => item.path === topLevelPath);
  return topic ? [topic] : [];
}

function flattenInTreeOrder(items: FileTreeItem[]): PostSummary[] {
  const result: PostSummary[] = [];
  for (const item of items) {
    if (item.type === 'post') result.push(item);
    else result.push(...flattenInTreeOrder(item.children));
  }
  return result;
}

export async function getAdjacentPosts(postPath: string): Promise<{
  previous: PostSummary | null;
  next: PostSummary | null;
}> {
  const current = await getPostByPath(postPath);
  if (!current) return { previous: null, next: null };

  const tree = await getFileTree();
  const ordered = flattenInTreeOrder(tree.root).filter(
    (post) => post.parentPath === current.parentPath,
  );
  const index = ordered.findIndex((post) => post.path === postPath);
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null,
  };
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
