'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation'

export default function PlaidLinkButton() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/create-link-token', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create link token')
        }
        
        setToken(data.link_token)
      } catch (err: any) {
        setError(err.message)
        console.error('Error creating link token:', err)
      } finally {
        setLoading(false)
      }
    }
    
    createLinkToken()
  }, [])

  const onSuccess = useCallback(async (publicToken: string) => {
    try {
      const response = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_token: publicToken }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange token')
      }
      
      // Redirect to home or wherever you want after successful linking
      router.push('/home?linked=true')
    } catch (err: any) {
      setError(err.message)
      console.error('Error exchanging token:', err)
    }
  }, [router])

  const onExit = useCallback((err: any, metadata: any) => {
    if (err) {
      console.error('Plaid Link exit error:', err)
      setError('Link process was interrupted')
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit,
  })

  if (loading) {
    return (
      <button disabled className="bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed">
        Loading...
      </button>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <button 
      onClick={() => open()} 
      disabled={!ready}
      className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
        ready 
          ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
          : 'bg-gray-400 text-white cursor-not-allowed'
      }`}
    >
      {ready ? 'Link Bank Account' : 'Preparing...'}
    </button>
  )
} 