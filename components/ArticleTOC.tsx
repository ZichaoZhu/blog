import type { TOCItem } from '@/lib/toc';

interface ArticleTOCProps {
  items: TOCItem[];
}

/** Typora `[toc]` 的服务端版本，与正文 heading 共用同一份 AST 结果。 */
export function ArticleTOC({ items }: ArticleTOCProps) {
  if (items.length === 0) return null;

  return (
    <nav className="article-inline-toc" aria-label="文章目录">
      <div className="academic-kicker">目录</div>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-level={item.level}>
            <a href={`#${item.id}`}>{item.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
