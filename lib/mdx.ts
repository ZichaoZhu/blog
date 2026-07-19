import { Fragment, type ReactNode } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypePrettyCode, {
  type CharsElement,
  type LineElement,
  type Options as PrettyCodeOptions,
} from 'rehype-pretty-code';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';
import type { Element, Root as HastRoot } from 'hast';
import type {
  Blockquote,
  Code,
  Heading,
  Html,
  Paragraph,
  Root as MdastRoot,
  Text,
} from 'mdast';
import type { Node, Parent } from 'unist';
import type { ContentDiagnostic } from '@/types';
import type { ContentAssetManifest } from '@/lib/assets';
import { isExternalAssetReference, resolveContentAsset } from '@/lib/assets';
import type { TOCItem } from '@/lib/toc';
import { createMarkdownComponents } from '@/components/MDXComponents';

const TYPORA_INLINE_RULES = [
  { regex: /==([^=\s][^=]*?[^=\s]|[^=\s])==/g, tag: 'mark' },
  { regex: /(?<!~)~([^~\s][^~]*?[^~\s]|[^~\s])~(?!~)/g, tag: 'sub' },
  { regex: /(?<!\^)\^([^\^\s][^\^]*?[^\^\s]|[^\^\s])\^(?!\^)/g, tag: 'sup' },
] as const;

function findImageDestinationStart(line: string, start: number): number {
  let bracketDepth = 1;
  for (let index = start + 2; index < line.length; index += 1) {
    if (line[index] === '\\') {
      index += 1;
      continue;
    }
    if (line[index] === '[') bracketDepth += 1;
    if (line[index] !== ']') continue;
    bracketDepth -= 1;
    if (bracketDepth === 0) {
      return line[index + 1] === '(' ? index + 1 : -1;
    }
  }
  return -1;
}

function findClosingParenthesis(line: string, opening: number): number {
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let index = opening + 1; index < line.length; index += 1) {
    const character = line[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character !== ')') continue;
    depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function splitImageTitle(value: string): { destination: string; title: string } {
  const trimmed = value.trim();
  const match = /^(.*?)(\s+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))$/.exec(trimmed);
  return match
    ? { destination: match[1].trim(), title: match[2] }
    : { destination: trimmed, title: '' };
}

function normalizeTyporaImageLine(line: string): string {
  let output = '';
  let cursor = 0;

  while (cursor < line.length) {
    if (line[cursor] === '`') {
      const tickStart = cursor;
      while (line[cursor] === '`') cursor += 1;
      const delimiter = line.slice(tickStart, cursor);
      const closing = line.indexOf(delimiter, cursor);
      if (closing < 0) return output + line.slice(tickStart);
      output += line.slice(tickStart, closing + delimiter.length);
      cursor = closing + delimiter.length;
      continue;
    }

    if (line[cursor] !== '!' || line[cursor + 1] !== '[') {
      output += line[cursor];
      cursor += 1;
      continue;
    }

    const opening = findImageDestinationStart(line, cursor);
    const closing = opening >= 0 ? findClosingParenthesis(line, opening) : -1;
    if (opening < 0 || closing < 0) {
      output += line[cursor];
      cursor += 1;
      continue;
    }

    const raw = line.slice(opening + 1, closing);
    const { destination, title } = splitImageTitle(raw);
    const alreadyWrapped = destination.startsWith('<') && destination.endsWith('>');
    const needsTyporaCompatibility = /\s|[()]/.test(destination);
    if (!destination || alreadyWrapped || !needsTyporaCompatibility) {
      output += line.slice(cursor, closing + 1);
    } else {
      output += `${line.slice(cursor, opening + 1)}<${destination}>${title})`;
    }
    cursor = closing + 1;
  }

  return output;
}

/**
 * Typora accepts spaces and balanced parentheses in image destinations while
 * CommonMark requires angle brackets. Normalize only image tokens outside
 * fenced/inline code, then let the typed Markdown AST handle everything else.
 */
export function normalizeTyporaImageDestinations(source: string): string {
  let fence: { marker: '`' | '~'; length: number } | null = null;
  return source
    .split('\n')
    .map((line) => {
      const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1][0] as '`' | '~';
        if (!fence) fence = { marker, length: fenceMatch[1].length };
        else if (fence.marker === marker && fenceMatch[1].length >= fence.length) fence = null;
        return line;
      }
      return fence ? line : normalizeTyporaImageLine(line);
    })
    .join('\n');
}

interface CustomMdastNode extends Node, Parent {
  data: {
    hName: string;
    hProperties?: Record<string, string>;
  };
  children: Node[];
}

function customNode(
  type: string,
  hName: string,
  children: Node[] = [],
  properties?: Record<string, string>,
): CustomMdastNode {
  return {
    type,
    data: { hName, hProperties: properties },
    children,
  };
}

function remarkTyporaInline() {
  return (tree: MdastRoot) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (index === undefined || !parent) return;

      type Hit = { start: number; end: number; tag: string; inner: string };
      const hits: Hit[] = [];
      for (const { regex, tag } of TYPORA_INLINE_RULES) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(node.value)) !== null) {
          hits.push({
            start: match.index,
            end: match.index + match[0].length,
            tag,
            inner: match[1],
          });
        }
      }
      if (hits.length === 0) return;

      hits.sort((a, b) => a.start - b.start || b.end - a.end);
      const accepted: Hit[] = [];
      let cursor = 0;
      for (const hit of hits) {
        if (hit.start >= cursor) {
          accepted.push(hit);
          cursor = hit.end;
        }
      }

      const replacements: Node[] = [];
      let last = 0;
      for (const hit of accepted) {
        if (hit.start > last) {
          replacements.push({ type: 'text', value: node.value.slice(last, hit.start) } as Text);
        }
        replacements.push(
          customNode(`typora-${hit.tag}`, hit.tag, [
            { type: 'text', value: hit.inner } as Text,
          ]),
        );
        last = hit.end;
      }
      if (last < node.value.length) {
        replacements.push({ type: 'text', value: node.value.slice(last) } as Text);
      }

      (parent as Parent).children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}

function remarkCallouts() {
  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (index === undefined || !parent) return;
      const firstParagraph = node.children[0] as Paragraph | undefined;
      if (firstParagraph?.type !== 'paragraph') return;
      const firstText = firstParagraph.children[0] as Text | undefined;
      if (firstText?.type !== 'text') return;

      const match = /^\[!(\w+)\]([+-]?)[ \t]*([^\n]*)/.exec(firstText.value);
      if (!match) return;

      const [, rawType, modifier, rawTitle] = match;
      firstText.value = firstText.value.slice(match[0].length).replace(/^\n/, '');
      if (!firstText.value) firstParagraph.children.shift();
      if (firstParagraph.children.length === 0) node.children.shift();

      const properties: Record<string, string> = { type: rawType.toLowerCase() };
      if (rawTitle.trim()) properties.title = rawTitle.trim();
      if (modifier) properties.collapsible = 'true';
      if (modifier === '+') properties.defaultopen = 'true';

      (parent as Parent).children.splice(
        index,
        1,
        customNode('callout', 'callout-block', node.children, properties),
      );
    });
  };
}

function remarkSpecialBlocks() {
  return (tree: MdastRoot) => {
    visit(tree, (node, index, parent) => {
      if (index === undefined || !parent) return;

      if (node.type === 'code' && (node as Code).lang?.toLowerCase() === 'mermaid') {
        const code = node as Code;
        (parent as Parent).children.splice(
          index,
          1,
          customNode('mermaid', 'mermaid-chart', [], { chart: code.value }),
        );
        return;
      }

      if (node.type === 'paragraph') {
        const paragraph = node as Paragraph;
        if (
          paragraph.children.length === 1 &&
          paragraph.children[0].type === 'text' &&
          /^\s*\[toc\]\s*$/i.test(paragraph.children[0].value)
        ) {
          (parent as Parent).children.splice(
            index,
            1,
            customNode('articleToc', 'article-toc'),
          );
        }
      }
    });
  };
}

function createHeadingCollector(toc: TOCItem[]) {
  return function remarkHeadingCollector() {
    return (tree: MdastRoot) => {
      const slugger = new GithubSlugger();
      visit(tree, 'heading', (node: Heading) => {
        const title = toString(node).trim();
        const id = `section-${slugger.slug(title)}`;
        node.data = node.data ?? {};
        node.data.hProperties = {
          ...(node.data.hProperties ?? {}),
          'data-generated-heading': 'true',
        };
        if (node.depth >= 2 && node.depth <= 4) {
          toc.push({ id, title, level: node.depth });
        }
      });
    };
  };
}

function createHtmlCompatibility(diagnostics: ContentDiagnostic[], sourceFile: string) {
  return function remarkHtmlCompatibility() {
    return (tree: MdastRoot) => {
      visit(tree, 'html', (node: Html) => {
        if (/<\/?(?:script|iframe|object|embed)\b/i.test(node.value)) {
          diagnostics.push({
            severity: 'warning',
            file: sourceFile,
            line: node.position?.start.line,
            message: '已过滤不安全的 HTML 嵌入标签。',
          });
        }
        node.value = node.value.replace(
          /\sstyle=(['"])\s*zoom:\s*([\d.]+%?)\s*;?\s*\1/gi,
          ' width="$2"',
        );
      });
    };
  };
}

function createAssetResolver(
  manifest: ContentAssetManifest | undefined,
  sourceFile: string,
  diagnostics: ContentDiagnostic[],
) {
  return function rehypeContentAssets() {
    return (tree: HastRoot) => {
      visit(tree, 'element', (node: Element) => {
        if (node.tagName !== 'img') return;
        const rawSource = node.properties.src;
        if (typeof rawSource !== 'string' || !rawSource) return;
        if (!manifest || isExternalAssetReference(rawSource)) return;

        const entry = resolveContentAsset(rawSource, sourceFile, manifest);
        if (!entry) {
          // 站点 public 绝对路径不属于文章附件，原样保留。
          if (!rawSource.startsWith('/')) {
            diagnostics.push({
              severity: 'warning',
              file: sourceFile,
              line: node.position?.start.line,
              message: `未找到本地图片: ${rawSource}`,
            });
          }
          return;
        }

        const requestedWidth = node.properties.width;
        if (typeof requestedWidth === 'string' && requestedWidth.endsWith('%')) {
          node.properties['data-display-width'] = requestedWidth;
        }
        node.properties.src = entry.url;
        node.properties.width = entry.width;
        node.properties.height = entry.height;
        node.properties['data-content-asset'] = 'true';
        node.properties['data-content-ext'] = entry.ext;
        node.properties['data-content-size'] = entry.size;
      });
    };
  };
}

function rehypeAcademicFigures() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (index === undefined || !parent || node.tagName !== 'p') return;
      if (node.children.length !== 1) return;
      const image = node.children[0];
      if (image.type !== 'element' || image.tagName !== 'img') return;
      const title = image.properties.title;
      if (typeof title !== 'string' || !title.trim()) return;

      (parent as Element | HastRoot).children.splice(index, 1, {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['article-figure'] },
        children: [
          image,
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: title.trim() }],
          },
        ],
      });
    });
  };
}

function headingText(node: Element): string {
  return node.children
    .map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'element') return headingText(child);
      return '';
    })
    .join('')
    .trim();
}

/** Restore only renderer-generated heading IDs after untrusted HTML is sanitized. */
function rehypeTrustedHeadingIds() {
  return (tree: HastRoot) => {
    const slugger = new GithubSlugger();
    visit(tree, 'element', (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;
      const marker = node.properties.dataGeneratedHeading;
      if (marker !== 'true' && marker !== true) return;
      node.properties.id = `section-${slugger.slug(headingText(node))}`;
      delete node.properties.dataGeneratedHeading;
    });
  };
}

/**
 * remark-rehype already gives generated footnotes a user-content prefix.
 * rehype-sanitize defensively adds the same prefix to IDs once more, while
 * fragment hrefs remain unchanged. Collapse only these known generated IDs so
 * references and backlinks continue to resolve.
 */
function rehypeNormalizeFootnoteIds() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      const id = node.properties.id;
      if (
        typeof id === 'string' &&
        /^user-content-user-content-fn(?:ref)?-/.test(id)
      ) {
        node.properties.id = id.replace(
          /^user-content-user-content-/,
          'user-content-',
        );
      }
    });
  };
}

/** Preserve fenced-code metadata through the sanitizer for pretty-code. */
function rehypePreserveCodeMeta() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'code') return;
      const meta = node.data?.meta;
      if (typeof meta === 'string' && meta) {
        node.properties.metastring = meta;
      }
    });
  };
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'article-toc',
    'callout-block',
    'mermaid-chart',
    'details',
    'summary',
    'video',
    'source',
    'u',
    'kbd',
    'mark',
    'sub',
    'sup',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'title',
      'ariaLabel',
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), 'dataGeneratedHeading'],
    h2: [...(defaultSchema.attributes?.h2 ?? []), 'dataGeneratedHeading'],
    h3: [...(defaultSchema.attributes?.h3 ?? []), 'dataGeneratedHeading'],
    h4: [...(defaultSchema.attributes?.h4 ?? []), 'dataGeneratedHeading'],
    h5: [...(defaultSchema.attributes?.h5 ?? []), 'dataGeneratedHeading'],
    h6: [...(defaultSchema.attributes?.h6 ?? []), 'dataGeneratedHeading'],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      'src',
      'alt',
      'title',
      'width',
      'height',
      'loading',
    ],
    code: [...(defaultSchema.attributes?.code ?? []), 'metastring'],
    video: ['src', 'poster', 'controls', 'preload', 'width', 'height'],
    source: ['src', 'type', 'media'],
    'callout-block': ['type', 'title', 'collapsible', 'defaultopen'],
    'mermaid-chart': ['chart'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
    poster: ['http', 'https'],
  },
};

const prettyCodeOptions: PrettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
  onVisitLine(node: LineElement) {
    if (node.children.length === 0) node.children.push({ type: 'text', value: ' ' });
  },
  onVisitHighlightedLine(node: LineElement) {
    node.properties.className = ['highlighted'];
  },
  onVisitHighlightedChars(node: CharsElement) {
    node.properties.className = ['highlighted-chars'];
  },
};

export interface RenderMarkdownOptions {
  source: string;
  sourceFile: string;
  assetManifest?: ContentAssetManifest;
}

export interface RenderMarkdownResult {
  content: ReactNode;
  toc: TOCItem[];
  diagnostics: ContentDiagnostic[];
  features: {
    math: boolean;
  };
}

/**
 * 纯 Markdown 渲染管线：不启用 remark-mdx，因此笔记中的 JSX / JS
 * 表达式始终是文本。用户 HTML 先 sanitize，受信任的 KaTeX/高亮
 * 插件在之后执行，避免安全规则破坏它们生成的标记。
 */
export async function renderMarkdown({
  source,
  sourceFile,
  assetManifest,
}: RenderMarkdownOptions): Promise<RenderMarkdownResult> {
  const toc: TOCItem[] = [];
  const diagnostics: ContentDiagnostic[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkEmoji)
    .use(createHtmlCompatibility(diagnostics, sourceFile))
    .use(remarkCallouts)
    .use(remarkSpecialBlocks)
    .use(remarkTyporaInline)
    .use(createHeadingCollector(toc))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePreserveCodeMeta)
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeNormalizeFootnoteIds)
    .use(rehypeTrustedHeadingIds)
    .use(createAssetResolver(assetManifest, sourceFile, diagnostics))
    .use(rehypeAcademicFigures)
    .use(rehypeKatex, { strict: false })
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: { className: ['anchor'] },
    });

  const mdast = processor.parse(normalizeTyporaImageDestinations(source));
  let hasMath = false;
  visit(mdast, (node) => {
    if (node.type === 'math' || node.type === 'inlineMath') hasMath = true;
  });
  const hast = (await processor.run(mdast)) as HastRoot;
  const components = createMarkdownComponents({ sourceFile, toc, assetManifest });
  const content = toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    components: components as Components,
  });

  return { content, toc, diagnostics, features: { math: hasMath } };
}

/** 旧入口兼容；新代码应使用 renderMarkdown。 */
export async function compileMDXContent(source: string, sourceFile = 'unknown.md') {
  return renderMarkdown({ source, sourceFile });
}
