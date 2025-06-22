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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editData.full_name || ''}
              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          ) : (
            <p className="text-gray-900">{profile.full_name || 'Not set'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
            <span className="text-xs text-gray-500 ml-1">(for SMS notifications)</span>
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editData.phone_number || ''}
              onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., +1234567890"
            />
          ) : (
            <p className="text-gray-900">{profile.phone_number || 'Not set'}</p>
          )}
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                saving
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {message && (
          <p className="text-sm text-gray-600">{message}</p>
        )}
      </div>
    </div>
  )
} 