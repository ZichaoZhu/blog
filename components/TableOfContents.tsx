'use client';

import { useEffect, useState } from 'react';
import { TOCItem } from '@/lib/toc';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface TableOfContentsProps {
  items: TOCItem[];
  minLevel?: number;
  maxLevel?: number;
}

export function TableOfContents({ items, minLevel = 2, maxLevel = 4 }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // 监听滚动，高亮当前标题
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      }
    );

    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
    headings.forEach((heading) => {
      if (heading) observer.observe(heading);
    });

    return () => {
      headings.forEach((heading) => {
        if (heading) observer.unobserve(heading);
      });
    };
  }, [items]);

  // 平滑滚动到标题
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const top = element.offsetTop - 80;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      window.scrollTo({ top, behavior });
    }
  };

  const visibleItems = items.filter(
    (item) => item.level >= minLevel && item.level <= maxLevel,
  );

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={`
        relative sticky top-24 max-h-[calc(100vh-7rem)] rounded-sm border border-border bg-background p-4
        transition-[width] duration-200 ease-out
        ${isOpen ? 'w-[300px] overflow-y-auto' : 'w-14 overflow-hidden'}
      `}
    >
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          absolute top-3 right-3
          p-1.5 rounded-md
          hover:text-[var(--academic-link)]
          transition-colors duration-200
          z-10
        "
        aria-label={isOpen ? '收起目录' : '展开目录'}
      >
        {isOpen ? (
          <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* 目录内容 */}
      <div
        className={`
          pt-9 space-y-2 transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
          <h2 className="micro-label px-2">On this page</h2>
          <ul className="space-y-1">
            {visibleItems.map((item) => (
                <li key={item.id} className="relative">
                  <div className="flex items-center gap-1">
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleClick(e, item.id)}
                      className={`
                        flex-1 text-sm py-1 px-2 rounded transition-colors
                        ${activeId === item.id
                          ? 'bg-muted font-medium text-[var(--academic-link)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }
                      `}
                      style={{ paddingLeft: `${(item.level - minLevel) * 12 + 8}px` }}
                    >
                      {item.title}
                    </a>
                  </div>
                </li>
              ))}
          </ul>
        </div>
    </nav>
  );
}
