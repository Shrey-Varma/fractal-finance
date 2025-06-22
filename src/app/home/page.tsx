'use client';

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlaidLinkButton from "@/components/PlaidLinkButton";
import RefreshDataButton from "@/components/RefreshDataButton";
import AccountsOverview from "@/components/AccountsOverview";

export default function Home() {
  const [text, setText] = useState("");
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
      e.preventDefault();
      // Navigate to automation creation page with the initial message
      router.push(`/create-automation?initial=${encodeURIComponent(text.trim())}`);
    }
  };

  const handleCreateAutomation = () => {
    if (text.trim()) {
      router.push(`/create-automation?initial=${encodeURIComponent(text.trim())}`);
    } else {
      router.push('/create-automation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              <span className="text-blue-600">Fractal</span>
            </Link>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900 smooth-transition">
                Settings
              </button>
              <button className="text-gray-600 hover:text-gray-900 smooth-transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Your Financial Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage your automated financial rules and monitor your accounts
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Bank Connection & Accounts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bank Connection Card */}
            <div className="feature-card slide-up">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🏦</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
                  <p className="text-gray-600">Connect and manage your financial accounts</p>
                </div>
              </div>
              
              <div className="flex gap-4 mb-6">
                <PlaidLinkButton />
                <RefreshDataButton />
              </div>
              
              <AccountsOverview />
            </div>
          </div>

          {/* Right Column - Automation Creation */}
          <div className="space-y-8">
            {/* Automation Creation Card */}
            <div className="feature-card slide-up">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Automations</h2>
                  <p className="text-gray-600 text-sm">Build intelligent financial workflows</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your automation
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='e.g., "Move 10% of my paycheck to my TFSA" (Press Enter to continue)'
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 smooth-transition resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Press Enter to open the automation builder, or Shift+Enter for new line
                  </p>
                </div>

                <button
                  onClick={handleCreateAutomation}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Open Automation Builder
                </button>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="feature-card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 smooth-transition">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">💰</span>
                    <div>
                      <div className="font-medium text-gray-900">View Savings Goals</div>
                      <div className="text-sm text-gray-600">Track your progress</div>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 smooth-transition">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">📊</span>
                    <div>
                      <div className="font-medium text-gray-900">Transaction History</div>
                      <div className="text-sm text-gray-600">Review recent activity</div>
                    </div>
                  </div>
                </button>
                
                <Link 
                  href="/create-automation"
                  className="block w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 smooth-transition"
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">⚙️</span>
                    <div>
                      <div className="font-medium text-gray-900">Manage Automations</div>
                      <div className="text-sm text-gray-600">Edit or disable automations</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
