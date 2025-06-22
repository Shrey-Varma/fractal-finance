'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error)
    redirect(`/error?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Extract all form data
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const phoneNumber = formData.get('phoneNumber') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })

  if (authError) {
    console.error('Signup error:', authError)
    redirect(`/error?message=${encodeURIComponent(authError.message)}`)
  }

  // If user was created successfully, update their profile with phone number
  if (authData.user && phoneNumber) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        phone_number: phoneNumber,
        full_name: fullName
      })
      .eq('user_id', authData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't redirect on profile error, just log it
    }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}