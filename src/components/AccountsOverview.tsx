'use client'

import { useState, useEffect } from 'react'

interface Account {
  account_id: string
  name: string
  type: string
  subtype: string
  mask: string
}

interface Balance {
  current_balance: number
  available_balance: number
  iso_currency_code: string
}

interface Transaction {
  transaction_id: string
  name: string
  amount: number
  date: string
  category: string[]
  merchant_name: string
}

interface AccountWithBalance extends Account {
  balance?: Balance
  recent_transactions?: Transaction[]
}

export default function AccountsOverview() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccountsData()
  }, [])

  const fetchAccountsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/get-user-data')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch accounts')
      }
      
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Fetch accounts error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(Math.abs(amount))
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-300 rounded"></div>
            <div className="h-12 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading accounts: {error}</p>
        <button 
          onClick={fetchAccountsData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">No accounts connected yet.</p>
        <p className="text-sm text-gray-500 mt-1">Link a bank account to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Your Accounts</h3>
      
      {accounts.map((account) => (
        <div key={account.account_id} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold">{account.name}</h4>
              <p className="text-sm text-gray-600">
                {account.type} • {account.subtype} • ****{account.mask}
              </p>
            </div>
            
            {account.balance && (
              <div className="text-right">
                <p className="font-semibold text-lg">
                  {formatCurrency(account.balance.current_balance, account.balance.iso_currency_code)}
                </p>
                {account.balance.available_balance !== account.balance.current_balance && (
                  <p className="text-sm text-gray-600">
                    Available: {formatCurrency(account.balance.available_balance, account.balance.iso_currency_code)}
                  </p>
                )}
              </div>
            )}
          </div>

          {account.recent_transactions && account.recent_transactions.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Recent Transactions</p>
              <div className="space-y-2">
                {account.recent_transactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.transaction_id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{transaction.merchant_name || transaction.name}</p>
                      <p className="text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                    <p className={`font-medium ${transaction.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.amount > 0 ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 