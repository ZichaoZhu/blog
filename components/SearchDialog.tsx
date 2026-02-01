'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          aria-label="搜索"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>搜索文章</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="输入关键词搜索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
          <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
            {/* TODO: 集成 Pagefind 搜索 */}
            搜索功能即将上线
            {query && (
              <div className="mt-4">
                <p className="text-sm">搜索词：{query}</p>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            提示：全文搜索功能正在开发中，敬请期待！
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
