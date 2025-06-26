'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page since profile settings are there
    router.replace('/settings');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-4" style={{ backgroundColor: '#1c4587' }}></div>
        <p className="text-gray-600">Redirecting to settings...</p>
      </div>
    </div>
  );
} 