'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
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
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
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
    week: d.week,
    spending: d.spending
  }));

  const formatCurrency = format('$,.0f');
  const totalSpending = weeklySpendingData.reduce((sum, week) => sum + week.spending, 0);
  const avgWeeklySpending = weeklySpendingData.length > 0 ? totalSpending / weeklySpendingData.length : 0;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 60, left: 60, bottom: 40 }}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1c4587" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1c4587" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={label => `Week of ${label}`}/>
            <Area type="monotone" dataKey="spending" stroke="#1c4587" fillOpacity={1} fill="url(#spendingGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
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