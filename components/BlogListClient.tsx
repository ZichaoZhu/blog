'use client';

import { useState, useEffect } from 'react';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { ListLayout } from '@/components/layouts/ListLayout';
import { CardLayout } from '@/components/layouts/CardLayout';
import { FileTreeView } from '@/components/FileTreeView';
import { FolderTree } from 'lucide-react';
import type { Post, ViewType, FileTreeItem } from '@/types';

interface BlogListClientProps {
  posts: Post[];
  fileTree?: FileTreeItem[];
}

export function BlogListClient({ posts, fileTree }: BlogListClientProps) {
  const [view, setView] = useState<ViewType>('list');
  const [showTree, setShowTree] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('showFileTree');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('showFileTree', String(showTree));
  }, [showTree]);

  return (
    <div className="flex gap-6">
      {/* 左侧文件树(可选) */}
      {fileTree && fileTree.length > 0 && (
        <aside
          className={`
            flex-shrink-0 hidden lg:block overflow-hidden
            transition-all duration-300 ease-in-out
            ${showTree ? 'w-64 opacity-100' : 'w-0 opacity-0'}
          `}
        >
          <div className="sticky top-20 w-64">
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">文件夹</h3>
            <FileTreeView items={fileTree} />
          </div>
        </aside>
      )}

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">博客文章</h1>
          <div className="flex gap-2">
            {fileTree && fileTree.length > 0 && (
              <button
                onClick={() => setShowTree(!showTree)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <FolderTree className="w-4 h-4" />
                <span>{showTree ? '隐藏' : '显示'}文件树</span>
              </button>
            )}
            <ViewSwitcher onViewChange={setView} />
          </div>
        </div>
        
        {view === 'list' ? (
          <ListLayout posts={posts} />
        ) : (
          <CardLayout posts={posts} />
        )}
      </div>
    </div>
  );
}

