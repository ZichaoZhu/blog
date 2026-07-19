import {
  getAllTags,
  getAllCategories,
  getFileTree,
} from '@/lib/posts';
import { BlogListClient } from '@/components/BlogListClient';
import { PageHero } from '@/components/PageHero';

interface BlogPageProps {
  searchParams: Promise<{ tag?: string; category?: string; folder?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const [allTags, allCategories, fileTree] = await Promise.all([
    getAllTags(),
    getAllCategories(),
    getFileTree(),
  ]);
  // 传树顺序给 Client:folder 筛选时保持 Lec1 → Lec10 自然序
  const allPosts = fileTree.flat;

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="文章"
        subtitle={`共 ${fileTree.flat.length} 篇笔记,用心写下的每一页`}
        minHeight="min-h-[320px]"
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <BlogListClient
          allPosts={allPosts}
          allTags={allTags}
          allCategories={allCategories}
          fileTree={fileTree.root}
          initialFilters={params}
        />
      </section>
    </>
  );
}
