import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildContentIndexFromDirectory,
  getAdjacentPosts,
  getAllCategories,
  getAllPosts,
  getAllTags,
  getContentIndex,
  getFileTree,
  getPostByPath,
  getPostDocument,
  getPostsByAuthor,
  getTopicTreeForPost,
} from '@/lib/posts';

const temporaryDirectories: string[] = [];

async function createFixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'blog-posts-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function writePost(
  root: string,
  relativePath: string,
  source: string,
  modifiedAt?: Date,
) {
  const destination = path.join(root, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, source, 'utf8');
  if (modifiedAt) await utimes(destination, modifiedAt, modifiedAt);
  return destination;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('content index', () => {
  it('keeps markdown bodies out of summaries and the serialized tree', async () => {
    const posts = await getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]).toHaveProperty('excerpt');
    expect(posts[0]).not.toHaveProperty('content');

    const tree = await getFileTree();
    expect(JSON.stringify(tree.root)).not.toContain('"content":');
  });

  it('loads the requested document body and source file on demand', async () => {
    const document = await getPostDocument('Reaserch_Note/260707');
    expect(document?.sourceFile).toBe('Reaserch_Note/260707.md');
    expect(document?.content).toContain('日常记录');
    expect(document?.excerpt.length).toBeGreaterThan(0);
  });

  it('returns adjacent notes without leaking their bodies', async () => {
    const adjacent = await getAdjacentPosts('Reaserch_Note/260707');
    for (const post of [adjacent.previous, adjacent.next]) {
      if (post) expect(post).not.toHaveProperty('content');
    }
  });

  it('exposes cached lookup, topic, author, tag and category APIs as summaries', async () => {
    const [tree, cachedTree, index, tags, categories, authorPosts] = await Promise.all([
      getFileTree(),
      getFileTree(),
      getContentIndex(),
      getAllTags(),
      getAllCategories(),
      getPostsByAuthor('zhuzichao'),
    ]);

    expect(cachedTree).toBe(tree);
    expect(index).toBe(tree);
    expect(tags).toEqual([...tags].sort());
    expect(categories).toEqual([...categories].sort());
    expect(authorPosts.length).toBeGreaterThan(0);
    expect(authorPosts.every((post) => post.frontmatter.author === 'zhuzichao')).toBe(true);
    expect(await getPostByPath('missing/path')).toBeNull();
    expect(await getPostDocument('missing/path')).toBeNull();
    expect(await getTopicTreeForPost('Reaserch_Note/260707')).toHaveLength(1);
    expect(await getTopicTreeForPost('missing/path')).toEqual([]);
    expect(await getAdjacentPosts('missing/path')).toEqual({ previous: null, next: null });
  });
});

describe('fixture content index', () => {
  it('normalizes defaults, dates, authors and excerpts while excluding boolean drafts', async () => {
    const root = await createFixture();
    const fallbackDate = new Date('2023-07-08T12:00:00.000Z');
    await writePost(
      root,
      'Notes/defaults.md',
      [
        '# Heading',
        '',
        '> 引用',
        '',
        '- [链接](https://example.com)',
        '',
        '![图](./image.png)',
        '',
        '`code` **粗体** $x^2$',
      ].join('\n'),
      fallbackDate,
    );
    await writePost(
      root,
      'Notes/explicit.md',
      `---
title: 显式标题
date: "2024-03-04T05:06:07.000Z"
description: 摘要优先
tags: [测试, 7]
category: 示例
author: " custom-author "
coverImage: /cover.png
order: 2
draft: false
---
正文不会作为摘要。`,
    );
    await writePost(
      root,
      'Notes/yaml-date.md',
      `---
date: 2024-02-03
---
日期正文`,
    );
    await writePost(
      root,
      'Notes/string-false.md',
      `---
draft: "false"
---
仍然公开`,
    );
    await writePost(
      root,
      'Notes/draft.md',
      `---
draft: true
---
不可见`,
    );

    const index = buildContentIndexFromDirectory(root);
    const defaults = index.flat.find((post) => post.slug === 'defaults');
    const explicit = index.flat.find((post) => post.slug === 'explicit');
    const yamlDate = index.flat.find((post) => post.slug === 'yaml-date');

    expect(index.flat.map((post) => post.slug)).not.toContain('draft');
    expect(index.flat.map((post) => post.slug)).toContain('string-false');
    expect(defaults?.frontmatter).toMatchObject({
      title: 'defaults',
      date: '2023-07-08',
      description: '',
      tags: [],
      category: '未分类',
      author: 'zhuzichao',
      draft: false,
    });
    expect(defaults?.excerpt).toBe('Heading 引用 链接 code 粗体');
    expect(defaults).not.toHaveProperty('content');
    expect(explicit?.frontmatter).toMatchObject({
      title: '显式标题',
      date: '2024-03-04T05:06:07.000Z',
      description: '摘要优先',
      tags: ['测试', '7'],
      category: '示例',
      author: 'custom-author',
      coverImage: '/cover.png',
      order: 2,
    });
    expect(explicit?.excerpt).toBe('摘要优先');
    expect(yamlDate?.frontmatter.date).toBe('2024-02-03');
  });

  it('sorts folders and posts naturally with explicit order, and sorts flat posts by date', async () => {
    const root = await createFixture();
    await writePost(root, 'Zeta/index.md', '---\ndate: 2024-01-01\n---\nZeta');
    await writePost(root, 'Alpha/index.md', '---\ndate: 2024-01-02\n---\nAlpha');
    await writePost(root, 'Course/Lec10.md', '---\ndate: 2024-01-03\n---\n10');
    await writePost(root, 'Course/Lec2.md', '---\ndate: 2024-01-04\n---\n2');
    await writePost(root, 'Course/Last.md', '---\ndate: 2024-01-05\norder: 99\n---\nlast');
    await writePost(root, 'Course/First.md', '---\ndate: 2024-01-06\norder: 1\n---\nfirst');
    await writeFile(
      path.join(root, 'Zeta/.folder.json'),
      JSON.stringify({ displayName: 'Zeta', order: 1 }),
    );
    await writeFile(
      path.join(root, 'Alpha/.folder.json'),
      JSON.stringify({ displayName: 'Alpha', order: 2 }),
    );

    const index = buildContentIndexFromDirectory(root);
    expect(index.root.map((item) => item.path)).toEqual(['Zeta', 'Alpha', 'Course']);

    const course = index.folders.get('Course');
    expect(course?.children.map((item) => item.type === 'post' ? item.slug : item.path)).toEqual([
      'First',
      'Last',
      'Lec2',
      'Lec10',
    ]);
    expect(course?.postCount).toBe(4);
    expect(index.flat.map((post) => post.frontmatter.date)).toEqual([
      '2024-01-06',
      '2024-01-05',
      '2024-01-04',
      '2024-01-03',
      '2024-01-02',
      '2024-01-01',
    ]);
  });

  it('supports root notes, drops empty/hidden folders and recovers from invalid folder metadata', async () => {
    const root = await createFixture();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await writePost(root, 'root-note.md', '根目录文章');
    await writePost(root, 'Broken/note.md', '正文');
    await writeFile(path.join(root, 'Broken/.folder.json'), '{ invalid json');
    await mkdir(path.join(root, 'Empty'), { recursive: true });
    await writePost(root, '.Hidden/secret.md', '隐藏');

    const index = buildContentIndexFromDirectory(root);
    expect(index.flat.map((post) => post.path)).toEqual(['Broken/note', 'root-note']);
    expect(index.root.map((item) => item.path)).not.toContain('Empty');
    expect(index.root.map((item) => item.path)).not.toContain('.Hidden');
    expect(index.folders.get('Broken')?.metadata.name).toBe('Broken');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error loading folder metadata'),
      expect.anything(),
    );
  });

  it('truncates generated excerpts and rejects duplicate routes', async () => {
    const root = await createFixture();
    await writePost(root, 'Long/index.md', '字'.repeat(250));
    const long = buildContentIndexFromDirectory(root).flat[0];
    expect(long.excerpt).toHaveLength(221);
    expect(long.excerpt.endsWith('…')).toBe(true);

    await writePost(root, 'Topic/item.md', '文件文章');
    await writePost(root, 'Topic/item/index.md', '目录文章');
    expect(() => buildContentIndexFromDirectory(root)).toThrow(
      'Duplicate post path: Topic/item',
    );
  });

  it('ignores malformed Markdown files without dropping valid siblings', async () => {
    const root = await createFixture();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await writePost(root, 'Notes/good.md', '有效正文');
    await writePost(root, 'Notes/bad.md', '---\ninvalid: [\n---\n损坏');

    const index = buildContentIndexFromDirectory(root);
    expect(index.flat.map((post) => post.slug)).toEqual(['good']);
    expect(consoleError).toHaveBeenCalledWith(
      'Error loading post: Notes/bad',
      expect.anything(),
    );
  });
});
