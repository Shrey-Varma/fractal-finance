'use client'

import { useState } from 'react'

interface RefreshStats {
  accounts_synced?: number
  transactions_added?: number
  transactions_modified?: number
  transactions_removed?: number
  connections_synced?: number
}

export default function RefreshDataButton() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<RefreshStats | null>(null)
  const [error, setError] = useState<string>('')

  const handleRefresh = async () => {
    setLoading(true)
    setError('')
    setStats(null)

    try {
      // Sync accounts and balances first
      const accountsResponse = await fetch('/api/sync-accounts', {
        method: 'GET'
      })
      
      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json()
        throw new Error(errorData.error || 'Failed to sync accounts')
      }
      
      const accountsData = await accountsResponse.json()

      // Then sync transactions
      const transactionsResponse = await fetch('/api/sync-transactions', {
        method: 'GET'
      })
      
      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json()
        throw new Error(errorData.error || 'Failed to sync transactions')
      }
      
      const transactionsData = await transactionsResponse.json()

      // Combine stats
      setStats({
        connections_synced: accountsData.connections_synced,
        accounts_synced: accountsData.total_accounts,
        transactions_added: transactionsData.added,
        transactions_modified: transactionsData.modified,
        transactions_removed: transactionsData.removed
      })

    } catch (err: any) {
      setError(err.message)
      console.error('Refresh error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors text-white ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'cursor-pointer'
        }`}
        style={!loading ? { backgroundColor: '#1c4587' } : {}}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#153a73';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#1c4587';
          }
        }}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Refreshing...
          </span>
        ) : (
          '🔄 Refresh Data'
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {stats && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-semibold mb-2">✅ Sync Complete!</p>
          <div className="text-sm space-y-1">
            <p>• {stats.connections_synced || 0} connections synced</p>
            <p>• {stats.accounts_synced || 0} accounts updated</p>
            <p>• {stats.transactions_added || 0} new transactions</p>
            {(stats.transactions_modified || 0) > 0 && (
              <p>• {stats.transactions_modified} transactions updated</p>
            )}
            {(stats.transactions_removed || 0) > 0 && (
              <p>• {stats.transactions_removed} transactions removed</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 