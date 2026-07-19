import Link from 'next/link';
import { Home, BookOpen, Compass } from 'lucide-react';
import { PageHero } from '@/components/PageHero';

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title="迷路了"
        subtitle="这里没有你要找的页面，不过世界依然温柔。"
        minHeight="min-h-[340px]"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="border-y border-border p-8 text-center sm:p-10">
          <Compass className="mx-auto mb-5 size-12 text-[var(--academic-link)]" aria-hidden />
          <p className="text-lg text-foreground/80 mb-2">
            可能是链接失效，或者页面已被移动。
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            你可以回到首页，或者浏览最近的研究与学习笔记。
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="academic-button academic-button-primary"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Link>
            <Link
              href="/blog"
              className="academic-button bg-background hover:border-[var(--academic-link)] hover:text-[var(--academic-link)]"
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
