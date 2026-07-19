import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/blog', label: 'Notes' },
  { href: '/#topics', label: 'Topics' },
  { href: '/about', label: 'About' },
  { href: '/rss.xml', label: 'RSS' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Link
              href="/"
              className="font-semibold tracking-tight hover:text-[var(--academic-link)]"
            >
              世界は優しい
            </Link>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              科研、阅读与学习过程中的公开笔记。
            </p>
          </div>

          <nav aria-label="页脚导航">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-[var(--academic-link)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/ZichaoZhu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[var(--academic-link)]"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} ZZC · CC BY-NC-SA 4.0</p>
          <p>Markdown notes, published with Next.js.</p>
        </div>
      </div>
    </footer>
  );
}
