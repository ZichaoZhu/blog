import {
  getAllTags,
  getAllCategories,
  getFileTree,
} from '@/lib/posts';
import { BlogListClient } from '@/components/BlogListClient';
import { PageHero } from '@/components/PageHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '研究与学习笔记',
  description: '按主题、分类与标签浏览科研日志、论文阅读、课程与语言学习笔记。',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: '研究与学习笔记',
    description: '按主题、分类与标签浏览科研日志、论文阅读、课程与语言学习笔记。',
    url: '/blog',
  },
};

export default async function BlogPage() {
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
        eyebrow="Notes"
        title="研究与学习笔记"
        subtitle={`共 ${fileTree.flat.length} 篇，按主题、分类与标签整理`}
        minHeight="min-h-[320px]"
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <BlogListClient
          allPosts={allPosts}
          allTags={allTags}
          allCategories={allCategories}
          fileTree={fileTree.root}
          initialFilters={{}}
        />
      </section>
    </>
  );
}
