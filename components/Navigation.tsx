'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href: '/blog', label: 'Notes', ariaLabel: '研究笔记' },
  { href: '/#topics', label: 'Topics', ariaLabel: '研究与学习主题' },
  { href: '/about', label: 'About', ariaLabel: '关于' },
];

function isActive(pathname: string, href: string) {
  if (href === '/blog') return pathname === '/blog' || pathname.startsWith('/blog/');
  if (href === '/about') return pathname === '/about';
  return false;
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-site-search'));
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <nav
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
        aria-label="主导航"
      >
        <div className="flex h-16 items-center justify-between gap-5">
          <Link href="/" className="group min-w-0 leading-none">
            <span className="block truncate text-[1.05rem] font-semibold tracking-tight group-hover:text-[var(--academic-link)]">
              世界は優しい
            </span>
            <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.17em] text-muted-foreground">
              Research notes
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.ariaLabel}
                  aria-current={active ? 'page' : undefined}
                  className={`academic-nav-link ${active ? 'academic-nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openSearch}
              data-search-trigger
              className="ml-2 inline-flex h-9 items-center gap-2 border-l border-border px-3 text-sm text-muted-foreground hover:text-foreground"
              aria-label="搜索笔记（Command 或 Control 加 K）"
            >
              <Search className="size-4" aria-hidden />
              <span className="sr-only lg:not-sr-only">Search</span>
              <kbd className="hidden border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground xl:inline">
                ⌘K
              </kbd>
            </button>
            <div className="border-l border-border pl-3">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={openSearch}
              data-search-trigger
              className="inline-flex size-9 items-center justify-center border border-transparent text-foreground hover:border-border"
              aria-label="搜索笔记"
            >
              <Search className="size-4" aria-hidden />
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center border border-transparent text-foreground hover:border-border"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
            >
              {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div id="mobile-navigation" className="border-t border-border py-3 md:hidden">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`block border-l-2 px-3 py-2.5 text-sm ${
                    active
                      ? 'border-[var(--academic-link)] text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {link.ariaLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </header>
  );
}
