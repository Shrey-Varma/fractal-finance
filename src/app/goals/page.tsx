import DashboardLayout from '@/components/DashboardLayout';

export default function GoalsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1c458720' }}>
            <span className="text-4xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Goal Management Coming Soon</h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Set, track, and achieve your financial goals with intelligent automation. 
            Our goal management system will help you stay on track with personalized strategies.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#1c4587' }}>
                <span className="text-white text-sm">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Progress Tracking</h3>
              <p className="text-sm text-gray-600">Visual progress tracking with detailed analytics and milestones</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#1c4587' }}>
                <span className="text-white text-sm">🤖</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Automation</h3>
              <p className="text-sm text-gray-600">Automatic transfers and adjustments to keep you on track</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#1c4587' }}>
                <span className="text-white text-sm">🏆</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Achievement Rewards</h3>
              <p className="text-sm text-gray-600">Celebrate milestones and stay motivated with achievement system</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 