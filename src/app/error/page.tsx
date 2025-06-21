'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'Something went wrong'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        
        <div className="space-y-2 text-sm text-gray-600 mb-6">
          <p><strong>Common issues:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Missing environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)</li>
            <li>Invalid email/password combination</li>
            <li>Supabase project not configured</li>
          </ul>
        </div>
        
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}