'use client';

import DashboardLayout from '@/components/DashboardLayout';
import RecentTransactions from '@/components/RecentTransactions';

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">View all your recent transaction activity</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <RecentTransactions />
        </div>
      </div>
    </DashboardLayout>
  );
} 