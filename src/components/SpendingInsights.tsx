'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chart, ChartCanvas } from 'react-financial-charts';
import { XAxis, YAxis } from 'react-financial-charts';
import { AreaSeries } from 'react-financial-charts';
import { scaleTime } from 'd3-scale';
import { timeWeek } from 'd3-time';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';

interface Transaction {
  transaction_id: string;
  account_name: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category: string[];
}

interface WeeklySpending {
  date: Date;
  spending: number;
  week: string;
}

export default function SpendingInsights() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'4weeks' | '8weeks' | '12weeks'>('8weeks');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      
      if (response.ok && data.transactions) {
        setTransactions(data.transactions);
      } else {
        setError('Failed to fetch transaction data');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error loading spending data');
    } finally {
      setLoading(false);
    }
  };

  const weeklySpendingData = useMemo(() => {
    if (!transactions.length) return [];

    const weeks = parseInt(timeRange.replace('weeks', ''));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));

    // Filter transactions to only include spending (positive amounts) within time range
    const spendingTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return t.amount > 0 && transactionDate >= cutoffDate;
    });

    // Group by week
    const weeklyData = new Map<string, number>();
    
    spendingTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const weekStart = timeWeek.floor(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const currentSpending = weeklyData.get(weekKey) || 0;
      weeklyData.set(weekKey, currentSpending + Math.abs(transaction.amount));
    });

    // Convert to array and sort by date
    const result: WeeklySpending[] = Array.from(weeklyData.entries())
      .map(([dateStr, spending]) => ({
        date: new Date(dateStr),
        spending,
        week: timeFormat('%b %d')(new Date(dateStr))
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return result;
  }, [transactions, timeRange]);

  const chartData = weeklySpendingData.map(d => ({
    date: d.date,
    value: d.spending,
    spending: d.spending
  }));

  const formatCurrency = format('$,.0f');
  const totalSpending = weeklySpendingData.reduce((sum, week) => sum + week.spending, 0);
  const avgWeeklySpending = weeklySpendingData.length > 0 ? totalSpending / weeklySpendingData.length : 0;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
        <div className="h-64 bg-gray-300 rounded mb-4"></div>
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">📊</span>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchTransactions}
          className="text-white px-4 py-2 rounded-lg font-medium"
          style={{ backgroundColor: '#1c4587' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">📈</span>
        <p className="text-gray-600 mb-2">No spending data available</p>
        <p className="text-sm text-gray-500">Make some transactions to see your spending insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Spending Insights</h3>
        <div className="flex space-x-2">
          {(['4weeks', '8weeks', '12weeks'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={timeRange === range ? { backgroundColor: '#1c4587' } : {}}
            >
              {range.replace('weeks', ' weeks')}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Spending</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalSpending)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Avg per Week</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(avgWeeklySpending)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ChartCanvas
          height={256}
          width={800}
          ratio={1}
          margin={{ left: 60, right: 60, top: 20, bottom: 40 }}
          data={chartData}
          seriesName="Weekly Spending"
          xScale={scaleTime()}
          xAccessor={(d: any) => d.date}
          displayXAccessor={(d: any) => d.date}
        >
          <Chart id={1} yExtents={(d: any) => d.spending}>
            <XAxis 
              axisAt="bottom" 
              orient="bottom" 
              tickFormat={timeFormat('%b %d')}
              stroke="#6b7280"
            />
            <YAxis 
              axisAt="left" 
              orient="left" 
              tickFormat={formatCurrency}
              stroke="#6b7280"
            />
            <AreaSeries
              yAccessor={(d: any) => d.spending}
              fill="#1c4587"
              fillOpacity={0.3}
              stroke="#1c4587"
              strokeWidth={2}
            />
          </Chart>
        </ChartCanvas>
      </div>

      {/* Refresh button */}
      <div className="text-center">
        <button
          onClick={fetchTransactions}
          className="text-sm font-medium hover:underline"
          style={{ color: '#1c4587' }}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
} 