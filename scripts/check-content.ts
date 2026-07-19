import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Link, Root as MdastRoot } from 'mdast';
import type { ContentDiagnostic } from '../types';
import { getAuthorById } from '../lib/authors';
import { loadContentAssetManifest } from '../lib/assets';
import {
  normalizeTyporaImageDestinations,
  renderMarkdown,
} from '../lib/mdx';
import { getAllPosts, getPostDocument } from '../lib/posts';
import { siteConfig } from '../lib/site';

export interface ContentCheckResult {
  files: number;
  publishedPosts: number;
  warnings: ContentDiagnostic[];
}

function findMarkdownFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...findMarkdownFiles(absolutePath));
    else if (entry.isFile() && entry.name.endsWith('.md')) result.push(absolutePath);
  }
  return result;
}

function sourceFileToPostPath(sourceFile: string): string {
  const withoutExtension = sourceFile.replace(/\.md$/i, '');
  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension;
}

function stripLinkSuffix(value: string): string {
  const suffix = value.search(/[?#]/);
  return suffix < 0 ? value : value.slice(0, suffix);
}

function decodeLink(value: string): string | null {
  try {
    return decodeURIComponent(value).replaceAll('\\', '/');
  } catch {
    return null;
  }
}

function validateInternalLink(
  url: string,
  sourceFile: string,
  publishedPaths: Set<string>,
  projectRoot: string,
): string | null {
  if (!url || url.startsWith('#') || /^(?:https?:|mailto:|tel:|data:)/i.test(url)) {
    return null;
  }

  const decoded = decodeLink(stripLinkSuffix(url));
  if (!decoded) return `内部链接包含无效 URL 编码: ${url}`;

  if (decoded.startsWith('/blog/')) {
    const postPath = decoded.slice('/blog/'.length).replace(/^\/+|\/+$/g, '');
    return publishedPaths.has(postPath) ? null : `内部文章链接不存在: ${url}`;
  }
  if (decoded === '/blog' || decoded === '/about' || decoded === '/') return null;

  if (decoded.startsWith('/')) {
    const publicPath = path.resolve(projectRoot, 'public', decoded.slice(1));
    const publicRoot = path.resolve(projectRoot, 'public');
    return publicPath.startsWith(`${publicRoot}${path.sep}`) && fs.existsSync(publicPath)
      ? null
      : `站内资源不存在: ${url}`;
  }

  if (!decoded.endsWith('.md') && !decoded.includes('/')) return null;
  const targetSource = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourceFile), decoded),
  );
  if (targetSource.startsWith('../')) return `内部链接越出内容目录: ${url}`;
  const targetPath = sourceFileToPostPath(targetSource.replace(/\/$/, '/index.md'));
  return publishedPaths.has(targetPath) ? null : `相对文章链接不存在: ${url}`;
}

export async function checkContent(
  projectRoot = process.cwd(),
): Promise<ContentCheckResult> {
  const postsRoot = path.join(projectRoot, 'content/posts');
  const markdownFiles = findMarkdownFiles(postsRoot);
  const publishedSources = new Map<string, string>();
  const errors: ContentDiagnostic[] = [];
  const warnings: ContentDiagnostic[] = [];

  for (const absolutePath of markdownFiles) {
    const sourceFile = path.relative(postsRoot, absolutePath).split(path.sep).join('/');
    let parsed: ReturnType<typeof matter>;
    try {
      parsed = matter(fs.readFileSync(absolutePath, 'utf8'));
    } catch (error) {
      errors.push({
        severity: 'error',
        file: sourceFile,
        message: `frontmatter 无法解析: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    if (parsed.data.draft === true) continue;

    const postPath = sourceFileToPostPath(sourceFile);
    const duplicate = publishedSources.get(postPath);
    if (duplicate) {
      errors.push({
        severity: 'error',
        file: sourceFile,
        message: `文章路径重复: ${postPath}（同时来自 ${duplicate}）`,
      });
    } else {
      publishedSources.set(postPath, sourceFile);
    }

    const authorId = typeof parsed.data.author === 'string' && parsed.data.author.trim()
      ? parsed.data.author.trim()
      : siteConfig.primaryAuthorId;
    const author = getAuthorById(authorId);
    if (!author) {
      errors.push({ severity: 'error', file: sourceFile, message: `作者不存在: ${authorId}` });
    } else if (author.avatar) {
      const avatarPath = path.join(projectRoot, 'public', author.avatar.replace(/^\//, ''));
      if (!fs.existsSync(avatarPath)) {
        errors.push({ severity: 'error', file: sourceFile, message: `作者头像不存在: ${author.avatar}` });
      }
    }

    if (typeof parsed.data.coverImage === 'string' && parsed.data.coverImage.startsWith('/')) {
      const coverPath = path.join(projectRoot, 'public', parsed.data.coverImage.slice(1));
      if (!fs.existsSync(coverPath)) {
        errors.push({
          severity: 'error',
          file: sourceFile,
          message: `文章封面不存在: ${parsed.data.coverImage}`,
        });
      }
    }
  }

  const summaries = await getAllPosts();
  if (summaries.length !== publishedSources.size) {
    errors.push({
      severity: 'error',
      file: 'content/posts',
      message: `内容索引数量异常: 扫描到 ${publishedSources.size} 篇，索引仅有 ${summaries.length} 篇。`,
    });
  }

  const publishedPaths = new Set(publishedSources.keys());
  const manifest = await loadContentAssetManifest(
    path.join(projectRoot, '.generated/content-assets.json'),
  );
  for (const summary of summaries) {
    const document = await getPostDocument(summary.path);
    if (!document) {
      errors.push({ severity: 'error', file: summary.path, message: '无法按需读取文章正文。' });
      continue;
    }

    try {
      const rendered = await renderMarkdown({
        source: document.content,
        sourceFile: document.sourceFile,
        assetManifest: manifest,
      });
      for (const diagnostic of rendered.diagnostics) {
        if (diagnostic.severity === 'error' || diagnostic.message.startsWith('未找到本地图片')) {
          errors.push({ ...diagnostic, severity: 'error' });
        } else {
          warnings.push(diagnostic);
        }
      }
    } catch (error) {
      errors.push({
        severity: 'error',
        file: document.sourceFile,
        message: `Markdown 无法渲染: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    const tree = unified()
      .use(remarkParse)
      .parse(normalizeTyporaImageDestinations(document.content)) as MdastRoot;
    visit(tree, 'link', (node: Link) => {
      const message = validateInternalLink(
        node.url,
        document.sourceFile,
        publishedPaths,
        projectRoot,
      );
      if (message) {
        errors.push({
          severity: 'error',
          file: document.sourceFile,
          line: node.position?.start.line,
          message,
        });
      }
    });
  }

  if (errors.length > 0) {
    const details = errors
      .map((diagnostic) =>
        `  - ${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ''}: ${diagnostic.message}`,
      )
      .join('\n');
    throw new Error(`Content validation failed with ${errors.length} error(s):\n${details}`);
  }

  return {
    files: markdownFiles.length,
    publishedPosts: summaries.length,
    warnings,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  checkContent()
    .then((result) => {
      console.log(
        `Validated ${result.files} Markdown file(s), ${result.publishedPosts} published post(s), ${result.warnings.length} warning(s).`,
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
