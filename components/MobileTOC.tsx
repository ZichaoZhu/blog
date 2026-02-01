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
        className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <List className="w-4 h-4" />
        <span>目录</span>
        <span className="ml-auto text-gray-500">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  className="block text-sm py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
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
