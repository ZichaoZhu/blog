'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Post } from '@/types';

interface BreadcrumbProps {
  post: Post;
}

export function Breadcrumb({ post }: BreadcrumbProps) {
  const pathParts = post.parentPath?.split('/') || [];
  
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
      <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        首页
      </Link>
      
      <ChevronRight className="w-4 h-4" />
      
      <Link href="/blog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        博客
      </Link>
      
      {pathParts.map((part, index) => {
        const folderPath = pathParts.slice(0, index + 1).join('/');
        return (
          <span key={folderPath} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            <Link 
              href={`/blog?folder=${encodeURIComponent(folderPath)}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {part}
            </Link>
          </span>
        );
      })}
      
      <ChevronRight className="w-4 h-4" />
      <span className="text-gray-900 dark:text-gray-100 font-medium">
        {post.frontmatter.title}
      </span>
    </nav>
  );
}
