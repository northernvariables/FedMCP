/**
 * Global header component with navigation
 * Supports internationalization with language switching
 */

'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { MapleLeafIcon } from '@canadagpt/design-system';
import { Search, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMenu } from './UserMenu';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 lg:space-x-3 hover:opacity-80 transition-opacity flex-shrink-0">
            <MapleLeafIcon size={32} className="h-8 w-8 text-accent-red" />
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-bold text-text-primary">{t('siteTitle')}</span>
              <span className="text-xs text-text-tertiary hidden lg:block">{t('tagline')}</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-3 lg:space-x-5 flex-shrink min-w-0">
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('dashboard')}
            </Link>
            <Link href="/mps" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('mps')}
            </Link>
            <Link href="/chamber" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('chamber')}
            </Link>
            <Link href="/committees" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('committees')}
            </Link>
            <Link href="/bills" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('bills')}
            </Link>
            <Link href="/debates" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('debates')}
            </Link>
            <Link href="/about" className="text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap text-xs lg:text-sm">
              {t('about')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            <button
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              aria-label={tCommon('search')}
            >
              <Search className="h-5 w-5" />
            </button>
            <UserMenu />
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-border-subtle"
            >
              <nav className="py-4 space-y-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href="/mps"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('mps')}
                </Link>
                <Link
                  href="/chamber"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('chamber')}
                </Link>
                <Link
                  href="/committees"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('committees')}
                </Link>
                <Link
                  href="/bills"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('bills')}
                </Link>
                <Link
                  href="/debates"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('debates')}
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {t('about')}
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
