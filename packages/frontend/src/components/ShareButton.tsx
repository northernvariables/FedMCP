/**
 * ShareButton Component
 *
 * Universal share button with social media sharing, clipboard, email, and print.
 * Uses Web Share API on mobile when available, falls back to dropdown menu via portal.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  Share2,
  Link2,
  Mail,
  Printer,
  Check,
  Facebook,
  Linkedin,
  Twitter,
} from 'lucide-react';
import { useShare, type ShareData } from '@/hooks/useShare';
import { cn } from '@canadagpt/design-system';

export interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

export function ShareButton({
  url,
  title,
  description,
  className,
  variant = 'icon',
  size = 'md',
}: ShareButtonProps) {
  const t = useTranslations('share');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const shareData: ShareData = { url, title, description };
  const {
    isSupported,
    isCopied,
    shareNative,
    copyToClipboard,
    shareEmail,
    sharePrint,
    shareTwitter,
    shareFacebook,
    shareLinkedIn,
    shareReddit,
    shareEHSocial,
    shareThreads,
  } = useShare(shareData);

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px

      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.right - dropdownWidth, // Right-align with button
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleShareClick = async (e: React.MouseEvent) => {
    // Stop propagation to prevent parent Link from being triggered
    e.preventDefault();
    e.stopPropagation();

    // Calculate position BEFORE opening to prevent flicker
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px

      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        left: rect.right - dropdownWidth, // Right-align with button
      });
    }

    // Always show dropdown menu for consistent experience across devices
    setIsOpen(!isOpen);
  };

  const handleCopyClick = async () => {
    try {
      await copyToClipboard();
      // Keep dropdown open to show "Copied!" feedback
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOptionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24,
  };

  const dropdownContent = isOpen && mounted && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        zIndex: 9999,
      }}
      className="
        w-56
        bg-bg-secondary border-2 border-border rounded-lg
        shadow-2xl py-2
      "
    >
          {/* Primary action: Copy link */}
          <button
            onClick={handleCopyClick}
            className="
              w-full px-4 py-2.5 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
              border-b border-border-subtle
              mb-1 pb-3
            "
          >
            {isCopied ? (
              <>
                <Check size={18} className="text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  {t('linkCopied')}
                </span>
              </>
            ) : (
              <>
                <Link2 size={18} className="text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">
                  {t('copyLink')}
                </span>
              </>
            )}
          </button>

          {/* Email */}
          <button
            onClick={() => handleOptionClick(shareEmail)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <Mail size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">{t('email')}</span>
          </button>

          {/* Print */}
          <button
            onClick={() => handleOptionClick(sharePrint)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
              border-b border-border-subtle
              mb-1 pb-3
            "
          >
            <Printer size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">{t('print')}</span>
          </button>

          {/* Social media heading */}
          <div className="px-4 py-1.5">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              {t('shareVia')}
            </p>
          </div>

          {/* X (Twitter) */}
          <button
            onClick={() => handleOptionClick(shareTwitter)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <Twitter size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">{t('twitter')}</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => handleOptionClick(shareFacebook)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <Facebook size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">{t('facebook')}</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={() => handleOptionClick(shareLinkedIn)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <Linkedin size={18} className="text-text-secondary" />
            <span className="text-sm text-text-primary">{t('linkedin')}</span>
          </button>

          {/* Reddit */}
          <button
            onClick={() => handleOptionClick(shareReddit)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-text-secondary"
            >
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            <span className="text-sm text-text-primary">{t('reddit')}</span>
          </button>

          {/* EH! Social */}
          <button
            onClick={() => handleOptionClick(shareEHSocial)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center text-text-secondary font-bold text-xs">
              EH!
            </div>
            <span className="text-sm text-text-primary">{t('ehSocial')}</span>
          </button>

          {/* Threads */}
          <button
            onClick={() => handleOptionClick(shareThreads)}
            className="
              w-full px-4 py-2 text-left
              hover:bg-bg-hover transition-colors
              flex items-center gap-3
            "
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-secondary"
            >
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
            <span className="text-sm text-text-primary">{t('threads')}</span>
          </button>
    </div>
  );

  return (
    <>
      {/* Share button */}
      <button
        ref={buttonRef}
        onClick={handleShareClick}
        className={cn(
          'rounded-lg border-2 border-border shadow-md transition-colors',
          'bg-bg-secondary/80 backdrop-blur-sm',
          'text-text-primary hover:text-accent-red hover:border-accent-red hover:shadow-lg',
          sizeClasses[size],
          className
        )}
        aria-label={t('button')}
        title={t('button')}
      >
        <Share2 size={iconSizes[size]} />
      </button>

      {/* Dropdown menu rendered via portal */}
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
