/* eslint-disable @next/next/no-css-tags -- KaTeX CSS is loaded only for AST-detected math */
import { notFound } from 'next/navigation';
import {
  getAdjacentPosts,
  getAllPosts,
  getPostByPath,
  getPostDocument,
  getTopicTreeForPost,
} from '@/lib/posts';
import { getAuthorById } from '@/lib/authors';
import { renderMarkdown } from '@/lib/mdx';
import { TableOfContents } from '@/components/TableOfContents';
import { FileTreeClient } from '@/components/FileTreeClient';
import { MobileTOC } from '@/components/MobileTOC';
import { BackToTop } from '@/components/BackToTop';
import { ReadingProgress } from '@/components/ReadingProgress';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ArticleBody, ReadingThemeToggle } from '@/components/ReadingTheme';
import { formatPostDate, seriesLabel } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { postUrl } from '@/lib/site';
import { loadContentAssetManifest } from '@/lib/assets';

interface PostPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.path.split('/'),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const postPath = slug.join('/');
  const post = await getPostByPath(postPath);
  
  if (!post) {
    return {
      title: '文章未找到',
    };
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description || post.excerpt,
    alternates: { canonical: postUrl(post.path) },
    openGraph: {
      type: 'article',
      title: post.frontmatter.title,
      description: post.frontmatter.description || post.excerpt,
      url: postUrl(post.path),
      publishedTime: post.frontmatter.date,
      tags: post.frontmatter.tags,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const postPath = slug.join('/');

  const [post, topicTree, adjacent, assetManifest] = await Promise.all([
    getPostDocument(postPath),
    getTopicTreeForPost(postPath),
    getAdjacentPosts(postPath),
    loadContentAssetManifest(),
  ]);

  if (!post) {
    notFound();
  }

  const [{ content, toc, diagnostics, features }, author] = await Promise.all([
    renderMarkdown({
      source: post.content,
      sourceFile: post.sourceFile,
      assetManifest,
    }),
    Promise.resolve(getAuthorById(post.frontmatter.author)),
  ]);

  for (const diagnostic of diagnostics) {
    console.warn(`[markdown] ${diagnostic.file}:${diagnostic.line ?? '-'} ${diagnostic.message}`);
  }

  const categoryLabel = seriesLabel(post);
  const seriesPath = post.parentPath ?? post.path.split('/')[0];

  return (
    <>
      {features.math && <link rel="stylesheet" href="/katex.css" />}
      <ReadingProgress />

      <div className="academic-article-shell">
        <div className="academic-article-grid">
          <article className="academic-article">
            <Breadcrumb post={post} />
            <MobileTOC items={toc} />

            <header className="article-title-block">
              {post.frontmatter.coverImage && (
                <Image
                  src={post.frontmatter.coverImage}
                  alt={post.frontmatter.title}
                  width={1200}
                  height={630}
                  className="article-cover"
                  priority
                  quality={80}
                />
              )}

              <p className="academic-kicker">{categoryLabel}</p>

              <h1>
                {post.frontmatter.title}
              </h1>

              {post.frontmatter.description && (
                <p className="article-deck">
                  {post.frontmatter.description}
                </p>
              )}

              <div className="article-meta">
                <time
                  dateTime={post.frontmatter.date}
                  className="inline-flex items-center gap-1.5"
                >
                  {formatPostDate(post.frontmatter.date, 'yyyy 年 MM 月 dd 日')}
                </time>
                <span aria-hidden>·</span>
                <span>{post.wordCount.toLocaleString()} 字</span>
                <span aria-hidden>·</span>
                <span>{post.readingTime}</span>
                {author && (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/authors/${author.id}`}
                      prefetch={false}
                      className="inline-flex items-center hover:text-foreground transition-colors"
                    >
                      <span>{author.name}</span>
                    </Link>
                  </>
                )}
              </div>

              {post.frontmatter.tags.length > 0 && (
                <div className="article-tags">
                  {post.frontmatter.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="academic-tag"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            <ArticleBody>{content}</ArticleBody>

            <div className="mt-12 border-t border-border pt-5 text-sm">
              <Link
                href={`/blog?folder=${encodeURIComponent(seriesPath)}`}
                className="academic-text-link"
              >
                返回系列：{categoryLabel}
              </Link>
            </div>

            {(adjacent.previous || adjacent.next) && (
              <nav className="article-pagination" aria-label="相邻文章">
                {adjacent.previous ? (
                  <Link href={`/blog/${adjacent.previous.path}`} rel="prev">
                    <span>上一篇</span>
                    <strong>{adjacent.previous.frontmatter.title}</strong>
                  </Link>
                ) : <span aria-hidden />}
                {adjacent.next ? (
                  <Link href={`/blog/${adjacent.next.path}`} rel="next">
                    <span>下一篇</span>
                    <strong>{adjacent.next.frontmatter.title}</strong>
                  </Link>
                ) : <span aria-hidden />}
              </nav>
            )}

            {author && (
              <Link
                href={`/authors/${author.id}`}
                prefetch={false}
                className="article-author"
              >
                {author.avatar && (
                  <Image
                    src={author.avatar}
                    alt={author.name}
                    width={56}
                    height={56}
                    className="rounded-full"
                    quality={80}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="academic-kicker">Written by</p>
                  <div className="font-semibold truncate">{author.name}</div>
                  {author.bio && (
                    <div className="text-sm text-muted-foreground truncate">
                      {author.bio}
                    </div>
                  )}
                </div>
              </Link>
            )}

          </article>

          <aside className="order-first hidden shrink-0 xl:block">
            <FileTreeClient fileTree={topicTree} />
          </aside>

          <aside className="hidden xl:block shrink-0">
            <TableOfContents items={toc} />
          </aside>
        </div>
      </div>

      <BackToTop />
      <ReadingThemeToggle />
    </>
  );
}
