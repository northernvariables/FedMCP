/**
 * StatCard Component
 *
 * Displays a key metric with optional trend indicator
 */

import { Card } from '@canadagpt/design-system';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  href?: string;
}

export function StatCard({ title, value, icon: Icon, trend, subtitle, href }: StatCardProps) {
  const content = (
    <Card className={`${href ? 'hover:border-accent-red transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-tertiary">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-sm mt-2 ${
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-bg-elevated rounded-lg">
          <Icon className="h-6 w-6 text-accent-red" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
