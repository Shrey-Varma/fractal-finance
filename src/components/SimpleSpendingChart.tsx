'use client';

import { useState, useEffect, useMemo } from 'react';

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

export default function SimpleSpendingChart() {
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
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const currentSpending = weeklyData.get(weekKey) || 0;
      weeklyData.set(weekKey, currentSpending + Math.abs(transaction.amount));
    });

    // Convert to array and sort by date
    const result: WeeklySpending[] = Array.from(weeklyData.entries())
      .map(([dateStr, spending]) => ({
        date: new Date(dateStr),
        spending,
        week: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return result;
  }, [transactions, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalSpending = weeklySpendingData.reduce((sum, week) => sum + week.spending, 0);
  const avgWeeklySpending = weeklySpendingData.length > 0 ? totalSpending / weeklySpendingData.length : 0;
  const maxSpending = Math.max(...weeklySpendingData.map(d => d.spending), 0);

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

  if (weeklySpendingData.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">📈</span>
        <p className="text-gray-600 mb-2">No spending data available</p>
        <p className="text-sm text-gray-500">Make some transactions to see your spending insights</p>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Create path for area chart
  const createPath = () => {
    if (weeklySpendingData.length === 0) return '';
    
    const points = weeklySpendingData.map((d, i) => {
      const x = (i / (weeklySpendingData.length - 1)) * innerWidth;
      const y = innerHeight - (d.spending / maxSpending) * innerHeight;
      return `${x},${y}`;
    });

    const pathData = `M0,${innerHeight} L${points.join(' L')} L${innerWidth},${innerHeight} Z`;
    return pathData;
  };

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
      <div className="bg-white border rounded-lg p-4">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          <defs>
            <linearGradient id="spendingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c4587" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1c4587" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={innerHeight * ratio}
                  x2={innerWidth}
                  y2={innerHeight * ratio}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="-10"
                  y={innerHeight * ratio + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {formatCurrency(maxSpending * (1 - ratio))}
                </text>
              </g>
            ))}
            
            {/* Area chart */}
            <path
              d={createPath()}
              fill="url(#spendingGradient)"
              stroke="#1c4587"
              strokeWidth="2"
            />
            
            {/* Data points */}
            {weeklySpendingData.map((d, i) => {
              const x = (i / (weeklySpendingData.length - 1)) * innerWidth;
              const y = innerHeight - (d.spending / maxSpending) * innerHeight;
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#1c4587"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={innerHeight + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {d.week}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
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