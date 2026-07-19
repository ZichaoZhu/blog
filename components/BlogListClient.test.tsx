/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BlogListClient } from './BlogListClient';
import type { PostSummary } from '@/types';

function makePost(index: number): PostSummary {
  const inFirstTopic = index <= 14;
  return {
    type: 'post',
    slug: `note-${index}`,
    path: `${inFirstTopic ? 'topic-a' : 'topic-b'}/note-${index}`,
    parentPath: inFirstTopic ? 'topic-a' : 'topic-b',
    frontmatter: {
      title: `Note ${index}`,
      date: `2026-06-${String((index % 28) + 1).padStart(2, '0')}`,
      description: `Summary ${index}`,
      tags: [index % 2 === 0 ? 'tag-even' : 'tag-odd'],
      category: index % 2 === 0 ? 'Category A' : 'Category B',
      author: 'zhuzichao',
    },
    excerpt: `Excerpt ${index}`,
    readingTime: '1 min read',
    wordCount: 100 + index,
  };
}

const posts = Array.from({ length: 26 }, (_, index) => makePost(index + 1));
const commonProps = {
  allPosts: posts,
  allTags: ['tag-even', 'tag-odd'],
  allCategories: ['Category A', 'Category B'],
  initialFilters: {},
};

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storage.size;
  },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => [...storage.keys()][index] ?? null,
  removeItem: (key) => {
    storage.delete(key);
  },
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
});

beforeEach(() => {
  window.history.replaceState(null, '', '/blog');
  localStorage.clear();
});

afterEach(cleanup);

describe('BlogListClient URL state', () => {
  it('filters by category and tag and writes both values to the URL', async () => {
    const user = userEvent.setup();
    render(<BlogListClient {...commonProps} />);

    await user.click(screen.getByRole('button', { name: 'Category A' }));
    expect(window.location.search).toContain('category=Category+A');
    expect(screen.getByText(/共/).parentElement).toHaveTextContent('13 篇笔记');

    await user.click(screen.getByRole('button', { name: '#tag-even' }));
    expect(window.location.search).toContain('tag=tag-even');
    expect(screen.getAllByRole('article')).toHaveLength(12);

    await user.click(screen.getByRole('button', { name: /分类: Category A/ }));
    expect(window.location.search).not.toContain('category=');
    expect(window.location.search).toContain('tag=tag-even');
  });

  it('paginates 12 notes at a time and persists the selected view', async () => {
    const user = userEvent.setup();
    render(<BlogListClient {...commonProps} />);

    expect(screen.getAllByRole('article')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(window.location.search).toContain('page=2');
    expect(screen.getByText('2 / 3')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(12);

    await user.click(screen.getByRole('button', { name: '卡片视图' }));
    expect(window.location.search).toContain('view=card');
    expect(window.location.search).not.toContain('page=');
    expect(screen.getByRole('button', { name: '卡片视图' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('hydrates folder, page and view from a deep-link query', () => {
    window.history.replaceState(
      null,
      '',
      '/blog?folder=topic-a&page=2&view=card',
    );
    const { container } = render(<BlogListClient {...commonProps} />);

    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(container.querySelectorAll('.academic-post-grid article')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '卡片视图' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(screen.getByText('当前筛选').parentElement!).getByRole('button', {
        name: /目录: topic-a/,
      }),
    ).toBeVisible();
  });
});
