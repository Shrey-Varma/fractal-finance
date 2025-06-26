'use client';

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="relative bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src="/assets/logo.png" alt="Fractal" className="h-12 w-auto" />
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium smooth-transition"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
          <div className="text-center fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Your Money,
              <span style={{ color: '#1c4587' }}> Automated</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Transform simple commands into powerful financial automation. 
              Set rules once, let Fractal handle your money management automatically.
            </p>
            
            {/* Demo Example */}
            <div className="mt-12 max-w-2xl mx-auto slide-up">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 hover:shadow-xl smooth-transition">
                <div className="text-left">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">💬</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        "Move 10% of my paycheck to my TFSA"
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-center">
                    <div className="w-8 h-1 bg-blue-200 rounded"></div>
                    <div className="mx-3 text-customBlue text-2xl">→</div>
                    <div className="w-8 h-1 bg-blue-200 rounded"></div>
                  </div>
                  
                  <div className="mt-4 bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-800 font-medium text-sm">
                      ✅ Automated Rule Created
                    </p>
                    <p style={{ color: '#1c4587' }}>
                      Every paycheck → 10% automatically saved to TFSA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="btn-primary text-lg px-8 py-4"
              >
                Start Automating
              </Link>
              <button className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Fractal?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful automation that adapts to your financial goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Natural Language Rules
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Just tell Fractal what you want in plain English. No complex setup or configuration required.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Bank-Level Security
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Your data is protected with enterprise-grade encryption and security protocols.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ backgroundColor: '#1c458720' }}>
              <span className="text-2xl">⚡</span>
            </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Instant Automation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Rules activate immediately and work 24/7 to manage your finances automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 smooth-transition" style={{ backgroundColor: '#1c4587' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}>
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Connect Your Bank
              </h3>
              <p className="text-gray-600">
                Securely link your bank accounts with our trusted Plaid integration.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 smooth-transition" style={{ backgroundColor: '#1c4587' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}>
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Create Rules
              </h3>
              <p className="text-gray-600">
                Tell Fractal your financial goals in simple, everyday language.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 smooth-transition" style={{ backgroundColor: '#1c4587' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}>
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Watch It Work
              </h3>
              <p className="text-gray-600">
                Fractal automatically executes your rules and manages your money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20" style={{ backgroundColor: '#1c4587' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Trusted by Smart Savers
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-white">
              <div>
                <div className="text-4xl font-bold mb-2">10K+</div>
                <div className="text-blue-100">Active Users</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$50M+</div>
                <div className="text-blue-100">Automated Savings</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">99.9%</div>
                <div className="text-blue-100">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Automate Your Finances?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of users who have automated their financial goals with Fractal.
          </p>
          <Link
            href="/login"
            className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg smooth-transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-block"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src="/assets/logo.png" alt="Fractal" className="h-12 w-auto" />
            </div>
            <p className="text-gray-400 mb-6">
              Intelligent financial automation for everyone
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white smooth-transition">Privacy</a>
              <a href="#" className="hover:text-white smooth-transition">Terms</a>
              <a href="#" className="hover:text-white smooth-transition">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 