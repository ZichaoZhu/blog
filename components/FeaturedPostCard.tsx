import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Post } from '@/types';
import { formatPostDate, seriesLabel } from '@/lib/utils';

export type PostCardVariant = 'hero' | 'grid' | 'list';

interface FeaturedPostCardProps {
  post: Post;
  variant?: PostCardVariant;
}

function postExcerpt(post: Post): string {
  if ('excerpt' in post && typeof post.excerpt === 'string' && post.excerpt) {
    return post.excerpt;
  }
  return post.frontmatter.description;
}

export function FeaturedPostCard({ post, variant = 'hero' }: FeaturedPostCardProps) {
  if (variant === 'list') {
    return <ListVariant post={post} />;
  }

  return <CardVariant post={post} featured={variant === 'hero'} />;
}

function CardVariant({ post, featured }: { post: Post; featured: boolean }) {
  const category = seriesLabel(post);
  const excerpt = postExcerpt(post);

  return (
    <Link href={`/blog/${post.path}`} prefetch={false} className="group block h-full">
      <article
        className={`academic-card flex h-full flex-col ${featured ? 'p-7' : 'p-6'}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <span className="micro-label">{category}</span>
          <ArrowUpRight
            className="size-4 text-muted-foreground transition-colors group-hover:text-[var(--academic-link)]"
            aria-hidden
          />
        </div>

        <h3
          className={`${featured ? 'text-2xl' : 'text-xl'} text-balance font-semibold leading-snug tracking-tight transition-colors group-hover:text-[var(--academic-link)]`}
        >
          {post.frontmatter.title}
        </h3>

        {excerpt && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {excerpt}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-5 text-xs text-muted-foreground">
          <time dateTime={post.frontmatter.date}>
            {formatPostDate(post.frontmatter.date)}
          </time>
          <span aria-hidden>·</span>
          <span>{post.wordCount.toLocaleString()} 字</span>
          {post.readingTime && (
            <>
              <span aria-hidden>·</span>
              <span>{post.readingTime}</span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}

function ListVariant({ post }: { post: Post }) {
  const category = seriesLabel(post);
  const excerpt = postExcerpt(post);

  return (
    <Link href={`/blog/${post.path}`} prefetch={false} className="group block">
      <article className="grid gap-3 border-b border-border py-6 md:grid-cols-[7.5rem_minmax(0,1fr)_auto] md:gap-7">
        <div className="flex items-baseline gap-3 md:block">
          <time
            dateTime={post.frontmatter.date}
            className="font-mono text-xs tabular-nums text-muted-foreground"
          >
            {formatPostDate(post.frontmatter.date)}
          </time>
          <p className="mt-0 md:mt-2">
            <span className="micro-label text-[10px]">{category}</span>
          </p>
        </div>

        <div className="min-w-0">
          <h3 className="text-balance text-xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-[var(--academic-link)] md:text-[1.35rem]">
            {post.frontmatter.title}
          </h3>
          {excerpt && (
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {excerpt}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{post.wordCount.toLocaleString()} 字</span>
            {post.readingTime && (
              <>
                <span aria-hidden>·</span>
                <span>{post.readingTime}</span>
              </>
            )}
            {post.frontmatter.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <ArrowUpRight
          className="mt-1 hidden size-4 text-muted-foreground transition-colors group-hover:text-[var(--academic-link)] md:block"
          aria-hidden
        />
      </article>
    </Link>
  );
}
