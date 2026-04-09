import {
  getAllPosts,
  getAllTags,
  getAllCategories,
  getFileTree,
  getPostsByFolder,
} from '@/lib/posts';
import { BlogListClient } from '@/components/BlogListClient';
import { PageHero } from '@/components/PageHero';
import Link from 'next/link';

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; category?: string; folder?: string }>;
}

type FilterParams = { tag?: string; category?: string; folder?: string };

/** 构建保留其他筛选项的 URL */
function buildBlogHref(current: FilterParams, override: Partial<FilterParams>): string {
  const merged: FilterParams = { ...current, ...override };
  const search = new URLSearchParams();
  if (merged.category) search.set('category', merged.category);
  if (merged.tag) search.set('tag', merged.tag);
  if (merged.folder) search.set('folder', merged.folder);
  const qs = search.toString();
  return qs ? `/blog?${qs}` : '/blog';
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const [basePosts, allTags, allCategories, fileTree] = await Promise.all([
    params.folder ? getPostsByFolder(params.folder) : getAllPosts(),
    getAllTags(),
    getAllCategories(),
    getFileTree(),
  ]);

  let filteredPosts = basePosts;
  if (params.tag) {
    filteredPosts = filteredPosts.filter((post) =>
      post.frontmatter.tags.includes(params.tag!)
    );
  }
  if (params.category) {
    filteredPosts = filteredPosts.filter(
      (post) => post.frontmatter.category === params.category
    );
  }

  const activeFilters: Array<{ key: keyof FilterParams; label: string }> = [];
  if (params.folder) activeFilters.push({ key: 'folder', label: `文件夹: ${params.folder}` });
  if (params.category) activeFilters.push({ key: 'category', label: `分类: ${params.category}` });
  if (params.tag) activeFilters.push({ key: 'tag', label: `标签: #${params.tag}` });

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="文章"
        subtitle={`共 ${fileTree.flat.length} 篇笔记,用心写下的每一页`}
        minHeight="min-h-[320px]"
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* 筛选区 glass panel */}
        <div className="glass-panel p-5 mb-8 space-y-4">
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/50">
              <span className="text-xs text-muted-foreground mr-1">当前筛选：</span>
              {activeFilters.map(({ key, label }) => (
                <Link
                  key={key}
                  href={buildBlogHref(params, { [key]: undefined })}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                >
                  {label}
                  <span aria-hidden>×</span>
                </Link>
              ))}
              <Link
                href="/blog"
                className="px-3 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
              >
                清除全部
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <h3 className="micro-label mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildBlogHref(params, { category: undefined })}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    !params.category
                      ? 'bg-foreground text-background'
                      : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                >
                  全部
                </Link>
                {allCategories.map((category) => (
                  <Link
                    key={category}
                    href={buildBlogHref(params, {
                      category: params.category === category ? undefined : category,
                    })}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      params.category === category
                        ? 'bg-foreground text-background'
                        : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <h3 className="micro-label mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 12).map((tag) => (
                    <Link
                      key={tag}
                      href={buildBlogHref(params, {
                        tag: params.tag === tag ? undefined : tag,
                      })}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        params.tag === tag
                          ? 'bg-foreground text-background'
                          : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                      }`}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <BlogListClient posts={filteredPosts} fileTree={fileTree.root} />
      </section>
    </>
  );
}
