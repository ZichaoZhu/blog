'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ViewType } from '@/types';

interface ViewSwitcherProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher" role="group" aria-label="文章视图">
      <button
        type="button"
        onClick={() => onViewChange('list')}
        aria-label="列表视图"
        aria-pressed={view === 'list'}
      >
        <List aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onViewChange('card')}
        aria-label="卡片视图"
        aria-pressed={view === 'card'}
      >
        <LayoutGrid aria-hidden />
      </button>
    </div>
  );
}
