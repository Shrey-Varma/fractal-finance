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
          className="text-white px-6 py-3 rounded-lg transition-colors"
          style={{ backgroundColor: '#1c4587' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
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
      className={`px-6 py-3 rounded-lg font-semibold transition-colors text-white ${
        ready 
          ? 'cursor-pointer' 
          : 'bg-gray-400 cursor-not-allowed'
      }`}
      style={ready ? { backgroundColor: '#1c4587' } : {}}
      onMouseEnter={(e) => {
        if (ready) {
          e.currentTarget.style.backgroundColor = '#153a73';
        }
      }}
      onMouseLeave={(e) => {
        if (ready) {
          e.currentTarget.style.backgroundColor = '#1c4587';
        }
      }}
    >
      {ready ? 'Link New Account' : 'Preparing...'}
    </button>
  )
} 