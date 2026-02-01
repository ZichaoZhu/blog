export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

/**
 * 从 markdown 内容中提取目录项
 * @param content MDX 源码
 * @param minLevel 最小标题级别（默认 2，即 h2）
 * @param maxLevel 最大标题级别（默认 4，即 h4）
 */
export function extractTOC(
  content: string,
  minLevel: number = 2,
  maxLevel: number = 4
): TOCItem[] {
  const headingRegex = /^#{2,6}\s+(.+)$/gm;
  const toc: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[0].indexOf(' ');
    const title = match[1].trim();
    
    // 过滤标题级别
    if (level < minLevel || level > maxLevel) {
      continue;
    }

    // 生成 ID（与 rehype-slug 保持一致）
    const id = title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');

    toc.push({ id, title, level });
  }

  return toc;
}
