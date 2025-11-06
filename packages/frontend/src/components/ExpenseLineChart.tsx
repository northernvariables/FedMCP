/**
 * Expense line chart component
 * Displays MP expenses over time as a line graph to show spending trends
 */

'use client';

import { formatCAD } from '@canadagpt/design-system';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Expense {
  fiscal_year: number;
  quarter: number;
  amount: number;
  category?: string;
}

interface ExpenseLineChartProps {
  expenses: Expense[];
  title?: string;
}

interface QuarterData {
  fiscal_year: number;
  quarter: number;
  total: number;
  label: string;
}

export function ExpenseLineChart({ expenses, title = 'Expense Trend Over Time' }: ExpenseLineChartProps) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No expense data available for this MP.</p>
      </div>
    );
  }

  // Group expenses by fiscal year + quarter and sum amounts
  const quarterMap = new Map<string, QuarterData>();

  expenses.forEach((expense) => {
    const key = `${expense.fiscal_year}-Q${expense.quarter}`;

    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        fiscal_year: expense.fiscal_year,
        quarter: expense.quarter,
        total: 0,
        label: `FY${expense.fiscal_year} Q${expense.quarter}`,
      });
    }

    const quarterData = quarterMap.get(key)!;
    quarterData.total += expense.amount;
  });

  // Convert to array and sort chronologically
  const quarters = Array.from(quarterMap.values()).sort((a, b) => {
    if (a.fiscal_year !== b.fiscal_year) {
      return a.fiscal_year - b.fiscal_year;
    }
    return a.quarter - b.quarter;
  });

  if (quarters.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <p>No quarterly data available.</p>
      </div>
    );
  }

  // Calculate stats
  const amounts = quarters.map((q) => q.total);
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);
  const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);

  // Calculate overall trend (first quarter vs second-to-last quarter)
  // Exclude the last quarter as it may be incomplete/in-progress
  const firstQuarter = quarters[0];
  const lastQuarter = quarters[quarters.length - 1]; // For display purposes
  const lastCompleteQuarter = quarters.length > 1 ? quarters[quarters.length - 2] : quarters[quarters.length - 1];
  const overallTrend = ((lastCompleteQuarter.total - firstQuarter.total) / firstQuarter.total) * 100;
  const isIncreasing = overallTrend > 5;
  const isDecreasing = overallTrend < -5;

  // Chart dimensions
  const chartHeight = 300;
  const chartWidth = 100; // percentage
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };

  // Calculate points for the line
  const points = quarters.map((quarter, index) => {
    const x = (index / (quarters.length - 1)) * 100; // percentage
    const y = ((maxAmount - quarter.total) / (maxAmount - minAmount || 1)) * 100; // percentage from top
    return { x, y, quarter };
  });

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="text-2xl font-bold text-text-primary">{formatCAD(totalAmount, { compact: true })}</div>
          <div className="text-xs text-text-secondary">Total</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="text-2xl font-bold text-text-primary">{formatCAD(avgAmount, { compact: true })}</div>
          <div className="text-xs text-text-secondary">Average</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="text-2xl font-bold text-text-primary">{quarters.length}</div>
          <div className="text-xs text-text-secondary">Quarters</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-elevated">
          <div className="flex items-center justify-center gap-2">
            {isIncreasing && <TrendingUp className="h-5 w-5 text-red-400" />}
            {isDecreasing && <TrendingDown className="h-5 w-5 text-green-400" />}
            {!isIncreasing && !isDecreasing && <Minus className="h-5 w-5 text-blue-400" />}
            <div className="text-2xl font-bold text-text-primary">
              {overallTrend > 0 ? '+' : ''}{overallTrend.toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-text-secondary">Overall Trend</div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="relative bg-bg-elevated rounded-lg p-6" style={{ height: `${chartHeight}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-text-secondary" style={{ width: '50px' }}>
          <div className="text-right pr-2">{formatCAD(maxAmount, { compact: true })}</div>
          <div className="text-right pr-2">{formatCAD((maxAmount + minAmount) / 2, { compact: true })}</div>
          <div className="text-right pr-2">{formatCAD(minAmount, { compact: true })}</div>
        </div>

        {/* Chart area */}
        <div className="absolute" style={{ left: '60px', right: '40px', top: '20px', bottom: '40px' }}>
          {/* Average line */}
          <div
            className="absolute w-full border-t border-dashed border-blue-400/40"
            style={{ top: `${((maxAmount - avgAmount) / (maxAmount - minAmount || 1)) * 100}%` }}
          >
            <span className="absolute right-0 top-0 -translate-y-1/2 px-2 py-0.5 bg-blue-400/20 rounded text-xs text-blue-400">
              Avg
            </span>
          </div>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <div
              key={ratio}
              className="absolute w-full border-t border-border-subtle/30"
              style={{ top: `${ratio * 100}%` }}
            />
          ))}

          {/* SVG for line and points */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            {/* Line path */}
            <polyline
              points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="2"
              className="drop-shadow-lg"
            />

            {/* Area fill */}
            <polygon
              points={`${points.map((p) => `${p.x}%,${p.y}%`).join(' ')} 100%,100% 0%,100%`}
              fill="url(#gradient)"
              opacity="0.2"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Data points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={`${point.x}%`}
                  cy={`${point.y}%`}
                  r="4"
                  fill="rgb(239, 68, 68)"
                  className="cursor-pointer hover:r-6 transition-all"
                />
                <title>
                  {point.quarter.label}: {formatCAD(point.quarter.total)}
                </title>
              </g>
            ))}
          </svg>
        </div>

        {/* X-axis labels - show every 4th quarter to avoid crowding */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-text-secondary" style={{ paddingLeft: '60px', paddingRight: '40px', height: '30px' }}>
          {quarters
            .filter((_, index) => index === 0 || index === quarters.length - 1 || index % 4 === 0)
            .map((quarter, index, arr) => {
              const fullIndex = quarters.indexOf(quarter);
              const position = (fullIndex / (quarters.length - 1)) * 100;
              return (
                <div
                  key={`${quarter.fiscal_year}-${quarter.quarter}`}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  {quarter.label}
                </div>
              );
            })}
        </div>
      </div>

      {/* Time range summary */}
      <div className="text-xs text-text-secondary text-center pt-2">
        Showing expenses from {firstQuarter.label} to {lastQuarter.label}
        {isIncreasing && ' • Expenses trending upward'}
        {isDecreasing && ' • Expenses trending downward'}
        {!isIncreasing && !isDecreasing && ' • Expenses stable'}
      </div>
    </div>
  );
}
