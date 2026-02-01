import { notFound } from 'next/navigation';
import { getAllAuthors, getAuthorById } from '@/lib/authors';
import { getPostsByAuthor } from '@/lib/posts';
import { ListLayout } from '@/components/layouts/ListLayout';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* 作者信息 */}
      <div className="flex flex-col md:flex-row gap-8 mb-12 p-8 bg-muted/30 rounded-lg">
        {author.avatar && (
          <Image
            src={author.avatar}
            alt={author.name}
            width={120}
            height={120}
            className="rounded-full"
          />
        )}
        
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-3">{author.name}</h1>
          <p className="text-lg text-muted-foreground mb-4">{author.bio}</p>
          
          {author.social && (
            <div className="flex gap-4">
              {author.social.github && (
                <a
                  href={`https://github.com/${author.social.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              )}
              {author.social.twitter && (
                <a
                  href={`https://twitter.com/${author.social.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Twitter
                </a>
              )}
              {author.social.website && (
                <a
                  href={author.social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 作者文章列表 */}
      <div>
        <h2 className="text-3xl font-bold mb-8">
          文章列表 ({posts.length})
        </h2>
        <ListLayout posts={posts} />
      </div>
    </div>
  );
}
