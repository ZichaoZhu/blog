import { notFound } from 'next/navigation';
import { getAllPosts, getPostByPath, getFileTree } from '@/lib/posts';
import { getAuthorById } from '@/lib/authors';
import { compileMDXContent } from '@/lib/mdx';
import { extractTOC } from '@/lib/toc';
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

interface PostPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.path.split('/'),
  }));
}

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
    title: `${post.frontmatter.title} - 我的博客`,
    description: post.frontmatter.description,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const postPath = slug.join('/');

  // 第一轮并行：获取文章数据和文件树
  const [post, fileTree] = await Promise.all([
    getPostByPath(postPath),
    getFileTree(),
  ]);

  if (!post) {
    notFound();
  }

  // 第二轮并行：编译内容、获取作者、提取目录
  const [{ content }, author, toc] = await Promise.all([
    compileMDXContent(post.content, post.path),
    Promise.resolve(getAuthorById(post.frontmatter.author)),
    Promise.resolve(extractTOC(post.content)),
  ]);

  const categoryLabel = seriesLabel(post);

  return (
    <>
      <ReadingProgress />

      <div className="relative max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* 柔和光晕背景 */}
        <div className="glow-bg" aria-hidden />

        <div className="flex gap-8">
          {/* 左侧文件树 - 仅桌面显示 (组件自带 sticky,不要包 div) */}
          <aside className="hidden xl:block shrink-0">
            <FileTreeClient
              fileTree={fileTree.root}
              currentSlug={slug[slug.length - 1]}
            />
          </aside>

          {/* 主内容区 (正文固定窄宽度,两侧 aside 占走) */}
          <article className="flex-1 min-w-0 max-w-4xl mx-auto">
            <Breadcrumb post={post} />
            <MobileTOC items={toc} />

            {/* 文章头部 */}
            <header className="mb-10">
              {post.frontmatter.coverImage && (
                <Image
                  src={post.frontmatter.coverImage}
                  alt={post.frontmatter.title}
                  width={1200}
                  height={630}
                  className="w-full h-auto rounded-2xl mb-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)]"
                  priority
                />
              )}

              <p className="micro-label mb-4">{categoryLabel}</p>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
                {post.frontmatter.title}
              </h1>

              {post.frontmatter.description && (
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  {post.frontmatter.description}
                </p>
              )}

              {/* 元信息玻璃胶囊 */}
              <div className="glass-panel inline-flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-sm text-foreground/80 mb-8">
                <time
                  dateTime={post.frontmatter.date}
                  className="inline-flex items-center gap-1.5"
                >
                  {formatPostDate(post.frontmatter.date, 'yyyy 年 MM 月 dd 日')}
                </time>
                <span className="text-border">/</span>
                <span>{post.readingTime}</span>
                {author && (
                  <>
                    <span className="text-border">/</span>
                    <Link
                      href={`/authors/${author.id}`}
                      className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          alt={author.name}
                          width={22}
                          height={22}
                          className="rounded-full"
                        />
                      )}
                      <span>{author.name}</span>
                    </Link>
                  </>
                )}
              </div>

              {/* 标签 */}
              {post.frontmatter.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.frontmatter.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="text-xs px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {/* 文章内容 — ArticleBody 根据 reading theme 在默认 prose / LaTeX 论文风之间切换 */}
            <ArticleBody>{content}</ArticleBody>

            {/* 作者卡片 (文末) */}
            {author && (
              <Link
                href={`/authors/${author.id}`}
                className="glass-card mt-16 flex items-center gap-4 p-5 no-underline"
              >
                {author.avatar && (
                  <Image
                    src={author.avatar}
                    alt={author.name}
                    width={56}
                    height={56}
                    className="rounded-full border-2 border-white/50 dark:border-white/10"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="micro-label mb-1">Written by</p>
                  <div className="font-semibold truncate">{author.name}</div>
                  {author.bio && (
                    <div className="text-sm text-muted-foreground truncate">
                      {author.bio}
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* 评论区 */}
            <div className="mt-10 glass-card p-8">
              <p className="micro-label mb-3">Comments</p>
              <div
                id="comments"
                data-giscus
                className="min-h-[160px] flex items-center justify-center text-sm text-muted-foreground"
              >
                评论功能即将上线
              </div>
            </div>
          </article>

          {/* 右侧目录 - 仅桌面显示 (组件自带 sticky) */}
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
