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
  /** 同一文件夹内的排序权重,越小越靠前。未设置则按文件名自然序 */
  order?: number;
}

/**
 * 可以安全传给 Client Component 的文章摘要。
 * 正文故意不放在这里，避免列表和文件树把全站 Markdown
 * 重复序列化到 HTML / RSC payload。
 */
export interface PostSummary {
  type: 'post';
  slug: string;
  path: string;
  parentPath?: string;
  frontmatter: PostFrontmatter;
  excerpt: string;
  readingTime: string;
  wordCount: number;
  series?: string;
  relatedPosts?: string[];
}

/** 仅在 Server Component / 构建期使用的完整文章。 */
export interface PostDocument extends PostSummary {
  content: string;
  /** 相对于 content/posts 的 Markdown 源文件，用于解析相对资源。 */
  sourceFile: string;
}

/** 旧组件的兼容别名；Post 现在始终表示摘要。 */
export type Post = PostSummary;

/** 文件夹元数据 */
export interface FolderMetadata {
  name: string;              // 文件夹名称(文件系统名)
  displayName?: string;      // 显示名称(可本地化)
  description?: string;      // 文件夹描述
  icon?: string;            // 图标(emoji 或 URL)
  order?: number;           // 排序顺序
  collapsed?: boolean;      // 默认折叠状态
  metadata?: {
    color?: string;         // 文件夹主题色
    coverImage?: string;    // 封面图片
    [key: string]: unknown; // 可扩展
  };
}

/** 文件夹项(带子项) */
export interface Folder {
  type: 'folder';
  path: string;             // 相对路径，如 "frontend" 或 "backend/database"
  metadata: FolderMetadata;
  children: (Folder | PostSummary)[]; // 递归结构
  postCount: number;        // 文章总数(包括子文件夹)
}

/** 文件树项(联合类型) */
export type FileTreeItem = Folder | PostSummary;

/** 文件树结构 */
export interface FileTree {
  root: FileTreeItem[];    // 根级别项目
  flat: PostSummary[];    // 扁平化文章摘要(用于搜索/过滤)
  folders: Map<string, Folder>; // 路径 -> 文件夹映射
}

/** 面向内容 API 的语义化目录树名称。 */
export type ContentTree = FileTree;

export type ViewType = 'list' | 'card';

export interface ContentAssetManifestEntry {
  sourcePath: string;
  url: string;
  width: number;
  height: number;
  ext: string;
  size: number;
  hash: string;
}

export interface ContentDiagnostic {
  severity: 'error' | 'warning';
  file: string;
  message: string;
  line?: number;
}
