import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { AnimatedHero } from '@/components/Hero/AnimatedHero';
import { ArrowRight, BookOpen, Code2, Sparkles } from 'lucide-react';

export default async function Home() {
  const allPosts = await getAllPosts();
  const latestPosts = allPosts.slice(0, 6);

  return (
    <div>
      <AnimatedHero />

      {/* 最新文章 */}
      <section
        id="posts"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
      >
        <div className="glow-bg" aria-hidden />

        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="micro-label mb-2">Recent</p>
            <h2 className="text-3xl md:text-4xl font-bold">最新文章</h2>
            <p className="text-sm text-muted-foreground mt-2">
              最近更新的 {Math.min(latestPosts.length, 6)} 篇笔记
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            查看全部
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {latestPosts.map((post) => (
            <FeaturedPostCard key={post.path} post={post} variant="hero" />
          ))}
        </div>
      </section>

      {/* 关于本站 */}
      <section
        id="about"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
      >
        <div className="glow-bg" aria-hidden />

        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="micro-label mb-3">About</p>
          <h2 className="font-kaiti text-4xl md:text-5xl font-bold mb-4">
            关于本站
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            一个分享技术、记录成长的角落 —— 用 Next.js 构建,对 Typora 笔记完全友好。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="glass-card p-7">
            <Code2 className="w-7 h-7 mb-4 text-indigo-500" />
            <h3 className="text-lg font-bold mb-2">现代化技术栈</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4 ·
              MDX · Framer Motion
            </p>
          </div>

          <div className="glass-card p-7">
            <BookOpen className="w-7 h-7 mb-4 text-pink-500" />
            <h3 className="text-lg font-bold mb-2">为阅读而生</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              支持代码高亮、KaTeX 公式、Mermaid 流程图、内嵌目录,以及一键切换的
              LaTeX 论文风阅读主题。
            </p>
          </div>

          <div className="glass-card p-7">
            <Sparkles className="w-7 h-7 mb-4 text-amber-500" />
            <h3 className="text-lg font-bold mb-2">细节即美学</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              玻璃卡片 · 3D 鼠标跟随 · 视频 Hero · 楷体装饰字 · 全站点击涟漪 ·
              暗色模式 · 响应式适配。
            </p>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            了解更多
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
