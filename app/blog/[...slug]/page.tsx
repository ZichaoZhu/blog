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
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
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

  return (
    <>
      <ReadingProgress />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex gap-6">
          {/* 左侧文件树 - 仅桌面显示 */}
          <aside className="hidden xl:block shrink-0">
            <FileTreeClient fileTree={fileTree.root} currentSlug={slug[slug.length - 1]} />
          </aside>

          {/* 主内容区 */}
          <article className="flex-1 min-w-0">
            {/* 面包屑导航 */}
            <Breadcrumb post={post} />
            
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

            {/* 文章内容 — ArticleBody 根据 reading theme 在默认 prose / LaTeX 论文风之间切换 */}
            <ArticleBody>{content}</ArticleBody>

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

          {/* 右侧目录 - 仅桌面显示 */}
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
