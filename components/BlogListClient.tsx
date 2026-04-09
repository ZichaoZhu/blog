'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { FeaturedPostCard } from '@/components/FeaturedPostCard';
import { FileTreeView } from '@/components/FileTreeView';
import { FolderTree } from 'lucide-react';
import type { Post, ViewType, FileTreeItem } from '@/types';

interface Filters {
  tag?: string;
  category?: string;
  folder?: string;
}

interface BlogListClientProps {
  allPosts: Post[];
  allTags: string[];
  allCategories: string[];
  fileTree?: FileTreeItem[];
  initialFilters: Filters;
}

/** 从当前 filters 构建 URL 查询串(保持可分享/可刷新) */
function filtersToQuery(filters: Filters): string {
  const search = new URLSearchParams();
  if (filters.category) search.set('category', filters.category);
  if (filters.tag) search.set('tag', filters.tag);
  if (filters.folder) search.set('folder', filters.folder);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * 判断 post 是否属于指定 folder。
 * 与 lib/posts.ts 的 getPostsByFolder 逻辑保持一致:
 * 顶层文件用 slug 作 folder,嵌套文件用第一层目录作 folder。
 */
function postInFolder(post: Post, folder: string): boolean {
  const parts = post.path.split('/');
  const postFolder = parts.length > 1 ? parts[0] : post.slug;
  return postFolder === folder;
}

export function BlogListClient({
  allPosts,
  allTags,
  allCategories,
  fileTree,
  initialFilters,
}: BlogListClientProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState<ViewType>('list');
  const [showTree, setShowTree] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('showFileTree');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('showFileTree', String(showTree));
  }, [showTree]);

  // 同步 URL 但不触发 Next.js 导航(replaceState 零成本,只改浏览器地址栏)
  useEffect(() => {
    const qs = filtersToQuery(filters);
    const next = `/blog${qs}`;
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [filters]);

  // 客户端筛选 —— useMemo 保证只在 filters 或 allPosts 变化时重算
  const filteredPosts = useMemo(() => {
    let result = allPosts;
    if (filters.folder) {
      result = result.filter((p) => postInFolder(p, filters.folder!));
    }
    if (filters.category) {
      result = result.filter((p) => p.frontmatter.category === filters.category);
    }
    if (filters.tag) {
      result = result.filter((p) => p.frontmatter.tags.includes(filters.tag!));
    }
    return result;
  }, [allPosts, filters]);

  const setCategory = useCallback((category: string | undefined) => {
    setFilters((f) => ({ ...f, category: f.category === category ? undefined : category }));
  }, []);

  const setTag = useCallback((tag: string | undefined) => {
    setFilters((f) => ({ ...f, tag: f.tag === tag ? undefined : tag }));
  }, []);

  const clearFilter = useCallback((key: keyof Filters) => {
    setFilters((f) => ({ ...f, [key]: undefined }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilters: Array<{ key: keyof Filters; label: string }> = [];
  if (filters.folder) activeFilters.push({ key: 'folder', label: `文件夹: ${filters.folder}` });
  if (filters.category) activeFilters.push({ key: 'category', label: `分类: ${filters.category}` });
  if (filters.tag) activeFilters.push({ key: 'tag', label: `标签: #${filters.tag}` });

  const hasTree = fileTree && fileTree.length > 0;

  return (
    <>
      {/* 筛选区 glass panel */}
      <div className="glass-panel p-5 mb-8 space-y-4">
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/50">
            <span className="text-xs text-muted-foreground mr-1">当前筛选：</span>
            {activeFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => clearFilter(key)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                {label}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 transition-colors"
            >
              清除全部
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <h3 className="micro-label mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory(undefined)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  !filters.category
                    ? 'bg-foreground text-background'
                    : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                }`}
              >
                全部
              </button>
              {allCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategory(category)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    filters.category === category
                      ? 'bg-foreground text-background'
                      : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <h3 className="micro-label mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      filters.tag === tag
                        ? 'bg-foreground text-background'
                        : 'bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧文件树(可选) */}
        {hasTree && (
          <aside
            className={`
              flex-shrink-0 hidden lg:block overflow-hidden
              transition-all duration-300 ease-in-out
              ${showTree ? 'w-72 opacity-100' : 'w-0 opacity-0'}
            `}
          >
            <div className="sticky top-24 w-72">
              <div className="glass-panel p-4">
                <h3 className="micro-label mb-4">Folders</h3>
                <FileTreeView items={fileTree} />
              </div>
            </div>
          </aside>
        )}

        {/* 主内容区 */}
        <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground">
              共 <span className="font-semibold text-foreground">{filteredPosts.length}</span> 篇文章
            </p>
            <div className="flex gap-2">
              {hasTree && (
                <button
                  onClick={() => setShowTree(!showTree)}
                  className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-full glass-panel text-sm hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                >
                  <FolderTree className="w-4 h-4" />
                  <span>{showTree ? '隐藏' : '显示'}文件树</span>
                </button>
              )}
              <ViewSwitcher onViewChange={setView} />
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              没有找到匹配的文章
            </div>
          ) : view === 'list' ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <FeaturedPostCard key={post.path} post={post} variant="list" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <FeaturedPostCard key={post.path} post={post} variant="grid" />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
