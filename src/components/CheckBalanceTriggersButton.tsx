'use client'

import { useState } from 'react'

export default function CheckBalanceTriggersButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  const handleCheckTriggers = async () => {
    setLoading(true)
    setMessage('')
    setDetails('')

    try {
      const response = await fetch('/api/check-balance-triggers', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Balance triggers checked successfully!')
        
        // Show detailed results
        if (data.results) {
          const { automationsFound, accountsFound, triggersExecuted, notificationsSent } = data.results
          setDetails(`
📊 Processing Results:
• Found ${automationsFound} automation(s)
• Checked ${accountsFound} account(s)
• Executed ${triggersExecuted} trigger(s)
• Sent ${notificationsSent} notification(s)
          `.trim())
        }
      } else {
        setMessage(`❌ Error: ${data.error}`)
        if (data.details) {
          setDetails(`Debug info: ${data.details}`)
        }
      }
    } catch (error: any) {
      setMessage(`❌ Network Error: ${error.message}`)
      setDetails('Check console for detailed error logs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckTriggers}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          loading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {loading ? 'Checking...' : 'Check Balance Triggers'}
      </button>
      
      {message && (
        <div className="text-sm space-y-1">
          <p className={message.includes('✅') ? 'text-green-600' : 'text-red-600'}>
            {message}
          </p>
          {details && (
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  )
} 