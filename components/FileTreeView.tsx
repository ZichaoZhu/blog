'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Folder as FolderIcon, FileText } from 'lucide-react';
import type { FileTreeItem, Folder, Post } from '@/types';

interface FileTreeViewProps {
  items: FileTreeItem[];
  level?: number;
}

/** 递归判断该文件夹(或任一子文件夹)是否包含与当前 pathname 匹配的文章 */
function containsActivePost(folder: Folder, activePath: string): boolean {
  for (const child of folder.children) {
    if (child.type === 'post') {
      if (`/blog/${child.path}` === activePath) return true;
    } else if (containsActivePost(child, activePath)) {
      return true;
    }
  }
  return false;
}

export function FileTreeView({ items, level = 0 }: FileTreeViewProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        item.type === 'folder' ? (
          <FolderItem key={item.path} folder={item} level={level} />
        ) : (
          <PostItem key={item.path} post={item} level={level} />
        )
      ))}
    </div>
  );
}

function FolderItem({ folder, level }: { folder: Folder; level: number }) {
  const pathname = usePathname();
  // 默认折叠;但若文件夹(或子文件夹)包含当前文章,则自动展开,方便定位。
  // 显式 "collapsed": false 同样保持展开。
  const hasActive = containsActivePost(folder, pathname);
  const [isOpen, setIsOpen] = useState(
    folder.metadata.collapsed === false || hasActive,
  );

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors hover:bg-white/60 dark:hover:bg-white/10"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <ChevronRight
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />

        {folder.metadata.icon ? (
          <span className="text-lg leading-none">{folder.metadata.icon}</span>
        ) : (
          <FolderIcon className="w-4 h-4 text-amber-500" />
        )}

        <span className="font-medium flex-1 text-foreground">
          {folder.metadata.displayName || folder.metadata.name}
        </span>

        <span className="text-xs text-muted-foreground">
          {folder.postCount}
        </span>
      </button>

      {folder.children.length > 0 && (
        <div 
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="mt-1">
              <FileTreeView items={folder.children} level={level + 1} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostItem({ post, level }: { post: Post; level: number }) {
  const pathname = usePathname();
  const isActive = pathname === `/blog/${post.path}`;

  return (
    <Link
      href={`/blog/${post.path}`}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md transition-colors group
        ${isActive
          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          : 'hover:bg-white/60 dark:hover:bg-white/10'
        }
      `}
      style={{ paddingLeft: `${level * 1.5 + 2.25}rem` }}
    >
      <FileText
        className={`w-4 h-4 flex-shrink-0 ${
          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground'
        }`}
      />
      <span
        className={`
          flex-1 text-sm transition-colors truncate
          ${isActive
            ? 'font-medium text-indigo-600 dark:text-indigo-400'
            : 'text-foreground/80 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
          }
        `}
      >
        {post.frontmatter.title}
      </span>
    </Link>
  );
}
