'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface StoredSearchSection {
  id: string;
  title: string;
  text: string;
  excerpt: string;
}

interface StoredSearchDocument {
  id: string;
  path: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string;
  date: string;
  sections: StoredSearchSection[];
}

interface SearchResult extends Omit<StoredSearchDocument, 'sections'> {
  section: string;
}

interface SearchEngine {
  import: (key: string, data: string) => void;
  search: (query: string, options: Record<string, unknown>) => unknown;
}

interface SearchEngines {
  latin: SearchEngine;
  cjk: SearchEngine;
  documents: Record<string, StoredSearchDocument>;
}

interface SearchPayload {
  version: number;
  indexes: {
    latin: Record<string, string>;
    cjk: Record<string, string>;
  };
  documents: Record<string, StoredSearchDocument>;
}

export function SearchDialog() {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<SearchEngines | null>(null);
  const loadingPromiseRef = useRef<Promise<SearchEngines> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const loadSearch = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    setLoading(true);
    setError(null);
    const promise = (async () => {
      const [{ Charset, Index }, response] = await Promise.all([
        import('flexsearch'),
        fetch('/_search/index.json'),
      ]);
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      const payload = (await response.json()) as SearchPayload;
      if (
        payload.version !== 4 ||
        !payload.indexes?.latin ||
        !payload.indexes?.cjk ||
        !payload.documents
      ) {
        throw new Error('Search index has an unsupported format');
      }

      const createEngine = (mode: 'latin' | 'cjk') => new Index({
        encoder: mode === 'cjk' ? Charset.CJK : Charset.LatinBalance,
        tokenize: 'strict',
        cache: 64,
      }) as SearchEngine;
      const engines: SearchEngines = {
        latin: createEngine('latin'),
        cjk: createEngine('cjk'),
        documents: payload.documents,
      };
      for (const mode of ['latin', 'cjk'] as const) {
        for (const [key, data] of Object.entries(payload.indexes[mode])) {
          engines[mode].import(key, data);
        }
      }
      engineRef.current = engines;
      return engines;
    })();
    loadingPromiseRef.current = promise;

    try {
      return await promise;
    } catch (loadError) {
      loadingPromiseRef.current = null;
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(`搜索索引加载失败：${message}`);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  const openDialog = useCallback(() => {
    setOpen(true);
    void loadSearch().catch(() => undefined);
  }, [loadSearch]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  useEffect(() => {
    const handleOpen = () => openDialog();
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openDialog();
      } else if (event.key === 'Escape') {
        closeDialog();
      }
    };
    window.addEventListener('open-site-search', handleOpen);
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('open-site-search', handleOpen);
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, [closeDialog, openDialog]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open && !loading) inputRef.current?.focus();
  }, [loading, open]);

  const searchFor = (value: string) => {
    setQuery(value);
    const normalized = value.trim();
    const engines = engineRef.current;
    if (!engines || normalized.length < 2) {
      setResults([]);
      return;
    }

    const engine = /[\u3400-\u9fff\uf900-\ufaff]/u.test(normalized)
      ? engines.cjk
      : engines.latin;
    const ids = engine.search(normalized, { limit: 10 }) as Array<string | number>;
    const comparableQuery = normalized.toLocaleLowerCase();
    const documents = ids.flatMap((id): SearchResult[] => {
      const document = engines.documents[String(id)];
      if (!document) return [];
      const titleMatch = document.sections.find((section) =>
        section.title.toLocaleLowerCase().includes(comparableQuery),
      );
      const section = titleMatch ?? document.sections.find((candidate) =>
        candidate.text.toLocaleLowerCase().includes(comparableQuery),
      );
      return [{
        id: document.id,
        path: section?.id ? `${document.path}#${section.id}` : document.path,
        title: document.title,
        section: section?.title ?? '',
        excerpt: section?.excerpt ?? document.excerpt,
        category: document.category,
        tags: document.tags,
        date: document.date,
      }];
    });
    setResults(documents);
  };

  if (!open) return null;

  return (
    <div className="search-overlay" role="presentation" onMouseDown={closeDialog}>
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="academic-kicker">Search</span>
            <h2 id={titleId}>搜索研究与学习笔记</h2>
          </div>
          <button type="button" onClick={closeDialog} aria-label="关闭搜索">
            <X aria-hidden />
          </button>
        </header>

        <label className="search-input">
          <Search aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => searchFor(event.target.value)}
            placeholder="输入主题、标题或关键词…"
            autoComplete="off"
            disabled={loading}
          />
          <kbd>Esc</kbd>
        </label>

        <div className="search-results" aria-live="polite">
          {loading && <p className="search-state">正在加载索引…</p>}
          {error && <p className="search-state search-error">{error}</p>}
          {!loading && !error && query.trim().length < 2 && (
            <p className="search-state">输入至少两个字符开始搜索。</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="search-state">没有找到匹配的笔记。</p>
          )}
          {results.map((result) => (
            <Link key={result.id} href={result.path} onClick={closeDialog}>
              <span>
                {result.category} · {result.date}
                {result.section ? ` · 匹配章节：${result.section}` : ''}
              </span>
              <strong>{result.title}</strong>
              {result.excerpt && <p>{result.excerpt}</p>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
