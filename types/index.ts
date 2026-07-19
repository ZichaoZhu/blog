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

export interface Post {
  type: 'post';           // 新增: 用于类型判断
  slug: string;
  path: string;           // 新增: 完整路径，如 "frontend/react-hooks"
  parentPath?: string;    // 新增: 父文件夹路径，如 "frontend"
  frontmatter: PostFrontmatter;
  content: string;
  readingTime?: string;
  wordCount: number;      // 服务端预计算,避免客户端卡片每次渲染都扫正文
  // 预留扩展字段
  series?: string;
  relatedPosts?: string[];
}

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
    [key: string]: any;     // 可扩展
  };
}

/** 文件夹项(带子项) */
export interface Folder {
  type: 'folder';
  path: string;             // 相对路径，如 "frontend" 或 "backend/database"
  metadata: FolderMetadata;
  children: (Folder | Post)[]; // 递归结构
  postCount: number;        // 文章总数(包括子文件夹)
}

/** 文件树项(联合类型) */
export type FileTreeItem = Folder | Post;

/** 文件树结构 */
export interface FileTree {
  root: FileTreeItem[];    // 根级别项目
  flat: Post[];           // 扁平化文章列表(用于搜索/过滤)
  folders: Map<string, Folder>; // 路径 -> 文件夹映射
}

export type ViewType = 'list' | 'card';
