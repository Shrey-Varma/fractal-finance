'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardSidebarProps {
  userProfile?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  current: boolean;
  disabled?: boolean;
}

export default function DashboardSidebar({ userProfile }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    name?: string;
    email?: string;
    avatar?: string;
  }>({ name: 'User', email: 'user@example.com' });
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteSuccessData, setDeleteSuccessData] = useState<string[]>([]);

  const navigationItems: NavigationItem[] = [
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
      current: pathname === '/goals'
    }
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get user from auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('User not authenticated:', userError);
        return;
      }

      // Get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, phone_number')
        .eq('user_id', userData.user.id)
        .single();

      // Set user data from auth and profile
      setCurrentUser({
        name: profileData?.full_name || userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'User',
        email: userData.user.email || 'user@example.com',
        avatar: userData.user.user_metadata?.avatar_url
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserData = async () => {
    setShowDeleteModal(true);
    setShowUserMenu(false);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      const response = await fetch('/api/delete-user-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        // Show success state briefly
        setDeleteSuccessData(data.deletedItems);
        setShowDeleteModal(false);
        setShowDeleteSuccess(true);
        
        // Auto-sign out after 3 seconds
        setTimeout(async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push('/login');
        }, 3000);
      } else {
        setDeleteError(data.error || 'Failed to delete data');
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
      setDeleteError('An unexpected error occurred while deleting your data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
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
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              ) : currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: '#1c4587' }}>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {loading ? (
                  <span className="inline-block w-20 h-4 bg-gray-200 rounded animate-pulse"></span>
                ) : (
                  currentUser?.name || 'User'
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {loading ? (
                  <span className="inline-block w-24 h-3 bg-gray-200 rounded animate-pulse"></span>
                ) : (
                  currentUser?.email || 'user@example.com'
                )}
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
                onClick={handleDeleteUserData}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="mr-2">🗑️</span>
                Delete All Data
              </button>
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

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
            >
              {/* Danger Header */}
              <div className="relative px-8 py-6 text-white overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -top-4 -right-4 w-16 h-16 border-2 border-white rounded-full"
                  />
                  <motion.div
                    animate={{ 
                      rotate: [360, 0],
                      scale: [1.1, 1, 1.1]
                    }}
                    transition={{ 
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -bottom-4 -left-4 w-20 h-20 border border-white rounded-full"
                  />
                </div>

                <div className="relative z-10 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-3xl">⚠️</span>
                  </motion.div>
                  
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-2xl font-bold mb-2"
                  >
                    Delete All Data
                  </motion.h3>
                  
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-red-100"
                  >
                    This action cannot be undone
                  </motion.p>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mb-6"
                >
                  <p className="text-gray-700 mb-4 font-medium">
                    This will permanently delete:
                  </p>
                  
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-4">
                    <ul className="text-sm text-red-700 space-y-2">
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="text-red-500 mr-2">🤖</span>
                        All your automations and workflows
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="text-red-500 mr-2">📊</span>
                        Transaction history and analysis
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="text-red-500 mr-2">🏦</span>
                        Connected bank accounts and balances
                      </motion.li>
                      <motion.li 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.3 }}
                        className="flex items-center"
                      >
                        <span className="text-red-500 mr-2">👤</span>
                        Your profile and account settings
                      </motion.li>
                    </ul>
                  </div>
                  
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.0, duration: 0.4 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-center">
                      <span className="text-amber-500 text-xl mr-3">⚡</span>
                      <div>
                        <p className="text-amber-800 font-medium text-sm">
                          High-risk action
                        </p>
                        <p className="text-amber-700 text-xs">
                          All data will be immediately and permanently removed from our servers
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1, duration: 0.4 }}
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Type "DELETE" to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => {
                        setDeleteConfirmText(e.target.value);
                        setDeleteError('');
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all duration-200 text-center font-mono text-lg tracking-wider"
                      placeholder="Type DELETE here"
                      style={{
                        backgroundColor: deleteConfirmText === 'DELETE' ? '#fef2f2' : '#ffffff',
                        borderColor: deleteConfirmText === 'DELETE' ? '#ef4444' : '#e5e7eb'
                      }}
                    />
                    {deleteConfirmText === 'DELETE' && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-2 flex items-center justify-center text-green-600"
                      >
                        <span className="text-sm">✓ Confirmation received</span>
                      </motion.div>
                    )}
                    {deleteError && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-2 flex items-center justify-center text-red-600 bg-red-50 rounded-lg p-2"
                      >
                        <span className="text-sm">⚠️ {deleteError}</span>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Action Buttons */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="px-8 py-6 bg-gray-50 border-t border-gray-100"
              >
                <div className="flex space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                      setDeleteError('');
                      setIsDeleting(false);
                    }}
                    className="flex-1 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                    disabled={isDeleting}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: deleteConfirmText === 'DELETE' && !isDeleting ? 1.02 : 1 }}
                    whileTap={{ scale: deleteConfirmText === 'DELETE' && !isDeleting ? 0.98 : 1 }}
                    onClick={handleConfirmDelete}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg disabled:shadow-none"
                    style={{
                      background: deleteConfirmText === 'DELETE' && !isDeleting 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                        : undefined
                    }}
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Deleting...
                      </div>
                    ) : (
                      '🗑️ Delete Everything'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Success Modal */}
      <AnimatePresence>
        {showDeleteSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Success Header */}
              <div className="relative px-8 py-6 text-white overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-green-700">
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -top-4 -right-4 w-20 h-20 bg-white rounded-full"
                  />
                </div>

                <div className="relative z-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 10
                    }}
                    className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <motion.span 
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="text-3xl"
                    >
                      ✅
                    </motion.span>
                  </motion.div>
                  
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-xl font-bold mb-2"
                  >
                    Data Deleted Successfully
                  </motion.h3>
                  
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-green-100"
                  >
                    You will be signed out automatically
                  </motion.p>
                </div>
              </div>

              <div className="p-6">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="text-center"
                >
                  <p className="text-sm text-gray-600 mb-4">
                    The following data has been permanently removed:
                  </p>
                  <div className="bg-green-50 rounded-lg p-4 text-left">
                    <ul className="text-sm text-green-700 space-y-1">
                      {deleteSuccessData.map((item, index) => (
                        <motion.li
                          key={index}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                          className="flex items-center"
                        >
                          <span className="text-green-500 mr-2">•</span>
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, duration: 0.3 }}
                    className="mt-4 text-xs text-gray-500"
                  >
                    🔄 Redirecting to login in 3 seconds...
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
