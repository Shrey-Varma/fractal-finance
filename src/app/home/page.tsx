'use client';

import Link from 'next/link';
import PlaidLinkButton from "@/components/PlaidLinkButton";
import RefreshDataButton from "@/components/RefreshDataButton";
import AccountsOverview from "@/components/AccountsOverview";

import RecentTransactions from "@/components/RecentTransactions";
import SimpleSpendingChart from "@/components/SimpleSpendingChart";
import DashboardLayout from "@/components/DashboardLayout";

export default function Home() {

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Recent Transactions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Transactions Card */}
            <div className="feature-card slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
                    <p className="text-gray-600">Your latest activity</p>
                  </div>
                </div>
                <a 
                  href="/transactions" 
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#1c4587' }}
                >
                  View All
                </a>
              </div>
              
              <RecentTransactions limit={3} showTitle={false} />
            </div>

            {/* Spending Insights Card */}
            <div className="feature-card slide-up">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Spending Insights</h2>
                  <p className="text-gray-600">Track your weekly spending patterns</p>
                </div>
              </div>
              
              <SimpleSpendingChart />
            </div>
          </div>

          {/* Right Column - Profile Settings and Quick Actions */}
          <div className="space-y-8">


            {/* Account Management Card */}
            <div className="feature-card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account Management</h3>
              
              <AccountsOverview />
              
              <div className="mt-6">
                <PlaidLinkButton />
              </div>
            </div>


          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
