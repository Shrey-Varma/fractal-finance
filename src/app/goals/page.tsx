'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface Automation {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  schema: any;
}

interface GoalData {
  name: string;
  automations: Automation[];
  totalAutomations: number;
  activeAutomations: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const fetchGoalsAndAutomations = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError('User not authenticated');
        return;
      }

      const { data: automations, error } = await supabase
        .from('flows')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to fetch automations: ' + error.message);
        return;
      }

      // Group automations by goal
      const goalMap = new Map<string, Automation[]>();
      
      automations?.forEach((automation) => {
        const goalName = automation.goal || 'General';
        if (!goalMap.has(goalName)) {
          goalMap.set(goalName, []);
        }
        goalMap.get(goalName)?.push(automation);
      });

      // Convert to GoalData array and sort (General first, then alphabetically)
      const goalsData: GoalData[] = Array.from(goalMap.entries())
        .map(([name, automations]) => ({
          name,
          automations,
          totalAutomations: automations.length,
          activeAutomations: automations.filter(a => a.is_active).length
        }))
        .sort((a, b) => {
          if (a.name === 'General') return -1;
          if (b.name === 'General') return 1;
          return a.name.localeCompare(b.name);
        });

      setGoals(goalsData);
    } catch (err: any) {
      setError('Error fetching goals: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsAndAutomations();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const loadAutomationInBuilder = (automation: Automation) => {
    const automationData = {
      id: automation.id,
      name: automation.name,
      goal: automation.goal,
      schema: automation.schema,
      start_date: automation.start_date,
      end_date: automation.end_date,
      is_active: automation.is_active
    };
    
    const encodedData = encodeURIComponent(JSON.stringify(automationData));
    router.push(`/create-automation?edit=${encodedData}`);
  };

  const getGoalIcon = (goalName: string) => {
    if (goalName === 'General') return '📋';
    // You can add more goal-specific icons here
    const icons = ['🎯', '💰', '🏠', '🚗', '✈️', '🎓', '💡', '🌟', '⭐', '🔥'];
    const index = goalName.length % icons.length;
    return icons[index];
  };

  const getGoalColor = (goalName: string) => {
    if (goalName === 'General') return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200'
    ];
    
    const index = goalName.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
          </div>
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-4" style={{ backgroundColor: '#1c4587' }}></div>
              <p className="text-gray-600">Loading goals...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-medium mb-2">Error Loading Goals</h3>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchGoalsAndAutomations}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
            <p className="text-gray-600 mt-2">Organize and track your automation goals</p>
          </div>
          <Link 
            href="/create-automation" 
            className="text-white px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#1c4587' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
          >
            Create Automation
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-gray-400">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals Yet</h3>
            <p className="text-gray-600 mb-6">Create your first automation with a goal to get started.</p>
            <Link 
              href="/create-automation"
              className="text-white px-6 py-3 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#1c4587' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
            >
              Create Your First Automation
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Goals Overview */}
            {!selectedGoal && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {goals.map((goal, index) => (
                  <motion.div
                    key={goal.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${getGoalColor(goal.name)}`}
                    onClick={() => setSelectedGoal(goal.name)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getGoalIcon(goal.name)}</span>
                        <h3 className="text-lg font-semibold">{goal.name}</h3>
                      </div>
                      <span className="text-xs opacity-75">
                        {goal.totalAutomations} automation{goal.totalAutomations !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Active Automations</span>
                        <span className="font-semibold">{goal.activeAutomations}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Automations</span>
                        <span className="font-semibold">{goal.totalAutomations}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${goal.totalAutomations > 0 ? (goal.activeAutomations / goal.totalAutomations) * 100 : 0}%`,
                            backgroundColor: goal.name === 'General' ? '#6B7280' : '#1c4587'
                          }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Selected Goal Details */}
            <AnimatePresence>
              {selectedGoal && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => setSelectedGoal(null)}
                          className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          ← Back
                        </button>
                        <span className="text-2xl mr-3">{getGoalIcon(selectedGoal)}</span>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{selectedGoal}</h2>
                          <p className="text-sm text-gray-600">
                            {goals.find(g => g.name === selectedGoal)?.totalAutomations} automation(s) in this goal
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {goals.find(g => g.name === selectedGoal)?.automations.map((automation) => (
                          <tr 
                            key={automation.id} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => loadAutomationInBuilder(automation)}
                            title="Click to edit this automation"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {automation.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                automation.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {automation.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(automation.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadAutomationInBuilder(automation);
                                }}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 