import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { getAuthorById } from '@/lib/authors';
import { compileMDXContent } from '@/lib/mdx';
import { extractTOC } from '@/lib/toc';
import { MDXComponents } from '@/components/MDXComponents';
import { TableOfContents } from '@/components/TableOfContents';
import { MobileTOC } from '@/components/MobileTOC';
import { BackToTop } from '@/components/BackToTop';
import { ReadingProgress } from '@/components/ReadingProgress';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return {
      title: '文章未找到',
    };
  }

  return {
    title: `${post.frontmatter.title} - 我的博客`,
    description: post.frontmatter.description,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { content } = await compileMDXContent(post.content);
  const author = getAuthorById(post.frontmatter.author);
  const toc = extractTOC(post.content);

  return (
    <>
      <ReadingProgress />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8">
          {/* 主内容区 */}
          <article className="min-w-0">
            {/* 移动端目录 */}
            <MobileTOC items={toc} />

            {/* 文章头部 */}
            <header className="mb-8">
              {post.frontmatter.coverImage && (
                <Image
                  src={post.frontmatter.coverImage}
                  alt={post.frontmatter.title}
                  width={1200}
                  height={630}
                  className="w-full h-auto rounded-lg mb-8"
                  priority
                />
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
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

              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {post.frontmatter.title}
              </h1>

              <p className="text-xl text-muted-foreground mb-6">
                {post.frontmatter.description}
              </p>

              {/* 作者信息 */}
              {author && (
                <Link
                  href={`/authors/${author.id}`}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {author.avatar && (
                    <Image
                      src={author.avatar}
                      alt={author.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{author.name}</div>
                    <div className="text-sm text-muted-foreground">{author.bio}</div>
                  </div>
                </Link>
              )}

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mt-6">
                {post.frontmatter.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-sm px-3 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </header>

            {/* 文章内容 */}
            <div className="prose dark:prose-invert max-w-none">
              {content}
            </div>

            {/* 预留评论区域 */}
            <div className="mt-16 pt-8 border-t border-border">
              <div
                id="comments"
                data-giscus
                className="min-h-[200px] flex items-center justify-center text-muted-foreground"
              >
                {/* TODO: 集成 Giscus 评论系统 */}
                评论功能即将上线
              </div>
            </div>
          </article>

          {/* 桌面端目录 */}
          <aside className="hidden xl:block">
            <TableOfContents items={toc} />
          </aside>
        </div>
      </div>

      <BackToTop />
    </>
  );
}
