'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ViewType } from '@/types';

interface ViewSwitcherProps {
  onViewChange?: (view: ViewType) => void;
}

export function ViewSwitcher({ onViewChange }: ViewSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const getInitialView = (): ViewType => {
    if (typeof window === 'undefined') return 'list';
    const urlView = searchParams.get('view');
    if (urlView === 'list' || urlView === 'card') return urlView;
    const savedView = localStorage.getItem('blogView');
    return (savedView as ViewType) || 'list';
  };

  const [view, setView] = useState<ViewType>(getInitialView);

  useEffect(() => {
    const initialView = getInitialView();
    setView(initialView);
    onViewChange?.(initialView);
  }, []);

  const toggleView = (newView: ViewType) => {
    setView(newView);
    localStorage.setItem('blogView', newView);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', newView);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    onViewChange?.(newView);
  };

  return (
    <div className="flex gap-2 border rounded-lg p-1 bg-muted/30">
      <button
        onClick={() => toggleView('list')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          view === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={view === 'list'}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <button
        onClick={() => toggleView('card')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          view === 'card'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-pressed={view === 'card'}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      </button>
    </div>
  );
}
