import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

interface MDXImageProps extends ComponentPropsWithoutRef<'img'> {
  src: string;
  alt: string;
}

function MDXImage({ src, alt, ...props }: MDXImageProps) {
  // 处理外部图片
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return (
      <img
        src={src}
        alt={alt || ''}
        className="rounded-lg my-4"
        {...props}
      />
    );
  }
  
  // 本地图片使用 Next.js Image 组件
  const width = typeof props.width === 'number' ? props.width : 800;
  const height = typeof props.height === 'number' ? props.height : 600;
  
  return (
    <Image
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      className="rounded-lg my-4"
    />
  );
}

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

export const MDXComponents = {
  img: MDXImage,
  Image: MDXImage,
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
};
