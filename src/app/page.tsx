import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Fractal</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automate your personal finance with intelligent rules. Transform simple commands into powerful financial automation.
          </p>
        </div>
        
        <div className="mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <p className="text-gray-700 italic">
              "Move 10% of my paycheck to my TFSA"
            </p>
            <div className="mt-4 text-sm text-gray-500">
              → Becomes an automated financial rule
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg"
        >
          Get Started
        </Link>
        
        <div className="mt-8 text-sm text-gray-500">
          Start automating your finances today
        </div>
      </div>
    </main>
  )
} 