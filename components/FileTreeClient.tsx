'use client';

import { useSyncExternalStore } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { FileTreeView } from '@/components/FileTreeView';
import type { FileTreeItem } from '@/types';

interface FileTreeClientProps {
  fileTree: FileTreeItem[];
}

const TREE_EVENT = 'post-tree-change';

function subscribeToPreference(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(TREE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(TREE_EVENT, onStoreChange);
  };
}

function getPreference() {
  return localStorage.getItem('showFileTreeInPost') !== 'false';
}

export function FileTreeClient({ fileTree }: FileTreeClientProps) {
  const isOpen = useSyncExternalStore(
    subscribeToPreference,
    getPreference,
    () => true,
  );

  const toggleTree = () => {
    localStorage.setItem('showFileTreeInPost', String(!isOpen));
    window.dispatchEvent(new Event(TREE_EVENT));
  };

  if (!fileTree || fileTree.length === 0) {
    return null;
  }

  return (
    <nav
      className={`
        relative sticky top-24 max-h-[calc(100vh-7rem)] rounded-sm border border-border bg-background p-4
        transition-[width] duration-200 ease-out
        ${isOpen ? 'w-72 overflow-y-auto' : 'w-14 overflow-hidden'}
      `}
    >
      {/* 切换按钮 */}
      <button
        type="button"
        onClick={toggleTree}
        className="
          absolute top-3 right-3
          p-1.5 rounded-md
          hover:text-[var(--academic-link)]
          transition-colors duration-200
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
