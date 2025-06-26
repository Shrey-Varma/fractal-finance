import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { processBalanceThresholds } from '@/engine/trigger-engine'

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const userId = userData.user.id

    // Process balance thresholds for the user
    const results = await processBalanceThresholds(userId)

    return NextResponse.json({ 
      success: true, 
      message: 'Balance threshold checks completed',
      results
    })

  } catch (error: any) {
    console.error('Error checking balance triggers:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to check balance triggers'
    }, { status: 500 })
  }
}

// Allow checking for specific user (for admin/system use)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Process balance thresholds for the specified user
    const results = await processBalanceThresholds(userId)

    return NextResponse.json({ 
      success: true, 
      message: `Balance threshold checks completed for user ${userId}`,
      results
    })

  } catch (error: any) {
    console.error('Error checking balance triggers:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to check balance triggers'
    }, { status: 500 })
  }
} 