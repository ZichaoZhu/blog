'use client';

import { useState } from 'react';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { ListLayout } from '@/components/layouts/ListLayout';
import { CardLayout } from '@/components/layouts/CardLayout';
import type { Post, ViewType } from '@/types';

interface BlogListClientProps {
  posts: Post[];
}

export function BlogListClient({ posts }: BlogListClientProps) {
  const [view, setView] = useState<ViewType>('list');

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">博客文章</h1>
        <ViewSwitcher onViewChange={setView} />
      </div>
      
      {view === 'list' ? (
        <ListLayout posts={posts} />
      ) : (
        <CardLayout posts={posts} />
      )}
    </div>
  );
}
