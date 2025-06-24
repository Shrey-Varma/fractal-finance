'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardSidebarProps {
  userProfile?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export default function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/home',
      icon: '🏠',
      current: pathname === '/home'
    },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: '💳',
      current: pathname === '/transactions'
    },
    {
      name: 'Automations',
      href: '/automations',
      icon: '⚙️',
      current: pathname === '/automations'
    },
    {
      name: 'Builder',
      href: '/create-automation',
      icon: '🔧',
      current: pathname === '/create-automation'
    },
    {
      name: 'Agent',
      href: '/agent',
      icon: '🤖',
      current: pathname === '/agent'
    },
    {
      name: 'Goals',
      href: '/goals',
      icon: '🎯',
      current: pathname === '/goals',
      disabled: true
    }
  ];

  const handleSignOut = () => {
    // Add sign out logic here
    console.log('Sign out clicked');
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="flex items-center justify-center h-32 px-4 border-b border-gray-200">
        <Link href="/home" className="flex items-center">
          <img src="/assets/logo.png" alt="Fractal" className="h-24 w-auto" />
        </Link>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => (
          <Link
            key={item.name}
            href={item.disabled ? '#' : item.href}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${item.current 
                ? 'text-white shadow-lg transform scale-105' 
                : item.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            style={item.current ? { backgroundColor: '#1c4587' } : {}}
            onMouseEnter={(e) => {
              if (!item.current && !item.disabled) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.current && !item.disabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            <span>{item.name}</span>
            {item.disabled && (
              <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
                Soon
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          {/* User Profile Button */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex-shrink-0">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: '#1c4587' }}>
                  {userProfile?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {userProfile?.email || 'user@example.com'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="text-gray-400">
                {showUserMenu ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <span className="mr-2">👤</span>
                Profile Settings
              </Link>
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <span className="mr-2">⚙️</span>
                Account Settings
              </Link>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="mr-2">🚪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
