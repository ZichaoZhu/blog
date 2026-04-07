import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Post } from '@/types';

interface ListLayoutProps {
  posts: Post[];
}

export function ListLayout({ posts }: ListLayoutProps) {
  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article
          key={post.path}
          className="flex flex-col md:flex-row gap-6 pb-6 border-b border-border last:border-0"
        >
          {post.frontmatter.coverImage && (
            <Link
              href={`/blog/${post.path}`}
              className="md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg"
            >
              <Image
                src={post.frontmatter.coverImage}
                alt={post.frontmatter.title}
                width={192}
                height={128}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </Link>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <time dateTime={post.frontmatter.date}>
                {format(new Date(post.frontmatter.date), 'yyyy年MM月dd日', { locale: zhCN })}
              </time>
              <span>•</span>
              <span>{post.readingTime}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                {post.frontmatter.category}
              </span>
            </div>
            
            <Link href={`/blog/${post.path}`}>
              <h2 className="text-2xl font-bold mb-2 hover:text-primary transition-colors">
                {post.frontmatter.title}
              </h2>
            </Link>
            
            <p className="text-muted-foreground mb-3 line-clamp-2">
              {post.frontmatter.description}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {post.frontmatter.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </article>
      ))}
      
      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          暂无文章
        </div>
      )}
    </div>
  );
}
