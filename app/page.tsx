import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { ListLayout } from '@/components/layouts/ListLayout';
import { AnimatedHero } from '@/components/Hero/AnimatedHero';

export default async function Home() {
  const allPosts = await getAllPosts();
  const latestPosts = allPosts.slice(0, 6);

  return (
    <div>
      <AnimatedHero />
      
      <section id="posts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">最新文章</h2>
          <Link
            href="/blog"
            className="text-primary hover:underline font-medium"
          >
            查看全部 →
          </Link>
        </div>
        
        <ListLayout posts={latestPosts} />
      </section>
      
      <section id="about" className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6">关于本站</h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed">
              这是一个基于 Next.js 14 构建的现代化个人博客，采用 App Router、TypeScript 和 Tailwind CSS。
              支持 Markdown/MDX 文章撰写、全文搜索、暗黑模式切换等功能。
            </p>
            <p className="text-lg leading-relaxed mt-4">
              在这里，我会分享前端开发技术、编程经验和学习笔记，记录成长的点点滴滴。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
