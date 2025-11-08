/**
 * Button - Primary interactive component for CanadaGPT
 *
 * Variants:
 * - primary: Red accent (main CTAs)
 * - secondary: Ghost/outline style
 * - ghost: Transparent background
 */

import React from 'react';
import { cn } from '../utils/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = [
      'inline-flex items-center justify-center',
      'rounded-lg font-medium',
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-offset-2 focus:ring-offset-bg-primary',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ];

    const variantStyles = {
      primary: [
        'bg-accent-red text-white',
        'hover:bg-accent-red-hover',
        'active:bg-accent-red-hover',
      ],
      secondary: [
        'border border-border-emphasis',
        'bg-transparent text-text-primary',
        'hover:bg-bg-elevated',
      ],
      ghost: [
        'bg-transparent text-text-secondary',
        'hover:bg-bg-elevated hover:text-text-primary',
      ],
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          isLoading && 'cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
