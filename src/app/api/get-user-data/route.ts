import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        // Get accounts with their latest balances
        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select(`
                *,
                plaid_connections!inner(user_id),
                balances(
                    current_balance,
                    available_balance,
                    credit_limit,
                    iso_currency_code,
                    last_updated_datetime
                )
            `)
            .eq('plaid_connections.user_id', userData.user.id)
            .order('created_at', { ascending: false })

        if (accountsError) {
            throw new Error('Failed to fetch accounts')
        }

        // Get recent transactions for each account
        const accountsWithTransactions = await Promise.all(
            (accounts || []).map(async (account) => {
                const { data: transactions } = await supabase
                    .from('transactions')
                    .select('transaction_id, name, amount, date, category, merchant_name')
                    .eq('account_id', account.account_id)
                    .order('date', { ascending: false })
                    .limit(5)

                // Get the most recent balance
                const latestBalance = account.balances && account.balances.length > 0 
                    ? account.balances.reduce((latest: any, current: any) => 
                        new Date(current.last_updated_datetime) > new Date(latest.last_updated_datetime) 
                        ? current 
                        : latest
                      )
                    : null

                return {
                    account_id: account.account_id,
                    name: account.name,
                    official_name: account.official_name,
                    type: account.type,
                    subtype: account.subtype,
                    mask: account.mask,
                    balance: latestBalance,
                    recent_transactions: transactions || []
                }
            })
        )

        // Get all transactions for the transactions page
        const { data: allTransactions, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
                transaction_id,
                account_id,
                name,
                amount,
                date,
                category,
                merchant_name,
                accounts!inner(
                    name,
                    official_name,
                    plaid_connections!inner(user_id)
                )
            `)
            .eq('accounts.plaid_connections.user_id', userData.user.id)
            .order('date', { ascending: false })
            .limit(100)

        if (transactionsError) {
            console.error('Error fetching all transactions:', transactionsError)
        }

        // Format transactions for the frontend
        const formattedTransactions = (allTransactions || []).map(transaction => ({
            transaction_id: transaction.transaction_id,
            account_id: transaction.account_id,
            account_name: transaction.accounts.official_name || transaction.accounts.name,
            name: transaction.name,
            merchant_name: transaction.merchant_name,
            amount: transaction.amount,
            date: transaction.date,
            category: transaction.category || []
        }))

        // Get connections summary
        const { data: connections, error: connectionsError } = await supabase
            .from('plaid_connections')
            .select('id, institution_name, created_at')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false })

        if (connectionsError) {
            console.error('Error fetching connections:', connectionsError)
        }

        return NextResponse.json({
            accounts: accountsWithTransactions,
            transactions: formattedTransactions,
            connections: connections || [],
            summary: {
                total_accounts: accountsWithTransactions.length,
                total_connections: (connections || []).length,
                total_balance: accountsWithTransactions.reduce((sum, account) => 
                    sum + (account.balance?.current_balance || 0), 0
                )
            }
        })

    } catch (error: any) {
        console.error('Get user data error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
} 