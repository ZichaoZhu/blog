import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Globe } from 'lucide-react';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { getAuthorById } from '@/lib/authors';
import { getPostsByAuthor } from '@/lib/posts';
import { absoluteUrl, siteConfig } from '@/lib/site';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.97c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.19 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.22-1.5 3.19-1.18 3.19-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.35.78 1.05.78 2.11v3.13c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.914l-5.41-6.74L4.5 22H1.24l8.03-9.18L1 2h7.1l4.89 6.16L18.244 2zm-1.21 18h1.88L6.09 4H4.1l12.933 16z" />
    </svg>
  );
}

interface AuthorPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [{ id: siteConfig.primaryAuthorId }];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { id } = await params;
  const author = getAuthorById(id);

  if (!author) return { title: '作者未找到' };

  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: absoluteUrl(`/authors/${author.id}`) },
    openGraph: {
      type: 'profile',
      title: author.name,
      description: author.bio,
      url: absoluteUrl(`/authors/${author.id}`),
    },
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;
  const author = getAuthorById(id);
  if (!author) notFound();

  const posts = await getPostsByAuthor(id);
  const website =
    author.social?.website && author.social.website !== 'https://example.com'
      ? author.social.website
      : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <header className="grid gap-8 border-b border-border pb-12 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-12 md:pb-16">
        {author.avatar ? (
          <Image
            src={author.avatar}
            alt={author.name}
            width={160}
            height={160}
            priority
            quality={80}
            sizes="160px"
            className="size-32 rounded-sm border border-border object-cover grayscale-[18%] md:size-40"
          />
        ) : (
          <div className="flex size-32 items-center justify-center border border-border bg-muted font-serif text-4xl text-muted-foreground md:size-40">
            {author.name.slice(0, 1)}
          </div>
        )}

        <div className="max-w-3xl self-center">
          <p className="micro-label mb-3">Author profile</p>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            {author.name}
          </h1>
          {author.bio && (
            <p className="mt-4 text-lg leading-8 text-foreground/80">{author.bio}</p>
          )}

          {author.social && (
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm">
              {author.social.github && (
                <a
                  href={`https://github.com/${author.social.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-text-link inline-flex items-center gap-2"
                >
                  <GithubIcon className="size-4" />
                  GitHub
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
              {author.social.twitter && (
                <a
                  href={`https://twitter.com/${author.social.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-text-link inline-flex items-center gap-2"
                >
                  <XIcon className="size-4" />
                  X
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-text-link inline-flex items-center gap-2"
                >
                  <Globe className="size-4" />
                  Website
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="py-12 md:py-16">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="micro-label mb-2">Notes</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              公开笔记
            </h2>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {posts.length} 篇
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="border-b border-border py-10 text-sm text-muted-foreground">
            暂无公开文章。
          </p>
        ) : (
          <div className="academic-post-index">
            {posts.map((post) => (
              <FeaturedPostCard key={post.path} post={post} variant="list" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
