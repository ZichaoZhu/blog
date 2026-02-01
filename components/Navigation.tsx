'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { SearchDialog } from './SearchDialog';
import { useState } from 'react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold">
            我的博客
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:text-primary transition-colors">
              首页
            </Link>
            <Link href="/blog" className="hover:text-primary transition-colors">
              博客
            </Link>
            <Link href="/about" className="hover:text-primary transition-colors">
              关于
            </Link>
            <SearchDialog />
            <ThemeToggle />
          </div>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="菜单"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border">
          <div className="px-4 py-3 space-y-3">
            <Link
              href="/"
              className="block py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              首页
            </Link>
            <Link
              href="/blog"
              className="block py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              博客
            </Link>
            <Link
              href="/about"
              className="block py-2 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              关于
            </Link>
            <div className="flex items-center gap-3 pt-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
