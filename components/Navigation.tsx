'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { SearchDialog } from './SearchDialog';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '博客' },
  { href: '/about', label: '关于' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // 首页视频 Hero 上导航栏透明,滚动后变玻璃
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onHome = pathname === '/';
  const transparent = onHome && !scrolled;

  return (
    <nav
      className={`
        sticky top-0 z-50 transition-all duration-300
        ${transparent
          ? 'bg-transparent border-transparent'
          : 'bg-background/70 backdrop-blur-xl border-b border-border/60'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className={`font-kaiti text-2xl font-bold tracking-wide ${
              transparent ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]' : ''
            }`}
          >
            世界は優しい
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 text-sm transition-colors rounded-full
                    ${transparent
                      ? active
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:text-white'
                      : active
                        ? 'bg-foreground/5 text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="ml-2 flex items-center gap-1">
              <SearchDialog />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-md ${
              transparent ? 'text-white' : ''
            }`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="菜单"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/90 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    block px-4 py-2.5 rounded-lg transition-colors
                    ${active
                      ? 'bg-foreground/5 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-foreground/5'}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-2 px-2 pt-3 border-t border-border/40 mt-2">
              <SearchDialog />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
