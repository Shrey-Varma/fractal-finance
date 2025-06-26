import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'
const PLAID_BASE = PLAID_ENV === 'production' ? "https://production.plaid.com" : "https://sandbox.plaid.com"

// Shared function to sync transactions for a single connection
async function syncConnectionTransactions(connectionId: string, userId: string) {
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

    let cursor = connection.cursor || null
    let hasMore = true
    let totalAdded = 0
    let totalModified = 0
    let totalRemoved = 0

    // Sync transactions in batches
    while (hasMore) {
        const syncResponse = await fetch(`${PLAID_BASE}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: PLAID_CLIENT_ID,
                secret: PLAID_SECRET,
                access_token: connection.access_token,
                cursor: cursor,
                count: 500 // max per request
            }),
        })

        if (!syncResponse.ok) {
            const errorData = await syncResponse.json()
            throw new Error(errorData.error_message || 'Failed to sync transactions')
        }

        const syncData = await syncResponse.json()

        // Process added transactions
        if (syncData.added && syncData.added.length > 0) {
            const transactionsToInsert = syncData.added.map((transaction: any) => ({
                transaction_id: transaction.transaction_id,
                account_id: transaction.account_id,
                amount: transaction.amount,
                iso_currency_code: transaction.iso_currency_code,
                name: transaction.name,
                merchant_name: transaction.merchant_name,
                merchant_entity_id: transaction.merchant_entity_id,
                logo_url: transaction.logo_url,
                website: transaction.website,
                date: transaction.date,
                authorized_date: transaction.authorized_date,
                pending: transaction.pending,
                payment_channel: transaction.payment_channel,
                transaction_type: transaction.transaction_type,
                category: transaction.category,
                counterparties: transaction.counterparties,
                location: transaction.location,
                personal_finance_category: transaction.personal_finance_category
            }))

            const { error: insertError } = await supabase
                .from('transactions')
                .upsert(transactionsToInsert, { 
                    onConflict: 'transaction_id',
                    ignoreDuplicates: false 
                })

            if (insertError) {
                console.error('Error inserting transactions:', insertError)
            } else {
                totalAdded += syncData.added.length
            }
        }

        // Process modified transactions
        if (syncData.modified && syncData.modified.length > 0) {
            const transactionsToUpdate = syncData.modified.map((transaction: any) => ({
                transaction_id: transaction.transaction_id,
                account_id: transaction.account_id,
                amount: transaction.amount,
                iso_currency_code: transaction.iso_currency_code,
                name: transaction.name,
                merchant_name: transaction.merchant_name,
                merchant_entity_id: transaction.merchant_entity_id,
                logo_url: transaction.logo_url,
                website: transaction.website,
                date: transaction.date,
                authorized_date: transaction.authorized_date,
                pending: transaction.pending,
                payment_channel: transaction.payment_channel,
                transaction_type: transaction.transaction_type,
                category: transaction.category,
                counterparties: transaction.counterparties,
                location: transaction.location,
                personal_finance_category: transaction.personal_finance_category
            }))

            const { error: updateError } = await supabase
                .from('transactions')
                .upsert(transactionsToUpdate, { 
                    onConflict: 'transaction_id',
                    ignoreDuplicates: false 
                })

            if (updateError) {
                console.error('Error updating transactions:', updateError)
            } else {
                totalModified += syncData.modified.length
            }
        }

        // Process removed transactions
        if (syncData.removed && syncData.removed.length > 0) {
            const removedIds = syncData.removed.map((tx: any) => tx.transaction_id)
            
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .in('transaction_id', removedIds)

            if (deleteError) {
                console.error('Error removing transactions:', deleteError)
            } else {
                totalRemoved += syncData.removed.length
            }
        }

        // Update cursor and check if more data
        cursor = syncData.next_cursor
        hasMore = syncData.has_more

        // Update the cursor in the connection
        await supabase
            .from('plaid_connections')
            .update({ 
                cursor: cursor,
                updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)
    }

    return {
        added: totalAdded,
        modified: totalModified,
        removed: totalRemoved,
        cursor: cursor
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

        const result = await syncConnectionTransactions(connection_id, userData.user.id)

        return NextResponse.json({ 
            message: 'Transactions synced successfully',
            ...result
        })

    } catch (error: any) {
        console.error('Sync transactions error:', error)
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

        let totalStats = { added: 0, modified: 0, removed: 0 }

        // Sync each connection directly (no HTTP calls)
        for (const connection of connections) {
            try {
                const result = await syncConnectionTransactions(connection.id, userData.user.id)
                totalStats.added += result.added || 0
                totalStats.modified += result.modified || 0
                totalStats.removed += result.removed || 0
            } catch (syncError) {
                console.error(`Error syncing transactions for connection ${connection.id}:`, syncError)
            }
        }

        return NextResponse.json({ 
            message: 'All transactions synced',
            connections_synced: connections.length,
            ...totalStats
        })

    } catch (error: any) {
        console.error('Sync all transactions error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
} 