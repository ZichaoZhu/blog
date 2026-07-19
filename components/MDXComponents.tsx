import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import { ArticleTOC } from './ArticleTOC';
import { Mermaid } from './Mermaid';
import { Callout } from './Callout';

// raw HTML 透传给 React 时,style 可能是字符串(MDX/Typora)
type MDXImageProps = Omit<ComponentPropsWithoutRef<'img'>, 'style'> & {
  src: string;
  alt: string;
  style?: CSSProperties | string;
};

/**
 * 把 HTML style 字符串(如 Typora 导出的 `zoom:50%;`)解析成 React style 对象。
 * 同时把 Webkit 专属的 `zoom: N%` 转成等价的 `width: N%`,以便在所有浏览器生效。
 */
function parseStyleAttr(style: string): CSSProperties {
  const result: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!key || !value) continue;
    if (key === 'zoom') {
      result.width = value;
    } else {
      // kebab-case → camelCase
      const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = value;
    }
  }
  return result as CSSProperties;
}

function createMDXImage(postPath?: string) {
  return function MDXImage({ src, alt, style, ...props }: MDXImageProps) {
    let resolvedSrc = src;

    // 相对路径图片 (./assets/xxx.png) → /api/images/<folder>/assets/xxx.png
    if (src.startsWith('./') && postPath) {
      const pathParts = postPath.replace(/^\//, '').split('/');
      // 嵌套子文章取父目录;顶层文章用自身
      const folderPath = pathParts.length > 1
        ? pathParts.slice(0, -1).join('/')
        : pathParts[0];
      const imagePath = src.slice(2);
      resolvedSrc = `/api/images/${encodeURI(folderPath)}/${encodeURI(imagePath)}`;
    }

    // 对 API 路由图片追加最大宽度参数，触发服务端缩放 + WebP 转换
    if (resolvedSrc.startsWith('/api/images/')) {
      resolvedSrc = `${resolvedSrc}?w=1200`;
    }

    const normalizedStyle: CSSProperties | undefined =
      typeof style === 'string' ? parseStyleAttr(style) : style;

    return (
      <img
        src={resolvedSrc}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        className="rounded-lg my-4"
        style={normalizedStyle}
        {...props}
      />
    );
  };
}

// 默认组件（无 postPath 上下文）
const defaultMDXImage = createMDXImage();

function MDXHeading2(props: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className="text-3xl font-bold mt-8 mb-4 text-foreground"
      {...props}
    />
  );
}

function MDXHeading3(props: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      className="text-2xl font-bold mt-6 mb-3 text-foreground"
      {...props}
    />
  );
}

function MDXParagraph(props: ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      className="my-4 leading-7 text-foreground/90"
      {...props}
    />
  );
}

function MDXLink(props: ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      className="text-primary hover:underline font-medium"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  );
}

function MDXBlockquote(props: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote
      className="border-l-4 border-primary pl-4 my-4 italic text-foreground/80"
      {...props}
    />
  );
}

function MDXCode(props: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    />
  );
}

function MDXPre(props: ComponentPropsWithoutRef<'pre'>) {
  return (
    <pre
      className="bg-muted p-4 rounded-lg overflow-x-auto my-4"
      {...props}
    />
  );
}

function MDXUl(props: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul
      className="list-disc list-inside my-4 space-y-2"
      {...props}
    />
  );
}

function MDXOl(props: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol
      className="list-decimal list-inside my-4 space-y-2"
      {...props}
    />
  );
}

// 表格组件 - Typora 风格
function MDXTable(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="my-6 overflow-x-auto">
      <table
        className="mx-auto min-w-full border-collapse table-auto"
        {...props}
      />
    </div>
  );
}

function MDXTHead(props: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className="bg-muted/50 border-b-2 border-border"
      {...props}
    />
  );
}

function MDXTBody(props: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody {...props} />;
}

function MDXTr(props: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className="border-b border-border hover:bg-accent/30 transition-colors"
      {...props}
    />
  );
}

function MDXTh(props: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className="px-4 py-3 text-left font-semibold text-foreground border-r border-border/30 last:border-r-0"
      {...props}
    />
  );
}

function MDXTd(props: ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className="px-4 py-3 text-foreground/90 border-r border-border/30 last:border-r-0"
      {...props}
    />
  );
}

function MDXMark(props: ComponentPropsWithoutRef<'mark'>) {
  return (
    <mark
      className="bg-yellow-200 dark:bg-yellow-500/30 px-1 rounded"
      {...props}
    />
  );
}

function MDXSub(props: ComponentPropsWithoutRef<'sub'>) {
  return <sub className="text-[0.75em]" {...props} />;
}

function MDXSup(props: ComponentPropsWithoutRef<'sup'>) {
  return <sup className="text-[0.75em]" {...props} />;
}

const baseComponents = {
  h2: MDXHeading2,
  h3: MDXHeading3,
  p: MDXParagraph,
  a: MDXLink,
  blockquote: MDXBlockquote,
  code: MDXCode,
  pre: MDXPre,
  ul: MDXUl,
  ol: MDXOl,
  table: MDXTable,
  thead: MDXTHead,
  tbody: MDXTBody,
  tr: MDXTr,
  th: MDXTh,
  td: MDXTd,
  mark: MDXMark,
  sub: MDXSub,
  sup: MDXSup,
  // Typora / Obsidian 扩展
  ArticleTOC,
  Mermaid,
  Callout,
};

// 导出默认组件（向后兼容）
export const MDXComponents = {
  ...baseComponents,
  img: defaultMDXImage,
  Image: defaultMDXImage,
};

// 导出带上下文的组件创建函数
export function createMDXComponents(postPath?: string) {
  const MDXImage = createMDXImage(postPath);
  return {
    ...baseComponents,
    img: MDXImage,
    Image: MDXImage,
  };
}
