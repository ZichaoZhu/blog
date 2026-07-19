import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostDocument, PostSummary } from '@/types';
import {
  buildSearchIndex,
  createSearchIndex,
  extractSearchSections,
  plainText,
  runSearchIndexCli,
  type SearchContentSource,
  type SearchIndexPayload,
} from './build-search-index';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

function summary(postPath: string, title: string): PostSummary {
  return {
    type: 'post',
    slug: postPath.split('/').at(-1)!,
    path: postPath,
    parentPath: postPath.includes('/')
      ? postPath.split('/').slice(0, -1).join('/')
      : undefined,
    frontmatter: {
      title,
      date: '2026-07-07',
      description: '',
      tags: ['科研', '测试'],
      category: '科研日志',
      author: 'zhuzichao',
      draft: false,
    },
    excerpt: '默认搜索摘要',
    readingTime: '1 min read',
    wordCount: 20,
  };
}

function document(post: PostSummary, content: string): PostDocument {
  return { ...post, content, sourceFile: `${post.path}.md` };
}

describe('static search index', () => {
  it('uses renderer-compatible section IDs and plain-text excerpts', () => {
    const sections = extractSearchSections(`开场 **摘要**

## 日常记录

the stablenormal branch

## 日常记录

第二节`);

    expect(sections).toEqual([
      { id: '', title: '', content: '开场 摘要' },
      { id: 'section-日常记录', title: '日常记录', content: 'the stablenormal branch' },
      { id: 'section-日常记录-1', title: '日常记录', content: '第二节' },
    ]);
    expect(
      plainText(`---\ntitle: hidden\n---
![图片](./a.png) [链接](https://example.com) \`code\`

\`\`\`
秘密代码
\`\`\`

<span>HTML</span> H~2~O ==mark==`),
    ).toBe('图片 链接 code HTML H 2 O mark');

    expect(extractSearchSections('## 直接开始\n\n正文')).toEqual([
      { id: 'section-直接开始', title: '直接开始', content: '正文' },
    ]);
    expect(extractSearchSections('# 重复\n\n## 重复\n\n正文')).toEqual([
      { id: '', title: '', content: '重复' },
      { id: 'section-重复-1', title: '重复', content: '正文' },
    ]);
    expect(extractSearchSections('')).toEqual([
      { id: '', title: '', content: '' },
    ]);
  });

  it('finds exact Latin identifiers and CJK text without unrelated matches', () => {
    const latinIndex = createSearchIndex('latin');
    const cjkIndex = createSearchIndex('cjk');
    for (const index of [latinIndex, cjkIndex]) {
      index.add('target', '科研 实验 稳定性 the stablenormal branch converged');
      index.add('unrelated', '课程 操作系统 scheduler and virtual memory');
    }

    expect(latinIndex.search('stablenormal')).toEqual(['target']);
    expect(cjkIndex.search('科研')).toEqual(['target']);
  });

  it('writes a deterministic importable index and skips unavailable documents', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'blog-search-'));
    temporaryDirectories.push(directory);
    const outputPath = path.join(directory, 'nested/index.json');
    const first = summary('研究 笔记/260707', '260707 科研进度');
    const missing = summary('notes/missing', '缺失正文');
    const getAllPosts = vi.fn(async () => [first, missing]);
    const getPostDocument = vi.fn(async (postPath: string) =>
      postPath === first.path
        ? document(
            first,
            `开场摘要

## 机器人 方法

${'长内容'.repeat(90)}

## 空章节
`,
          )
        : null,
    );
    const contentSource = {
      getAllPosts,
      getPostDocument,
    } as unknown as SearchContentSource;

    const firstResult = await buildSearchIndex(outputPath, contentSource);
    const firstSource = await readFile(outputPath, 'utf8');
    const secondResult = await buildSearchIndex(outputPath, contentSource);
    const secondSource = await readFile(outputPath, 'utf8');
    const payload = JSON.parse(firstSource) as SearchIndexPayload;

    expect(firstResult).toEqual({ documents: 2, outputPath });
    expect(secondResult).toEqual(firstResult);
    expect(secondSource).toBe(firstSource);
    expect(payload.version).toBe(4);
    expect(Object.keys(payload.indexes.latin).length).toBeGreaterThan(0);
    expect(Object.keys(payload.indexes.cjk).length).toBeGreaterThan(0);
    expect(Object.keys(payload.documents)).toEqual([first.path]);
    expect(getAllPosts).toHaveBeenCalledTimes(2);
    expect(getPostDocument).toHaveBeenCalledTimes(4);

    const search = createSearchIndex('cjk');
    for (const [key, data] of Object.entries(payload.indexes.cjk)) search.import(key, data);
    expect(search.search('科研', { limit: 10 })).toEqual([first.path]);
    expect(search.search('机器人', { limit: 10 })).toEqual([first.path]);
    const stored = payload.documents[first.path];
    expect(stored.path).toBe('/blog/%E7%A0%94%E7%A9%B6%20%E7%AC%94%E8%AE%B0/260707');
    expect(stored.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'section-机器人-方法',
          title: '机器人 方法',
          excerpt: expect.stringContaining('…'),
        }),
      ]),
    );
  });

  it('writes a valid empty index without loading documents', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'blog-search-empty-'));
    temporaryDirectories.push(directory);
    const outputPath = path.join(directory, 'index.json');
    const contentSource = {
      getAllPosts: vi.fn(async () => []),
      getPostDocument: vi.fn(),
    } as unknown as SearchContentSource;

    const result = await buildSearchIndex(outputPath, contentSource);
    const payload = JSON.parse(await readFile(outputPath, 'utf8')) as SearchIndexPayload;
    expect(result.documents).toBe(0);
    expect(payload).toEqual({
      version: 4,
      indexes: { latin: expect.any(Object), cjk: expect.any(Object) },
      documents: {},
    });
    expect(contentSource.getPostDocument).not.toHaveBeenCalled();
  });

  it('reports CLI success and failures without throwing', async () => {
    const previousExitCode = process.exitCode;
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const successfulBuild = vi.fn(async () => ({
      documents: 3,
      outputPath: '/tmp/index.json',
    }));
    const failedBuild = vi.fn(async () => {
      throw new Error('index failed');
    });

    try {
      await runSearchIndexCli(successfulBuild);
      expect(log).toHaveBeenCalledWith('Prepared search index for 3 post(s).');

      await runSearchIndexCli(failedBuild);
      expect(error).toHaveBeenCalledWith('index failed');
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
