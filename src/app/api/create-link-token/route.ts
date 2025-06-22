import { NextResponse } from 'next/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID!
const PLAID_SECRET = process.env.PLAID_SECRET!
const PLAID_BASE = "https://sandbox.plaid.com"

export async function POST() {
    try {
        const response = await fetch(`${PLAID_BASE}/link/token/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: PLAID_CLIENT_ID,
                secret: PLAID_SECRET,
                client_name: "Fractal Finance",
                country_codes: ['US', 'CA'],
                language: 'en',
                user: {
                    client_user_id: 'unique-user-id'
                },
                products: ['transactions'],
            }),
        })

        const data = await response.json()
        
        if (!response.ok) {
            throw new Error(data.error_message || 'Failed to create link token')
        }

        return NextResponse.json({ link_token: data.link_token })
    } catch (error: any) {
        console.error('Link token creation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
} 