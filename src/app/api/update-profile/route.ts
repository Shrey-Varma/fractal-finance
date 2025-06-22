import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(req: NextRequest) {
  try {
    const { phone_number, full_name } = await req.json()

    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userData.user.id,
        phone_number,
        full_name
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: data,
      message: 'Profile updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update profile'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      profile: profile || { user_id: userData.user.id, phone_number: null, full_name: null }
    })

  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch profile'
    }, { status: 500 })
  }
} 