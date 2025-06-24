'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  account_id: string;
  account_name: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category: string[];
  transaction_id: string;
}

interface RecentTransactionsProps {
  limit?: number;
  showTitle?: boolean;
}

export default function RecentTransactions({ limit = 50, showTitle = true }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      
      if (response.ok && data.transactions) {
        // Sort transactions by date (most recent first) and apply limit
        const sortedTransactions = data.transactions
          .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit);
        setTransactions(sortedTransactions);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error loading transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    const isPositive = amount > 0;
    return {
      formatted: `$${absAmount.toFixed(2)}`,
      isPositive
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-3 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">⚠️</span>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchRecentTransactions}
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

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-4 block">💳</span>
        <p className="text-gray-600 mb-2">No recent transactions found</p>
        <p className="text-sm text-gray-500">Connect a bank account to see your transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const { formatted, isPositive } = formatAmount(transaction.amount);
        
        return (
          <div
            key={transaction.transaction_id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: '#1c4587' }}
              >
                {(transaction.merchant_name || transaction.name).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900 truncate max-w-48">
                  {transaction.merchant_name || transaction.name}
                </div>
                <div className="text-sm text-gray-600">
                  {transaction.account_name} • {formatDate(transaction.date)}
                </div>
                {transaction.category && transaction.category.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {transaction.category[0]}
                  </div>
                )}
              </div>
            </div>
            <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
              {isPositive ? '+' : '-'}{formatted}
            </div>
          </div>
        );
      })}
      
      {showTitle && (
        <div className="text-center pt-4">
          <button
            onClick={fetchRecentTransactions}
            className="text-sm font-medium hover:underline"
            style={{ color: '#1c4587' }}
          >
            Refresh Transactions
          </button>
        </div>
      )}
    </div>
  );
} 