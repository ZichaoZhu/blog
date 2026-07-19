'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { FolderTree, FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { FileTreeView } from '@/components/FileTreeView';
import type { FileTreeItem, PostSummary, ViewType } from '@/types';

interface Filters {
  tag?: string;
  category?: string;
  folder?: string;
  page?: number;
  view?: ViewType;
}

interface BlogListClientProps {
  allPosts: PostSummary[];
  allTags: string[];
  allCategories: string[];
  fileTree?: FileTreeItem[];
  initialFilters: Filters;
}

const PAGE_SIZE = 12;
const URL_EVENT = 'blog-url-change';
const TREE_EVENT = 'blog-tree-change';

function filtersToQuery(filters: Filters): string {
  const search = new URLSearchParams();
  if (filters.category) search.set('category', filters.category);
  if (filters.tag) search.set('tag', filters.tag);
  if (filters.folder) search.set('folder', filters.folder);
  if (filters.page && filters.page > 1) search.set('page', String(filters.page));
  if (filters.view && filters.view !== 'list') search.set('view', filters.view);
  const query = search.toString();
  return query ? `?${query}` : '';
}

function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const rawPage = Number(params.get('page'));
  const rawView = params.get('view');
  return {
    category: params.get('category') || undefined,
    tag: params.get('tag') || undefined,
    folder: params.get('folder') || undefined,
    page: Number.isInteger(rawPage) && rawPage > 1 ? rawPage : 1,
    view: rawView === 'card' ? 'card' : 'list',
  };
}

function subscribeToUrl(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(URL_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(URL_EVENT, callback);
  };
}

function getUrlSnapshot() {
  return window.location.search;
}

function postInFolder(post: PostSummary, folder: string): boolean {
  return post.path === folder || post.path.startsWith(`${folder}/`);
}

function subscribeToTreePreference(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(TREE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(TREE_EVENT, callback);
  };
}

function getTreePreference() {
  return localStorage.getItem('showFileTree') !== 'false';
}

export function BlogListClient({
  allPosts,
  allTags,
  allCategories,
  fileTree,
  initialFilters,
}: BlogListClientProps) {
  const initialSearch = filtersToQuery(initialFilters);
  const urlSearch = useSyncExternalStore(subscribeToUrl, getUrlSnapshot, () => initialSearch);
  const filters = useMemo(() => parseFilters(urlSearch), [urlSearch]);
  const showTree = useSyncExternalStore(
    subscribeToTreePreference,
    getTreePreference,
    () => true,
  );

  const replaceFilters = useCallback((next: Filters) => {
    window.history.replaceState(null, '', `/blog${filtersToQuery(next)}`);
    window.dispatchEvent(new Event(URL_EVENT));
  }, []);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    replaceFilters({ ...filters, ...patch });
  }, [filters, replaceFilters]);

  const filteredPosts = useMemo(() => {
    let result = allPosts;
    if (filters.folder) result = result.filter((post) => postInFolder(post, filters.folder!));
    if (filters.category) {
      result = result.filter((post) => post.frontmatter.category === filters.category);
    }
    if (filters.tag) {
      result = result.filter((post) => post.frontmatter.tags.includes(filters.tag!));
    }
    if (!filters.folder) {
      result = [...result].sort(
        (a, b) => Date.parse(b.frontmatter.date) - Date.parse(a.frontmatter.date),
      );
    }
    return result;
  }, [allPosts, filters.category, filters.folder, filters.tag]);

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page ?? 1, pageCount);
  const visiblePosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const view = filters.view ?? 'list';
  const hasTree = Boolean(fileTree?.length);

  const activeFilters: Array<{ key: 'folder' | 'category' | 'tag'; label: string }> = [];
  if (filters.folder) activeFilters.push({ key: 'folder', label: `目录: ${filters.folder}` });
  if (filters.category) activeFilters.push({ key: 'category', label: `分类: ${filters.category}` });
  if (filters.tag) activeFilters.push({ key: 'tag', label: `标签: #${filters.tag}` });

  const clearAll = () => replaceFilters({ view });
  const toggleTree = () => {
    localStorage.setItem('showFileTree', String(!showTree));
    window.dispatchEvent(new Event(TREE_EVENT));
  };

  return (
    <>
      <section className="notes-filter" aria-label="文章筛选">
        {activeFilters.length > 0 && (
          <div className="notes-active-filters">
            <span>当前筛选</span>
            {activeFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateFilters({ [key]: undefined, page: 1 })}
              >
                {label} <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={clearAll}>清除全部</button>
          </div>
        )}

        <div className="notes-filter-row">
          <div>
            <h2 className="academic-kicker">Categories</h2>
            <div className="notes-filter-options">
              <button
                type="button"
                data-active={!filters.category}
                onClick={() => updateFilters({ category: undefined, page: 1 })}
              >全部</button>
              {allCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  data-active={filters.category === category}
                  onClick={() => updateFilters({
                    category: filters.category === category ? undefined : category,
                    page: 1,
                  })}
                >{category}</button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <h2 className="academic-kicker">Tags</h2>
              <div className="notes-filter-options">
                {allTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    data-active={filters.tag === tag}
                    onClick={() => updateFilters({
                      tag: filters.tag === tag ? undefined : tag,
                      page: 1,
                    })}
                  >#{tag}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="notes-layout">
        {hasTree && (
          <aside className={`notes-tree ${showTree ? '' : 'is-collapsed'}`}>
            <div className="notes-tree-inner">
              <h2 className="academic-kicker">Topics</h2>
              <FileTreeView items={fileTree!} />
            </div>
          </aside>
        )}

        <div className="notes-results">
          <header className="notes-results-header">
            <p>共 <strong>{filteredPosts.length}</strong> 篇笔记</p>
            <div>
              {hasTree && (
                <button type="button" className="notes-tree-toggle" onClick={toggleTree}>
                  <FolderTree aria-hidden />
                  {showTree ? '隐藏目录' : '显示目录'}
                </button>
              )}
              <ViewSwitcher
                view={view}
                onViewChange={(nextView) => updateFilters({ view: nextView, page: 1 })}
              />
            </div>
          </header>

          {visiblePosts.length === 0 ? (
            <div className="notes-empty">
              <FileSearch aria-hidden />
              <strong>没有找到匹配的笔记</strong>
              <button type="button" onClick={clearAll}>清除筛选</button>
            </div>
          ) : view === 'list' ? (
            <div className="academic-post-list">
              {visiblePosts.map((post) => (
                <FeaturedPostCard key={post.path} post={post} variant="list" />
              ))}
            </div>
          ) : (
            <div className="academic-post-grid">
              {visiblePosts.map((post) => (
                <FeaturedPostCard key={post.path} post={post} variant="grid" />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav className="notes-pagination" aria-label="文章分页">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => updateFilters({ page: currentPage - 1 })}
                aria-label="上一页"
              ><ChevronLeft aria-hidden /></button>
              <span>{currentPage} / {pageCount}</span>
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => updateFilters({ page: currentPage + 1 })}
                aria-label="下一页"
              ><ChevronRight aria-hidden /></button>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
