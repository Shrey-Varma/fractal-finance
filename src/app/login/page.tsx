'use client';

import { useState } from 'react'
import { login, signup } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center fade-in">
          <Link href="/" className="inline-block mb-8">
            <div className="text-3xl font-bold text-gray-900">
              <span className="text-blue-600">Fractal</span>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignup ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-gray-600">
            {isSignup 
              ? 'Sign up to start automating your finances'
              : 'Sign in to your account to continue automating your finances'
            }
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 slide-up">
          <form className="space-y-6">
            {isSignup && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required={isSignup}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 smooth-transition"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 smooth-transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 smooth-transition"
                placeholder="Enter your password"
              />
            </div>

            {isSignup && (
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-sm text-gray-500">(for SMS notifications)</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 smooth-transition"
                  placeholder="e.g., +1234567890"
                />
              </div>
            )}

            {!isSignup && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-500 smooth-transition">
                  Forgot password?
                </a>
              </div>
            )}

            <div className="space-y-3">
              {isSignup ? (
                <button
                  formAction={signup}
                  className="w-full btn-primary text-base py-3"
                >
                  Create account
                </button>
              ) : (
                <button
                  formAction={login}
                  className="w-full btn-primary text-base py-3"
                >
                  Sign in
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="w-full btn-secondary text-base py-3"
              >
                {isSignup ? 'Already have an account? Sign in' : 'Create new account'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            By {isSignup ? 'signing up' : 'signing in'}, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 smooth-transition">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500 smooth-transition">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}