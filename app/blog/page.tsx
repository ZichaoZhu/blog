import { getAllPosts, getAllTags, getAllCategories, getFileTree, getPostsByFolder } from '@/lib/posts';
import { BlogListClient } from '@/components/BlogListClient';
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
  const allPosts = await getAllPosts();
  const allTags = await getAllTags();
  const allCategories = await getAllCategories();
  const fileTree = await getFileTree();

  // 根据筛选条件过滤文章
  let filteredPosts = allPosts;

  // 按文件夹过滤
  if (params.folder) {
    const folderPosts = await getPostsByFolder(params.folder);
    filteredPosts = folderPosts;
  }

  // 按标签过滤
  if (params.tag) {
    filteredPosts = filteredPosts.filter(post =>
      post.frontmatter.tags?.includes(params.tag!)
    );
  }

  // 按分类过滤
  if (params.category) {
    filteredPosts = filteredPosts.filter(post =>
      post.frontmatter.category === params.category
    );
  }

  const hasAnyFilter = Boolean(params.tag || params.category || params.folder);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* 筛选器 */}
      <div className="mb-8 space-y-4">
        {/* 当前筛选项 */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">当前筛选：</span>
            {params.folder && (
              <Link
                href={buildBlogHref(params, { folder: undefined })}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                文件夹: {params.folder}
                <span aria-hidden>×</span>
              </Link>
            )}
            {params.category && (
              <Link
                href={buildBlogHref(params, { category: undefined })}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                分类: {params.category}
                <span aria-hidden>×</span>
              </Link>
            )}
            {params.tag && (
              <Link
                href={buildBlogHref(params, { tag: undefined })}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                标签: #{params.tag}
                <span aria-hidden>×</span>
              </Link>
            )}
            <Link
              href="/blog"
              className="px-3 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
            >
              清除全部
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">分类</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildBlogHref(params, { category: undefined })}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  !params.category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                全部
              </Link>
              {allCategories.map(category => (
                <Link
                  key={category}
                  href={buildBlogHref(params, { category: params.category === category ? undefined : category })}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    params.category === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">标签</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 10).map(tag => (
                <Link
                  key={tag}
                  href={buildBlogHref(params, { tag: params.tag === tag ? undefined : tag })}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    params.tag === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BlogListClient posts={filteredPosts} fileTree={fileTree.root} />
    </div>
  );
}
