'use client';

import { useState, useEffect } from 'react';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
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

  const hasTree = fileTree && fileTree.length > 0;

  return (
    <div className="flex gap-6">
      {/* 左侧文件树(可选) */}
      {hasTree && (
        <aside
          className={`
            flex-shrink-0 hidden lg:block overflow-hidden
            transition-all duration-300 ease-in-out
            ${showTree ? 'w-72 opacity-100' : 'w-0 opacity-0'}
          `}
        >
          <div className="sticky top-24 w-72">
            <div className="glass-panel p-4">
              <h3 className="micro-label mb-4">Folders</h3>
              <FileTreeView items={fileTree} />
            </div>
          </div>
        </aside>
      )}

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{posts.length}</span> 篇文章
          </p>
          <div className="flex gap-2">
            {hasTree && (
              <button
                onClick={() => setShowTree(!showTree)}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-full glass-panel text-sm hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
              >
                <FolderTree className="w-4 h-4" />
                <span>{showTree ? '隐藏' : '显示'}文件树</span>
              </button>
            )}
            <ViewSwitcher onViewChange={setView} />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            没有找到匹配的文章
          </div>
        ) : view === 'list' ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeaturedPostCard key={post.path} post={post} variant="list" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {posts.map((post) => (
              <FeaturedPostCard key={post.path} post={post} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
