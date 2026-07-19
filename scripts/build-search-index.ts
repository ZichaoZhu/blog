import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Charset, Index } from 'flexsearch';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Heading, Root as MdastRoot } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { getAllPosts, getPostDocument } from '../lib/posts';

export interface StoredSearchSection {
  id: string;
  title: string;
  text: string;
  excerpt: string;
}

export interface SearchDocument {
  id: string;
  path: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string;
  date: string;
  sections: StoredSearchSection[];
}

export interface SearchIndexPayload {
  version: 4;
  indexes: {
    latin: Record<string, string>;
    cjk: Record<string, string>;
  };
  documents: Record<string, SearchDocument>;
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/---[\s\S]*?---/, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~=^>|#$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchSection {
  id: string;
  title: string;
  content: string;
}

export interface SearchContentSource {
  getAllPosts: typeof getAllPosts;
  getPostDocument: typeof getPostDocument;
}

const defaultContentSource: SearchContentSource = {
  getAllPosts,
  getPostDocument,
};

/** Split a note at the same h2-h4 boundaries and IDs used by the renderer. */
export function extractSearchSections(markdown: string): SearchSection[] {
  const tree = unified().use(remarkParse).parse(markdown) as MdastRoot;
  const slugger = new GithubSlugger();
  const allHeadings = tree.children.filter(
    (node): node is Heading =>
      node.type === 'heading' &&
      typeof node.position?.start.offset === 'number' &&
      typeof node.position?.end.offset === 'number',
  );
  const headings = allHeadings
    .map((heading) => ({
      heading,
      id: `section-${slugger.slug(toString(heading).trim())}`,
    }))
    .filter(({ heading }) => heading.depth >= 2 && heading.depth <= 4);
  const sections: SearchSection[] = [];

  const firstOffset = headings[0]?.heading.position?.start.offset ?? markdown.length;
  const introduction = plainText(markdown.slice(0, firstOffset));
  if (introduction || headings.length === 0) {
    sections.push({ id: '', title: '', content: introduction });
  }

  headings.forEach(({ heading, id }, index) => {
    const title = toString(heading).trim();
    const start = heading.position?.end.offset ?? 0;
    const end = headings[index + 1]?.heading.position?.start.offset ?? markdown.length;
    sections.push({
      id,
      title,
      content: plainText(markdown.slice(start, end)),
    });
  });

  return sections;
}

export function createSearchIndex(mode: 'latin' | 'cjk' = 'latin') {
  return new Index({
    // Keep two compact indexes: CJK bigrams for Chinese queries and a Latin
    // prefix index for identifiers/English. This avoids CJK's Latin false
    // positives without expanding every section into four field indexes.
    encoder: mode === 'cjk' ? Charset.CJK : Charset.LatinBalance,
    tokenize: 'strict',
    cache: 64,
  });
}

export async function buildSearchIndex(
  outputPath = path.join(process.cwd(), 'public/_search/index.json'),
  contentSource: SearchContentSource = defaultContentSource,
) {
  const posts = await contentSource.getAllPosts();
  const latinIndex = createSearchIndex('latin');
  const cjkIndex = createSearchIndex('cjk');
  const documents: Record<string, SearchDocument> = {};

  for (const summary of posts) {
    const post = await contentSource.getPostDocument(summary.path);
    if (!post) continue;
    const tags = post.frontmatter.tags.join(' ');
    const category = post.frontmatter.category;
    const basePath = `/blog/${post.path.split('/').map(encodeURIComponent).join('/')}`;
    const sections = extractSearchSections(post.content).map((section) => ({
      id: section.id,
      title: section.title,
      text: section.content,
      excerpt: section.content
        ? `${section.content.slice(0, 220)}${section.content.length > 220 ? '…' : ''}`
        : post.excerpt,
    }));
    documents[post.path] = {
      id: post.path,
      path: basePath,
      title: post.frontmatter.title,
      excerpt: post.excerpt,
      category,
      tags,
      date: post.frontmatter.date,
      sections,
    };
    const sectionText = sections
      .map((section) => `${section.title} ${section.title} ${section.text}`)
      .join(' ');
    const searchText = `${post.frontmatter.title} ${post.frontmatter.title} ${post.frontmatter.title} ${category} ${tags} ${sectionText}`;
    latinIndex.add(post.path, searchText);
    cjkIndex.add(post.path, searchText);
  }

  async function exportIndex(index: ReturnType<typeof createSearchIndex>) {
    const exported: Record<string, string> = {};
    await index.export((key, data) => {
      exported[key] = data;
    });
    return exported;
  }

  const payload: SearchIndexPayload = {
    version: 4,
    indexes: {
      latin: await exportIndex(latinIndex),
      cjk: await exportIndex(cjkIndex),
    },
    documents,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await rm(outputPath, { force: true });
  await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
  return { documents: posts.length, outputPath };
}

export async function runSearchIndexCli(
  build: typeof buildSearchIndex = buildSearchIndex,
): Promise<void> {
  try {
    const { documents } = await build();
    console.log(`Prepared search index for ${documents} post(s).`);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  void runSearchIndexCli();
}
