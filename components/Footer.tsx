import Link from 'next/link';

/**
 * 全站统一底部,用 glass-panel 风格收尾。
 * 不加 'use client',纯 server component。
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 border-t border-border/40">
      <div className="glow-bg opacity-40" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* 站点 */}
          <div>
            <p className="micro-label mb-3">Site</p>
            <Link
              href="/"
              className="font-kaiti text-2xl font-bold tracking-wide hover:opacity-80 transition-opacity"
            >
              世界は優しい
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              世界很温柔,我们都在努力变得更好。
            </p>
          </div>

          {/* 导航 */}
          <div>
            <p className="micro-label mb-3">Navigation</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  首页
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  博客
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  关于
                </Link>
              </li>
            </ul>
          </div>

          {/* 外链 */}
          <div>
            <p className="micro-label mb-3">Connect</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/ZichaoZhu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  href="/authors/zhuzichao"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  作者
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between text-xs text-muted-foreground">
          <p>© {year} ZZC. 本站内容以 CC BY-NC-SA 4.0 协议发布。</p>
          <p>
            Built with{' '}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Next.js
            </a>{' '}
            ·{' '}
            <a
              href="https://tailwindcss.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Tailwind CSS
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
