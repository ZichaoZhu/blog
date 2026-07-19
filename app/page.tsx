import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { getAuthorById } from '@/lib/authors';
import { getAllPosts, getFileTree } from '@/lib/posts';
import type { Folder } from '@/types';

export default async function Home() {
  const [allPosts, fileTree] = await Promise.all([
    getAllPosts(),
    getFileTree(),
  ]);
  const author = getAuthorById('zhuzichao');
  const latestPosts = allPosts.slice(0, 6);
  const topics = fileTree.root.filter(
    (item): item is Folder =>
      item.type === 'folder' && Boolean(item.metadata.displayName),
  );

  return (
    <div className="academic-home">
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center md:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="micro-label mb-4">Personal research notebook</p>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl md:text-6xl">
              {author?.name ?? 'ZZC'}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-foreground/82 sm:text-xl">
              这里整理科研日志、论文阅读、课程与语言学习笔记。
            </p>
            {author?.bio && (
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                {author.bio}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <Link
                href="/blog"
                className="academic-button academic-button-primary"
              >
                阅读笔记
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              {author?.social?.github && (
                <a
                  href={`https://github.com/${author.social.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-text-link inline-flex items-center gap-1.5"
                >
                  GitHub
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
              {author?.social?.website && (
                <a
                  href={author.social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="academic-text-link inline-flex items-center gap-1.5"
                >
                  个人网站
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>

          {author?.avatar && (
            <Link
              href={`/authors/${author.id}`}
              prefetch={false}
              className="justify-self-start md:justify-self-end"
              aria-label={`查看 ${author.name} 的作者页面`}
            >
              <Image
                src={author.avatar}
                alt={author.name}
                width={176}
                height={176}
                priority
                quality={80}
                sizes="(max-width: 767px) 128px, 176px"
                className="size-32 rounded-sm border border-border object-cover grayscale-[18%] md:size-44"
              />
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section id="notes" className="scroll-mt-24 py-16 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-4">
            <div>
              <p className="micro-label mb-2">Recent notes</p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                最近笔记
              </h2>
            </div>
            <Link
              href="/blog"
              className="academic-text-link inline-flex shrink-0 items-center gap-1.5 text-sm"
            >
              查看全部
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {latestPosts.length > 0 ? (
            <div className="academic-post-index">
              {latestPosts.map((post) => (
                <FeaturedPostCard key={post.path} post={post} variant="list" />
              ))}
            </div>
          ) : (
            <p className="border-b border-border py-8 text-sm text-muted-foreground">
              暂无公开笔记。
            </p>
          )}
        </section>

        <section id="topics" className="scroll-mt-24 pb-20">
          <div className="mb-8 border-b border-border pb-4">
            <p className="micro-label mb-2">Topics</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              研究与学习主题
            </h2>
          </div>

          <div className="grid border-t border-border md:grid-cols-2">
            {topics.map((topic) => (
              <Link
                key={topic.path}
                href={`/blog?folder=${encodeURIComponent(topic.path)}`}
                className="academic-topic-row group"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-[var(--academic-link)]">
                    {topic.metadata.displayName}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {topic.path}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {topic.postCount} 篇
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Link
              href="/about"
              className="academic-text-link inline-flex items-center gap-1.5 text-sm"
            >
              关于这个网站
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
