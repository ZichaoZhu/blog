import Link from 'next/link';
import { Home, BookOpen, Compass } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title="迷路了"
        subtitle="这里没有你要找的页面,不过世界依然温柔"
        minHeight="min-h-[340px]"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="glass-card p-8 sm:p-10 text-center">
          <Compass className="w-14 h-14 mx-auto mb-5 text-indigo-500/80" aria-hidden />
          <p className="text-lg text-foreground/80 mb-2">
            可能是链接失效,或者页面已被移动。
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            你可以回到首页,或者逛逛最新的文章。
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] transition-all hover:scale-105"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-panel text-sm font-medium hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              浏览博客
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
