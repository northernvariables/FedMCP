/**
 * Global header component with navigation
 */

'use client';

import Link from 'next/link';
import { MapleLeafIcon } from '@canadagpt/design-system';
import { Search, Menu } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <MapleLeafIcon className="h-8 w-8 text-accent-red" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-text-primary">CanadaGPT</span>
              <span className="text-xs text-text-tertiary">Government Accountability</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/mps" className="text-text-secondary hover:text-text-primary transition-colors">
              MPs
            </Link>
            <Link href="/chamber" className="text-text-secondary hover:text-text-primary transition-colors">
              Chamber
            </Link>
            <Link href="/committees" className="text-text-secondary hover:text-text-primary transition-colors">
              Committees
            </Link>
            <Link href="/bills" className="text-text-secondary hover:text-text-primary transition-colors">
              Bills
            </Link>
            <Link href="/hansard" className="text-text-secondary hover:text-text-primary transition-colors">
              Speeches
            </Link>
            <Link href="/about" className="text-text-secondary hover:text-text-primary transition-colors">
              About
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <UserMenu />
            <button
              className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
