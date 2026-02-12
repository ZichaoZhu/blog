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
        relative sticky top-20 max-h-[calc(100vh-6rem)]
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 overflow-y-auto' : 'w-12 overflow-hidden'}
      `}
    >
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          absolute top-0 right-0
          p-2 rounded-lg
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition-all duration-200
          z-10
        "
        aria-label={isOpen ? '收起文件树' : '展开文件树'}
      >
        {isOpen ? (
          <PanelLeftClose className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* 文件树内容 */}
      <div 
        className={`
          pt-12 transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 px-2 mb-4">
          文件夹
        </h2>
        <FileTreeView items={fileTree} />
      </div>
    </nav>
  );
}
