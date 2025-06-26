import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'
const PLAID_BASE = PLAID_ENV === 'production' ? "https://production.plaid.com" : "https://sandbox.plaid.com"

// Shared function to sync accounts for a single connection
async function syncConnectionAccounts(connectionId: string, userId: string) {
    const supabase = await createClient()
    
    // Get the connection
    const { data: connection, error: connectionError } = await supabase
        .from('plaid_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', userId)
        .single()

    if (connectionError || !connection) {
        throw new Error('Connection not found')
    }

    // Fetch accounts from Plaid
    const accountsResponse = await fetch(`${PLAID_BASE}/accounts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: connection.access_token
        }),
    })

    if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json()
        throw new Error(errorData.error_message || 'Failed to fetch accounts')
    }

    const accountsData = await accountsResponse.json()

    // Store accounts in database
    const accountsToInsert = accountsData.accounts.map((account: any) => ({
        account_id: account.account_id,
        plaid_connection_id: connection.id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        verification_status: account.verification_status
    }))

    // Upsert accounts
    const { error: accountsError } = await supabase
        .from('accounts')
        .upsert(accountsToInsert, { 
            onConflict: 'account_id',
            ignoreDuplicates: false 
        })

    if (accountsError) {
        console.error('Error storing accounts:', accountsError)
        throw new Error('Failed to store accounts')
    }

    // Store current balances
    const balancesToInsert = accountsData.accounts.map((account: any) => ({
        account_id: account.account_id,
        current_balance: account.balances.current,
        available_balance: account.balances.available,
        credit_limit: account.balances.limit,
        iso_currency_code: account.balances.iso_currency_code,
        unofficial_currency_code: account.balances.unofficial_currency_code,
        last_updated_datetime: new Date().toISOString()
    }))

    const { error: balancesError } = await supabase
        .from('balances')
        .insert(balancesToInsert)

    if (balancesError) {
        console.error('Error storing balances:', balancesError)
    }

    return {
        accounts_count: accountsData.accounts.length
    }
}

export async function POST(request: Request) {
    try {
        const { connection_id } = await request.json()
        
        const supabase = await createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const result = await syncConnectionAccounts(connection_id, userData.user.id)

        return NextResponse.json({ 
            message: 'Accounts synced successfully',
            ...result
        })

    } catch (error: any) {
        console.error('Sync accounts error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET endpoint to sync all connections for a user
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        // Get all connections for the user
        const { data: connections, error: connectionsError } = await supabase
            .from('plaid_connections')
            .select('*')
            .eq('user_id', userData.user.id)

        if (connectionsError) {
            throw new Error('Failed to get connections')
        }

        let totalAccounts = 0

        // Sync each connection directly (no HTTP calls)
        for (const connection of connections) {
            try {
                const result = await syncConnectionAccounts(connection.id, userData.user.id)
                totalAccounts += result.accounts_count || 0
            } catch (syncError) {
                console.error(`Error syncing connection ${connection.id}:`, syncError)
            }
        }

        return NextResponse.json({ 
            message: 'All accounts synced',
            connections_synced: connections.length,
            total_accounts: totalAccounts
        })

    } catch (error: any) {
        console.error('Sync all accounts error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
} 