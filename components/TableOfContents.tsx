'use client';

import { useEffect, useState } from 'react';
import { TOCItem } from '@/lib/toc';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface TableOfContentsProps {
  items: TOCItem[];
  minLevel?: number;
  maxLevel?: number;
}

export function TableOfContents({ items, minLevel = 2, maxLevel = 4 }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
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
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // 切换折叠状态
  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={`
        glass-panel relative sticky top-24 max-h-[calc(100vh-7rem)] p-4
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[300px] overflow-y-auto' : 'w-14 overflow-hidden'}
      `}
    >
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          absolute top-3 right-3
          p-1.5 rounded-md
          hover:bg-white/60 dark:hover:bg-white/10
          transition-colors
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
            {items.map((item, index) => {
              const hasChildren = items[index + 1]?.level > item.level;
              const isCollapsed = collapsed[item.id];

              return (
                <li key={item.id} className="relative">
                  <div className="flex items-center gap-1">
                    {hasChildren && (
                      <button
                        onClick={() => toggleCollapse(item.id)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        aria-label={isCollapsed ? '展开' : '收起'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleClick(e, item.id)}
                      className={`
                        flex-1 text-sm py-1 px-2 rounded transition-colors
                        ${activeId === item.id
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }
                      `}
                      style={{ paddingLeft: `${(item.level - minLevel) * 12 + 8}px` }}
                    >
                      {item.title}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
    </nav>
  );
}
