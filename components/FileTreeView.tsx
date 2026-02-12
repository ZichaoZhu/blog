'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronDown, Folder as FolderIcon, FileText } from 'lucide-react';
import type { FileTreeItem, Folder, Post } from '@/types';

interface FileTreeViewProps {
  items: FileTreeItem[];
  level?: number;
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
  const [isOpen, setIsOpen] = useState(!folder.metadata.collapsed);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-left"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <ChevronRight 
          className={`w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        
        {folder.metadata.icon ? (
          <span className="text-lg leading-none">{folder.metadata.icon}</span>
        ) : (
          <FolderIcon className="w-4 h-4 text-yellow-500" />
        )}
        
        <span className="font-medium flex-1 text-gray-900 dark:text-gray-100">
          {folder.metadata.displayName || folder.metadata.name}
        </span>
        
        <span className="text-xs text-gray-500 dark:text-gray-400">
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
  const isActive = pathname === `/blog/${post.slug}`;
  
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md transition-colors group
        ${isActive 
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
      style={{ paddingLeft: `${level * 1.5 + 2.25}rem` }}
    >
      <FileText className={`w-4 h-4 flex-shrink-0 ${
        isActive 
          ? 'text-blue-600 dark:text-blue-400' 
          : 'text-gray-400 dark:text-gray-500'
      }`} />
      <span className={`
        flex-1 text-sm transition-colors truncate
        ${isActive 
          ? 'font-medium text-blue-600 dark:text-blue-400' 
          : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
        }
      `}>
        {post.frontmatter.title}
      </span>
    </Link>
  );
}
