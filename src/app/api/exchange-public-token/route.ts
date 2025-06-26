import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'
const PLAID_BASE = PLAID_ENV === 'production' ? "https://production.plaid.com" : "https://sandbox.plaid.com"

export async function POST(request: Request) {
    try {
        const { public_token } = await request.json()
        
        if (!public_token) {
            return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
        }

        // Exchange public token for access token
        const exchangeResponse = await fetch(`${PLAID_BASE}/item/public_token/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: PLAID_CLIENT_ID,
                secret: PLAID_SECRET,
                public_token
            }),
        })

        const exchangeData = await exchangeResponse.json()
        
        if (!exchangeResponse.ok) {
            throw new Error(exchangeData.error_message || 'Failed to exchange token')
        }

        const { access_token, item_id } = exchangeData

        // Store the access token in Supabase (you might want to encrypt it)
        const supabase = await createClient()
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        // Get institution info
        const institutionResponse = await fetch(`${PLAID_BASE}/institutions/get_by_id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: PLAID_CLIENT_ID,
                secret: PLAID_SECRET,
                institution_id: exchangeData.institution_id,
                country_codes: ['US', 'CA']
            }),
        })

        let institutionName = 'Unknown'
        if (institutionResponse.ok) {
            const institutionData = await institutionResponse.json()
            institutionName = institutionData.institution?.name || 'Unknown'
        }

        // Store the Plaid connection info
        const { data: connectionData, error: insertError } = await supabase
            .from('plaid_connections')
            .insert({
                user_id: userData.user.id,
                access_token,
                item_id,
                institution_id: exchangeData.institution_id,
                institution_name: institutionName
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error storing Plaid connection:', insertError)
            return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 })
        }

        // Trigger initial data sync
        try {
            await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sync-accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connection_id: connectionData.id })
            })
        } catch (syncError) {
            console.error('Error syncing initial data:', syncError)
        }

        return NextResponse.json({ 
            message: 'Successfully linked account',
            item_id,
            connection_id: connectionData.id
        })
    } catch (error: any) {
        console.error('Token exchange error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
} 