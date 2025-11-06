/**
 * Expense visualization chart component
 * Displays quarterly MP expenses as an interactive stacked bar chart by category
 */

'use client';

import { formatCAD } from '@canadagpt/design-system';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getCategoryBgColor } from '@/lib/categoryColors';

interface Expense {
  fiscal_year: number;
  quarter: number;
  amount: number;
  category?: string;
}

interface ExpenseChartProps {
  expenses: Expense[];
  title?: string;
  globalAverage?: number;
}

interface QuarterData {
  fiscal_year: number;
  quarter: number;
  total: number;
  categories: Map<string, number>;
}

export function ExpenseChart({ expenses, title = 'Quarterly Expenses', globalAverage }: ExpenseChartProps) {
  // Debug logging
  console.log('ExpenseChart - globalAverage:', globalAverage);
  console.log('ExpenseChart - expenses count:', expenses?.length);
  console.log('ExpenseChart - globalAverage type:', typeof globalAverage);
  console.log('ExpenseChart - globalAverage truthiness:', !!globalAverage);

  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No expense data available for this MP.</p>
      </div>
    );
  }

  // Group expenses by fiscal year + quarter
  const quarterMap = new Map<string, QuarterData>();

  expenses.forEach((expense) => {
    const key = `${expense.fiscal_year}-Q${expense.quarter}`;

    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        fiscal_year: expense.fiscal_year,
        quarter: expense.quarter,
        total: 0,
        categories: new Map(),
      });
    }

    const quarterData = quarterMap.get(key)!;
    quarterData.total += expense.amount;

    const category = expense.category || 'Other';
    const currentCategoryAmount = quarterData.categories.get(category) || 0;
    quarterData.categories.set(category, currentCategoryAmount + expense.amount);
  });

  // Convert to array and sort
  const quarters = Array.from(quarterMap.values()).sort((a, b) => {
    if (a.fiscal_year !== b.fiscal_year) {
      return a.fiscal_year - b.fiscal_year;
    }
    return a.quarter - b.quarter;
  });

  // Calculate stats
  const mpMaxAmount = Math.max(...quarters.map((q) => q.total));
  const totalAmount = quarters.reduce((sum, q) => sum + q.total, 0);
  const localAvgAmount = totalAmount / quarters.length;
  // Use global average if provided, otherwise use local average
  const avgAmount = globalAverage ?? localAvgAmount;

  // Scale chart to show both MP's expenses AND global average
  // This ensures the global average line is visible even for low-spending MPs
  const maxAmount = globalAverage ? Math.max(mpMaxAmount, globalAverage) : mpMaxAmount;

  // Debug logging
  console.log('ExpenseChart stats:', {
    mpMaxAmount,
    globalAverage,
    maxAmount,
    localAvgAmount,
    avgAmount,
    quartersCount: quarters.length
  });

  // Calculate trend (compare first half vs second half)
  // Exclude the last quarter as it may be incomplete/in-progress
  const quartersForTrend = quarters.length > 1 ? quarters.slice(0, -1) : quarters;
  const midpoint = Math.floor(quartersForTrend.length / 2);
  let trend = 0;
  let isIncreasing = false;
  let isDecreasing = false;

  // Only calculate trend if we have at least 2 quarters
  if (quartersForTrend.length >= 2 && midpoint > 0) {
    const firstHalfAvg =
      quartersForTrend.slice(0, midpoint).reduce((sum, q) => sum + q.total, 0) / midpoint;
    const secondHalfAvg =
      quartersForTrend.slice(midpoint).reduce((sum, q) => sum + q.total, 0) / (quartersForTrend.length - midpoint);
    trend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    isIncreasing = trend > 5;
    isDecreasing = trend < -5;
  }

  // Get all unique categories
  const allCategories = new Set<string>();
  quarters.forEach((q) => {
    q.categories.forEach((_, category) => allCategories.add(category));
  });
  const categories = Array.from(allCategories).sort();

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="text-2xl font-bold text-text-primary">{formatCAD(totalAmount, { compact: true })}</div>
          <div className="text-xs text-text-secondary">Total</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="text-2xl font-bold text-text-primary">{formatCAD(localAvgAmount, { compact: true })}</div>
          <div className="text-xs text-text-secondary">Average/Quarter</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="flex items-center justify-center gap-2">
            {isIncreasing && <TrendingUp className="h-5 w-5 text-yellow-400" />}
            {isDecreasing && <TrendingDown className="h-5 w-5 text-green-400" />}
            <div className="text-2xl font-bold text-text-primary">
              {Math.abs(trend).toFixed(0)}%
            </div>
          </div>
          <div className="text-xs text-text-secondary">Trend</div>
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div className="relative bg-bg-elevated rounded-lg p-6" style={{ height: '400px' }}>
        {/* Chart container */}
        <div className="absolute" style={{ left: '60px', right: '20px', top: '40px', bottom: '60px' }}>
          {/* Global average line (all MPs) - only show if globalAverage provided */}
          {globalAverage && (() => {
            const globalRatio = globalAverage / maxAmount;
            const globalPosition = `${(1 - globalRatio) * 100}%`;
            console.log('Global average line:', {
              globalAverage,
              maxAmount,
              globalRatio,
              globalPosition,
            });

            return (
              <div
                className="absolute w-full border-t-2 border-dashed border-yellow-400/60 pointer-events-none z-20"
                style={{ top: globalPosition }}
              >
                <div className="absolute left-2 top-0 -translate-y-1/2 px-2 py-1 bg-yellow-400/20 rounded text-xs text-white whitespace-nowrap">
                  All MPs Avg: {formatCAD(globalAverage, { compact: true })}
                </div>
              </div>
            );
          })()}

          {/* Individual MP's average line - always show */}
          {(() => {
            const avgRatio = localAvgAmount / maxAmount;
            const avgPosition = `${(1 - avgRatio) * 100}%`;

            // Calculate color based on comparison to global average if available
            let borderColor = 'border-blue-500/70';
            let bgColor = 'bg-blue-500/20';
            let labelText = `This MP Avg: ${formatCAD(localAvgAmount, { compact: true })}`;

            if (globalAverage) {
              const percentDiff = ((localAvgAmount - globalAverage) / globalAverage) * 100;
              const isHigh = percentDiff > 10;
              const isLow = percentDiff < -10;

              if (isHigh) {
                borderColor = 'border-red-500/70';
                bgColor = 'bg-red-500/20';
              } else if (isLow) {
                borderColor = 'border-green-500/70';
                bgColor = 'bg-green-500/20';
              }

              labelText = `This MP Avg: ${formatCAD(localAvgAmount, { compact: true })} (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`;
            }

            return (
              <div
                className={`absolute w-full border-t-2 border-dashed pointer-events-none z-20 ${borderColor}`}
                style={{ top: avgPosition }}
              >
                <div className={`absolute ${globalAverage ? 'left-[200px]' : 'left-2'} top-0 -translate-y-1/2 px-2 py-1 rounded text-xs text-white whitespace-nowrap ${bgColor}`}>
                  {labelText}
                </div>
              </div>
            );
          })()}

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <div
              key={ratio}
              className="absolute w-full border-t border-border-subtle/30"
              style={{ top: `${ratio * 100}%` }}
            />
          ))}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-start gap-4">
            {quarters.map((quarter, index) => {
              const heightPercentage = (quarter.total / maxAmount) * 100;
              const isAboveAvg = quarter.total > avgAmount;

              return (
                <div key={index} className="group relative" style={{ width: quarters.length === 1 ? '80px' : `min(80px, ${100 / quarters.length - 2}%)`, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  {/* Stacked Bar */}
                  <div
                    className="w-full rounded-t-lg overflow-hidden transition-all duration-300 hover:opacity-90 border border-border-subtle"
                    style={{ height: `${heightPercentage}%`, minHeight: heightPercentage > 0 ? '2px' : '0' }}
                  >
                    <div className="h-full flex flex-col-reverse">
                      {categories.map((category, catIndex) => {
                        const categoryAmount = quarter.categories.get(category) || 0;
                        const categoryHeightPercentage = (categoryAmount / quarter.total) * 100;

                        if (categoryAmount === 0) return null;

                        // Explicit class names for Tailwind JIT - case insensitive matching
                        let bgClass = 'bg-gray-500';
                        const categoryLower = category.toLowerCase();
                        if (categoryLower === 'salaries') bgClass = 'bg-blue-500';
                        else if (categoryLower === 'travel') bgClass = 'bg-green-500';
                        else if (categoryLower === 'hospitality') bgClass = 'bg-yellow-500';
                        else if (categoryLower === 'office') bgClass = 'bg-purple-500';
                        else if (categoryLower === 'contracts') bgClass = 'bg-red-500';

                        return (
                          <div
                            key={catIndex}
                            className={`transition-all duration-300 relative group/segment ${bgClass}`}
                            style={{ height: `${categoryHeightPercentage}%` }}
                            title={`${category}: ${formatCAD(categoryAmount)}`}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/segment:opacity-100 transition-opacity pointer-events-none z-30">
                              {category}: {formatCAD(categoryAmount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hover total */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                      {formatCAD(quarter.total)}
                      {isAboveAvg ? ' (above avg)' : ' (below avg)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-text-secondary" style={{ width: '50px', paddingTop: '40px', paddingBottom: '60px' }}>
          <div className="text-right pr-2">{formatCAD(maxAmount, { compact: true })}</div>
          <div className="text-right pr-2">{formatCAD(maxAmount * 0.75, { compact: true })}</div>
          <div className="text-right pr-2">{formatCAD(maxAmount * 0.5, { compact: true })}</div>
          <div className="text-right pr-2">{formatCAD(maxAmount * 0.25, { compact: true })}</div>
          <div className="text-right pr-2">$0</div>
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-start gap-4 text-xs text-text-secondary" style={{ paddingLeft: '60px', paddingRight: '20px', height: '50px', paddingTop: '10px' }}>
          {quarters.map((quarter, index) => (
            <div key={index} className="text-center" style={{ width: quarters.length === 1 ? '80px' : `min(80px, ${100 / quarters.length - 2}%)` }}>
              <div className="transform -rotate-45 origin-top-left whitespace-nowrap text-[10px]">
                FY{quarter.fiscal_year} Q{quarter.quarter}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-bg-elevated">
        {categories.map((category) => {
          // Explicit class names for Tailwind JIT - case insensitive matching
          let bgClass = 'bg-gray-500';
          const categoryLower = category.toLowerCase();
          if (categoryLower === 'salaries') bgClass = 'bg-blue-500';
          else if (categoryLower === 'travel') bgClass = 'bg-green-500';
          else if (categoryLower === 'hospitality') bgClass = 'bg-yellow-500';
          else if (categoryLower === 'office') bgClass = 'bg-purple-500';
          else if (categoryLower === 'contracts') bgClass = 'bg-red-500';

          return (
            <div key={category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${bgClass}`} />
              <span className="text-xs text-text-secondary">{category}</span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-text-secondary text-center pt-2">
        Showing {quarters.length} quarters of expense data
        {isIncreasing && ' • Expenses trending upward'}
        {isDecreasing && ' • Expenses trending downward'}
      </div>
    </div>
  );
}
