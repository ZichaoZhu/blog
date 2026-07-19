'use client';

import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { FileTreeView } from '@/components/FileTreeView';
import type { FileTreeItem } from '@/types';

interface FileTreeClientProps {
  fileTree: FileTreeItem[];
  currentSlug?: string;
}

export function FileTreeClient({ fileTree, currentSlug }: FileTreeClientProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('showFileTreeInPost');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('showFileTreeInPost', String(isOpen));
  }, [isOpen]);

  if (!fileTree || fileTree.length === 0) {
    return null;
  }

  return (
    <nav
      className={`
        glass-panel relative sticky top-24 max-h-[calc(100vh-7rem)] p-4
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72 overflow-y-auto' : 'w-14 overflow-hidden'}
      `}
    >
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          absolute top-3 right-3
          p-1.5 rounded-md
          hover:bg-white/60 dark:hover:bg-white/10
          transition-colors
          z-10
        "
        aria-label={isOpen ? '收起文件树' : '展开文件树'}
      >
        {isOpen ? (
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* 文件树内容 */}
      <div
        className={`
          pt-9 transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <h2 className="micro-label mb-4 px-2">Folders</h2>
        <FileTreeView items={fileTree} />
      </div>
    </nav>
  );
}
