import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Post } from '@/types';

interface BreadcrumbProps {
  post: Post;
}

export function Breadcrumb({ post }: BreadcrumbProps) {
  const pathParts = post.parentPath?.split('/') ?? [];
  const linkClass =
    'text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors';

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link href="/" className={linkClass}>
        首页
      </Link>

      <ChevronRight className="w-4 h-4 opacity-60" />

      <Link href="/blog" className={linkClass}>
        博客
      </Link>

      {pathParts.map((part, index) => {
        const folderPath = pathParts.slice(0, index + 1).join('/');
        return (
          <span key={folderPath} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <Link
              href={`/blog?folder=${encodeURIComponent(folderPath)}`}
              className={linkClass}
            >
              {part}
            </Link>
          </span>
        );
      })}

      <ChevronRight className="w-4 h-4 opacity-60" />
      <span className="text-foreground font-medium">
        {post.frontmatter.title}
      </span>
    </nav>
  );
}
