/**
 * Spending page - MP expense tracking and transparency
 */

'use client';

import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_TOP_SPENDERS, GET_PARTY_SPENDING_TRENDS } from '@/lib/queries';
import Link from 'next/link';
import { formatCAD } from '@canadagpt/design-system';
import { DollarSign, TrendingUp, AlertCircle, LineChart as LineChartIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SpendingPage() {
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year');
  const fiscalYear = yearParam === 'all' ? null : (yearParam ? parseInt(yearParam) : 2026);

  const { data, loading, error } = useQuery(GET_TOP_SPENDERS, {
    variables: { fiscalYear, limit: 50 },
  });

  const { data: trendsData, loading: trendsLoading } = useQuery(GET_PARTY_SPENDING_TRENDS, {
    variables: { fiscalYear },
  });

  // Party colors matching our design system
  const partyColors: Record<string, string> = {
    'Liberal': '#E31E24',  // Red
    'Conservative': '#1A4782',  // Blue
    'NDP': '#F37021',  // Orange
    'Bloc Québécois': '#00B0F0',  // Light Blue
    'Green': '#3D9B35',  // Green
    'Independent': '#666666',  // Gray
  };

  // Transform trends data for the chart
  const chartData = trendsData?.partySpendingTrends?.map((dataPoint: any) => {
    const point: any = { period: dataPoint.period };
    // Add each party's spending to the data point
    dataPoint.parties.forEach((partyData: any) => {
      point[partyData.party] = partyData.total_expenses;
    });
    point['Total MP Expenses'] = dataPoint.total_all_parties;
    return point;
  }) || [];

  // Get list of unique parties
  const parties = Array.from(
    new Set(
      trendsData?.partySpendingTrends?.flatMap((d: any) =>
        d.parties.map((p: any) => p.party)
      ) || []
    )
  ) as string[];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">MP Spending Tracker</h1>
          <p className="text-text-secondary">
            Track quarterly expenses for all Members of Parliament
          </p>
        </div>

        {/* Fiscal Year Selector */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Fiscal Year</h2>
            <DollarSign className="h-5 w-5 text-accent-red" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/spending?year=all"
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                fiscalYear === null
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-elevated text-text-primary hover:bg-bg-overlay'
              }`}
            >
              All
            </Link>
            {[2026, 2025, 2024, 2023, 2022, 2021].map((year) => (
              <Link
                key={year}
                href={`/spending?year=${year}`}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  fiscalYear === year
                    ? 'bg-accent-red text-white'
                    : 'bg-bg-elevated text-text-primary hover:bg-bg-overlay'
                }`}
              >
                {year}
              </Link>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-4">
            Note: Expense data typically reflects information 2-3 months after quarter end
          </p>
        </Card>

        {/* Spending Trends Chart */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">
              Spending Trends by Party
            </h2>
            <LineChartIcon className="h-6 w-6 text-accent-red" />
          </div>

          {trendsLoading ? (
            <Loading />
          ) : !chartData || chartData.length === 0 ? (
            <div className="text-center py-12">
              <LineChartIcon className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">
                No trend data available{fiscalYear ? ` for FY ${fiscalYear}` : ''}
              </p>
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="period"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: any) => formatCAD(value)}
                  />
                  <Legend />
                  {/* Party lines */}
                  {parties.map((party) => (
                    <Line
                      key={party}
                      type="monotone"
                      dataKey={party}
                      stroke={partyColors[party] || '#666666'}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                  {/* Total line (thicker, dashed) */}
                  <Line
                    type="monotone"
                    dataKey="Total MP Expenses"
                    stroke="#E31E24"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Top Spenders */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">
              Top Spenders{fiscalYear ? ` - FY ${fiscalYear}` : ' - All Years'}
            </h2>
            <TrendingUp className="h-6 w-6 text-accent-red" />
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <div className="flex items-start gap-4 p-4 bg-bg-overlay rounded-lg border border-accent-red/20">
              <AlertCircle className="h-5 w-5 text-accent-red mt-0.5" />
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Error Loading Data</h3>
                <p className="text-sm text-text-secondary">{error.message}</p>
              </div>
            </div>
          ) : !data?.topSpenders || data.topSpenders.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">
                No spending data available{fiscalYear ? ` for FY ${fiscalYear}` : ''}
              </p>
              <p className="text-sm text-text-tertiary mt-2">
                Try selecting a different fiscal year
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {data.topSpenders.map((item: any, index: number) => (
                  <Link
                    key={item.mp.id}
                    href={`/mps/${item.mp.id}`}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-bg-elevated transition-colors group border border-transparent hover:border-border-subtle"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl font-bold text-text-tertiary w-12 text-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-text-primary group-hover:text-accent-red transition-colors text-lg">
                          {item.mp.name}
                        </div>
                        <div className="text-sm text-text-secondary flex items-center gap-2">
                          <span>{item.mp.party}</span>
                          {item.mp.riding && (
                            <>
                              <span>•</span>
                              <span>{item.mp.riding}</span>
                            </>
                          )}
                          {item.mp.cabinet_position && (
                            <>
                              <span>•</span>
                              <span className="text-accent-red">{item.mp.cabinet_position}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent-red">
                        {formatCAD(item.total_expenses)}
                      </div>
                      <div className="text-xs text-text-tertiary">Total Expenses</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Total MPs Tracked</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {data.topSpenders.length}
                    </div>
                  </div>
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Highest Spender</div>
                    <div className="text-2xl font-bold text-accent-red">
                      {formatCAD(data.topSpenders[0].total_expenses, { compact: true })}
                    </div>
                  </div>
                  <div className="bg-bg-elevated p-4 rounded-lg">
                    <div className="text-sm text-text-secondary mb-1">Average Spending</div>
                    <div className="text-2xl font-bold text-text-primary">
                      {formatCAD(
                        data.topSpenders.reduce((sum: number, item: any) => sum + item.total_expenses, 0) /
                          data.topSpenders.length,
                        { compact: true }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Information Banner */}
        <Card className="mt-6 bg-bg-overlay border-accent-red/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent-red/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-2">About MP Expenses</h3>
              <p className="text-sm text-text-secondary mb-2">
                Members of Parliament receive budgets for office operations, travel, and staff salaries.
                All expenses are publicly disclosed quarterly through the House of Commons Proactive Disclosure system.
              </p>
              <p className="text-sm text-text-secondary">
                Variations in spending can reflect differences in riding geography, cabinet responsibilities,
                and office size. Click on any MP to view detailed expense breakdowns by category.
              </p>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
