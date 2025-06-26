'use client'

import { useState, useEffect } from 'react'

interface ProfileData {
  phone_number?: string
  full_name?: string
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<ProfileData>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/update-profile')
      const data = await response.json()
      
      if (response.ok) {
        setProfile(data.profile || {})
        setEditData(data.profile || {})
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      const data = await response.json()

      if (response.ok) {
        setProfile(data.profile)
        setMessage('✅ Profile updated successfully!')
        setIsEditing(false)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(profile)
    setIsEditing(false)
    setMessage('')
  }

  if (loading) {
    return <div className="text-gray-600">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg font-medium transition-colors text-white"
            style={{ backgroundColor: '#1c4587' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editData.full_name || ''}
              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
              placeholder="Enter your full name"
            />
          ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <p className="text-gray-900">{profile.full_name || 'Not set'}</p>
              </div>
          )}
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
            <span className="text-xs text-gray-500 ml-1">(for SMS notifications)</span>
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editData.phone_number || ''}
              onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
              placeholder="e.g., +1234567890"
            />
          ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-lg">
            <p className="text-gray-900">{profile.phone_number || 'Not set'}</p>
              </div>
          )}
        </div>
        {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                saving
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'text-white'
              }`}
                style={!saving ? { backgroundColor: '#1c4587' } : {}}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#153a73')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#1c4587')}
            >
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
                className="px-6 py-3 rounded-lg font-semibold text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        </div>
      </div>

        {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.includes('✅') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <p className="text-sm font-medium">{message}</p>
      </div>
      )}
    </div>
  )
} 