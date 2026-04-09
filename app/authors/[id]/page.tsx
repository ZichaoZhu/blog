import { notFound } from 'next/navigation';
import { getAllAuthors, getAuthorById } from '@/lib/authors';
import { getPostsByAuthor } from '@/lib/posts';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { PageHero } from '@/components/PageHero';
import { Globe } from 'lucide-react';

// lucide 已 deprecate Github/Twitter 图标,这里直接内联品牌 SVG
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.97c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.19 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.22-1.5 3.19-1.18 3.19-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.68.41.35.78 1.05.78 2.11v3.13c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.914l-5.41-6.74L4.5 22H1.24l8.03-9.18L1 2h7.1l4.89 6.16L18.244 2zm-1.21 18h1.88L6.09 4H4.1l12.933 16z" />
    </svg>
  );
}
import Image from 'next/image';
import type { Metadata } from 'next';

interface AuthorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const authors = getAllAuthors();
  return authors.map(author => ({
    id: author.id,
  }));
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { id } = await params;
  const author = getAuthorById(id);

  if (!author) {
    return {
      title: '作者未找到',
    };
  }

  return {
    title: `${author.name} - 我的博客`,
    description: author.bio,
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;
  const author = getAuthorById(id);

  if (!author) {
    notFound();
  }

  const posts = await getPostsByAuthor(id);

  return (
    <>
      <PageHero
        eyebrow="Author"
        title={author.name}
        subtitle={author.bio}
        minHeight="min-h-[320px]"
      >
        <div className="flex flex-col items-center gap-6">
          {author.avatar && (
            <Image
              src={author.avatar}
              alt={author.name}
              width={112}
              height={112}
              className="rounded-full border-4 border-white/50 dark:border-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
            />
          )}

          {author.social && (
            <div className="flex gap-3">
              {author.social.github && (
                <a
                  href={`https://github.com/${author.social.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="p-3 rounded-full glass-panel hover:scale-105 transition-transform"
                >
                  <GithubIcon className="w-5 h-5" />
                </a>
              )}
              {author.social.twitter && (
                <a
                  href={`https://twitter.com/${author.social.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="p-3 rounded-full glass-panel hover:scale-105 transition-transform"
                >
                  <TwitterIcon className="w-5 h-5" />
                </a>
              )}
              {author.social.website && (
                <a
                  href={author.social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="p-3 rounded-full glass-panel hover:scale-105 transition-transform"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </PageHero>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="micro-label mb-2">Posts</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              文章列表
              <span className="ml-3 text-muted-foreground text-2xl font-normal">
                ({posts.length})
              </span>
            </h2>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            暂无文章
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post) => (
              <FeaturedPostCard key={post.path} post={post} variant="grid" />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
