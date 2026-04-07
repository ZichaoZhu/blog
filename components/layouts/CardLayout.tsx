import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Post } from '@/types';

interface CardLayoutProps {
  posts: Post[];
}

export function CardLayout({ posts }: CardLayoutProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <article
          key={post.path}
          className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col"
        >
          {post.frontmatter.coverImage && (
            <Link href={`/blog/${post.path}`} className="overflow-hidden">
              <Image
                src={post.frontmatter.coverImage}
                alt={post.frontmatter.title}
                width={400}
                height={240}
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
              />
            </Link>
          )}
          
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <time dateTime={post.frontmatter.date}>
                {format(new Date(post.frontmatter.date), 'yyyy-MM-dd', { locale: zhCN })}
              </time>
              <span>•</span>
              <span>{post.readingTime}</span>
            </div>
            
            <Link href={`/blog/${post.path}`}>
              <h2 className="text-xl font-bold mb-2 hover:text-primary transition-colors line-clamp-2">
                {post.frontmatter.title}
              </h2>
            </Link>
            
            <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
              {post.frontmatter.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                {post.frontmatter.category}
              </span>
              
              <div className="flex items-center gap-2">
                {post.frontmatter.tags.slice(0, 2).map((tag) => (
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
          </div>
        </article>
      ))}
      
      {posts.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          暂无文章
        </div>
      )}
    </div>
  );
}
