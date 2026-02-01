import { getAllPosts, getAllTags, getAllCategories } from '@/lib/posts';
import { BlogListClient } from '@/components/BlogListClient';
import Link from 'next/link';

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; category?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const allPosts = await getAllPosts();
  const allTags = await getAllTags();
  const allCategories = await getAllCategories();
  
  // 根据筛选条件过滤文章
  let filteredPosts = allPosts;
  if (params.tag) {
    filteredPosts = filteredPosts.filter(post =>
      post.frontmatter.tags.includes(params.tag!)
    );
  }
  if (params.category) {
    filteredPosts = filteredPosts.filter(post =>
      post.frontmatter.category === params.category
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* 筛选器 */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">分类</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
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
                href={`/blog?category=${encodeURIComponent(category)}`}
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
            {params.tag && (
              <Link
                href="/blog"
                className="px-3 py-1 rounded-full text-sm bg-muted hover:bg-muted/80 transition-colors"
              >
                清除标签
              </Link>
            )}
            {allTags.slice(0, 10).map(tag => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
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

      <BlogListClient posts={filteredPosts} />
    </div>
  );
}
