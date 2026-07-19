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
      window.scrollTo({ top, behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="xl:hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel flex items-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
      >
        <List className="w-4 h-4" />
        <span>目录</span>
        <span className="ml-auto text-muted-foreground">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="glass-panel mt-2 p-4 rounded-lg">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className="block text-sm py-1 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
