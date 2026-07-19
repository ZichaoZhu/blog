/* eslint-disable @next/next/no-img-element -- untrusted remote URLs intentionally bypass Vercel transforms */
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { ArticleTOC } from '@/components/ArticleTOC';
import { Mermaid } from '@/components/Mermaid';
import { Callout } from '@/components/Callout';
import type { TOCItem } from '@/lib/toc';
import type { ContentAssetManifest } from '@/lib/assets';

interface MarkdownComponentOptions {
  sourceFile: string;
  toc: TOCItem[];
  assetManifest?: ContentAssetManifest;
}

type MarkdownImageProps = ComponentPropsWithoutRef<'img'> & {
  'data-content-asset'?: string;
  'data-content-ext'?: string;
  'data-content-size'?: string | number;
  'data-display-width'?: string;
};

function MarkdownImage({
  src,
  alt = '',
  title,
  width,
  height,
  className,
  'data-content-asset': isContentAsset,
  'data-content-ext': extension,
  'data-content-size': contentSize,
  'data-display-width': displayWidth,
  ...props
}: MarkdownImageProps) {
  if (!src || typeof src !== 'string') return null;

  const numericWidth = typeof width === 'number' ? width : Number(width);
  const numericHeight = typeof height === 'number' ? height : Number(height);
  const style: CSSProperties | undefined = displayWidth
    ? { width: displayWidth, height: 'auto' }
    : undefined;

  if (
    isContentAsset === 'true' &&
    Number.isFinite(numericWidth) &&
    Number.isFinite(numericHeight)
  ) {
    const numericSize = Number(contentSize);
    const unoptimized =
      extension === '.svg' ||
      extension === '.gif' ||
      extension === '.ico' ||
      (Number.isFinite(numericSize) && numericSize <= 8 * 1024);
    return (
      <Image
        src={src}
        alt={alt}
        title={title}
        width={numericWidth}
        height={numericHeight}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 74vw, 900px"
        loading="lazy"
        className={className ? `article-image ${className}` : 'article-image'}
        style={style}
        unoptimized={unoptimized}
        quality={80}
      />
    );
  }

  // 未知外部图片不经过 Vercel Image Optimization，避免任意主机
  // 消耗转换配额。宽高若由原文提供仍会透传。
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className ? `article-image ${className}` : 'article-image'}
      style={style}
      {...props}
    />
  );
}

function MarkdownLink({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const isExternal = /^(?:https?:)?\/\//i.test(href);
  if (!isExternal && href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

function MarkdownTable(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="可滚动表格">
      <table {...props} />
    </div>
  );
}

function MarkdownInput(props: ComponentPropsWithoutRef<'input'>) {
  const isTask = props.type === 'checkbox' && props.disabled;
  return (
    <input
      {...props}
      aria-label={
        isTask
          ? props.checked
            ? '已完成任务'
            : '未完成任务'
          : props['aria-label']
      }
    />
  );
}

function MermaidElement({ chart }: { chart?: string }) {
  return chart ? <Mermaid chart={chart} /> : null;
}

function CalloutElement({
  type,
  title,
  collapsible,
  defaultopen,
  children,
}: {
  type?: string;
  title?: string;
  collapsible?: string;
  defaultopen?: string;
  children?: ReactNode;
}) {
  return (
    <Callout
      type={type}
      title={title}
      collapsible={collapsible}
      defaultOpen={defaultopen}
    >
      {children}
    </Callout>
  );
}

/** Components 映射在每篇文章构建时创建，因此可以安全捕获 TOC。 */
export function createMarkdownComponents({ toc }: MarkdownComponentOptions) {
  return {
    h1: (props: ComponentPropsWithoutRef<'h1'>) => <h1 {...props} />,
    h2: (props: ComponentPropsWithoutRef<'h2'>) => <h2 {...props} />,
    h3: (props: ComponentPropsWithoutRef<'h3'>) => <h3 {...props} />,
    h4: (props: ComponentPropsWithoutRef<'h4'>) => <h4 {...props} />,
    p: (props: ComponentPropsWithoutRef<'p'>) => <p {...props} />,
    a: MarkdownLink,
    img: MarkdownImage,
    input: MarkdownInput,
    table: MarkdownTable,
    blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote {...props} />
    ),
    mark: (props: ComponentPropsWithoutRef<'mark'>) => <mark {...props} />,
    sub: (props: ComponentPropsWithoutRef<'sub'>) => <sub {...props} />,
    sup: (props: ComponentPropsWithoutRef<'sup'>) => <sup {...props} />,
    'article-toc': () => <ArticleTOC items={toc} />,
    'mermaid-chart': MermaidElement,
    'callout-block': CalloutElement,
  };
}

// 旧导出保留给三方引用；站内渲染使用 createMarkdownComponents。
export const MDXComponents = createMarkdownComponents({
  sourceFile: 'unknown.md',
  toc: [],
});
