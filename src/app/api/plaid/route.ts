import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!

const PLAID_BASE = "https://sandbox.plaid.com"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
    try {
        // 1. Create public token
        const createTokenRes = await fetch(`${PLAID_BASE}/sandbox/public_token/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            institution_id: 'ins_109508',
            initial_products: ['transactions'],
            options: {
                webhook: 'https://example.com/webhook',
                override_username: "user_transactions_dynamic",
                override_password: "test"}
          }),
        })

        const createTokenData = await createTokenRes.json()
        const public_token = createTokenData.public_token
        if (!public_token) throw new Error('Failed to create public token')

        const exchangeRes = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },                
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              public_token
            }),
          })
        
        const exchangeData = await exchangeRes.json()
        const access_token = exchangeData.access_token
        if (!access_token) throw new Error('Failed to exchange public token')
      
        const syncRes = await fetch(`${PLAID_BASE}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token,
              count: 100,
              cursor: null
            }),
          })
          
        const syncData = await syncRes.json()
        const addedTransactions = syncData.added || []

        const { data, error } = await supabase
          .from('transactions')
          .insert(addedTransactions)
        
        if (error) {
            console.error('Supabase insert error:', error)
            throw new Error('Failed to insert into Supabase')
        }

        return NextResponse.json({
            message: 'Transactions synced and saved', 
            added_count: addedTransactions.length,
            data
        })
    } catch (err: any) {
        console.error('Full sync error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}