import GithubSlugger from 'github-slugger';

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

/**
 * 从 markdown 内容中提取目录项
 * 跳过代码块内的 `#` 行，并使用 github-slugger 与 rehype-slug 生成一致的 ID。
 * @param content MDX 源码
 * @param minLevel 最小标题级别（默认 2，即 h2）
 * @param maxLevel 最大标题级别（默认 4，即 h4）
 */
export function extractTOC(
  content: string,
  minLevel: number = 2,
  maxLevel: number = 4
): TOCItem[] {
  const slugger = new GithubSlugger();
  const toc: TOCItem[] = [];
  const lines = content.split('\n');
  let inFencedCode = false;

  for (const line of lines) {
    // 跟踪三反引号围栏代码块,跳过其内部的 # 行
    if (/^\s*```/.test(line)) {
      inFencedCode = !inFencedCode;
      continue;
    }
    if (inFencedCode) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    if (level < minLevel || level > maxLevel) continue;

    const title = match[2].trim();
    const id = slugger.slug(title);

    toc.push({ id, title, level });
  }

  return toc;
}
