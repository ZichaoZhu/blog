'use client';

import { useState } from 'react';
import { TOCItem } from '@/lib/toc';
import { List } from 'lucide-react';

interface MobileTOCProps {
  items: TOCItem[];
  minLevel?: number;
}

export function MobileTOC({ items, minLevel = 2 }: MobileTOCProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const top = element.offsetTop - 80;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      window.scrollTo({ top, behavior });
      setIsOpen(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 xl:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:border-[var(--academic-link)]"
        aria-expanded={isOpen}
      >
        <List className="w-4 h-4" />
        <span>目录</span>
        <span className="ml-auto text-muted-foreground">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-sm border border-border bg-background p-4">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className="block py-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-[var(--academic-link)]"
                  style={{ paddingLeft: `${(item.level - minLevel) * 12}px` }}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
