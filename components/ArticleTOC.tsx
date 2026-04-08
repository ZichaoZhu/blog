'use client';

import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * 文章内嵌目录:Typora 的 `[toc]` 渲染成此组件。
 * 在客户端 mount 后扫描所有渲染出的 h2~h4(由 rehype-slug 注入 id),
 * 这样无需另行解析 markdown,与右侧 TOC 用同一份 DOM。
 */
export function ArticleTOC() {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const article = document.querySelector('article') ?? document;
    const nodes = article.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]');
    const items: Heading[] = [];
    nodes.forEach((el) => {
      items.push({
        id: el.id,
        text: el.textContent ?? '',
        level: Number(el.tagName.slice(1)),
      });
    });
    setHeadings(items);
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="my-6 rounded-lg border border-border bg-muted/30 px-5 py-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">目录</div>
      <ul className="space-y-1 text-sm">
        {headings.map((h) => (
          <li
            key={h.id}
            style={{ paddingLeft: `${(h.level - 2) * 16}px` }}
          >
            <a
              href={`#${h.id}`}
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
