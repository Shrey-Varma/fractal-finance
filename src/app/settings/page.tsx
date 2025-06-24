'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ProfileSettings from '@/components/ProfileSettings';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and profile information</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <ProfileSettings />
        </div>
      </div>
    </DashboardLayout>
  );
} 