'use client';

import { useState } from "react";
import Link from 'next/link';
import PlaidLinkButton from "@/components/PlaidLinkButton";
import RefreshDataButton from "@/components/RefreshDataButton";
import AccountsOverview from "@/components/AccountsOverview";

export default function Home() {
  const [text, setText] = useState("");
  const [userReprompt, setUserReprompt] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReprompt, setShowReprompt] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/parse_rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userReprompt })
      });

      const data = await res.json();
      if (!res.ok) {
        // If parsing failed, show the reprompt field for next attempt
        setShowReprompt(true);
        throw new Error(data.error);
      }

      setResponse(data.rule);
      // Reset reprompt field on success
      setShowReprompt(false);
      setUserReprompt("");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
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

          {/* Right Column - Rule Creation */}
          <div className="space-y-8">
            {/* Rule Creation Card */}
            <div className="feature-card slide-up">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Rules</h2>
                  <p className="text-gray-600 text-sm">Automate your finances</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your financial rule
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='e.g., "Move 10% of my paycheck to my TFSA"'
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 smooth-transition resize-none"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !text.trim()}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Create Rule"
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {response && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 mr-2">✅</span>
                    <h3 className="font-medium text-green-800">Rule Created Successfully</h3>
                  </div>
                  <pre className="text-sm text-green-700 bg-green-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="feature-card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 smooth-transition">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">💰</span>
                    <div>
                      <div className="font-medium text-gray-900">View Savings Goals</div>
                      <div className="text-sm text-gray-600">Track your progress</div>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 smooth-transition">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">📊</span>
                    <div>
                      <div className="font-medium text-gray-900">Transaction History</div>
                      <div className="text-sm text-gray-600">Review recent activity</div>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 smooth-transition">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">⚙️</span>
                    <div>
                      <div className="font-medium text-gray-900">Manage Rules</div>
                      <div className="text-sm text-gray-600">Edit or disable rules</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
