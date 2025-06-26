'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

interface Automation {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  schema: any;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError('User not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to fetch automations: ' + error.message);
      } else {
        setAutomations(data || []);
      }
    } catch (err: any) {
      setError('Error fetching automations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const toggleAutomationStatus = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('flows')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) {
        alert('Failed to update automation status: ' + error.message);
      } else {
        // Refresh the list
        fetchAutomations();
      }
    } catch (err: any) {
      alert('Error updating automation: ' + err.message);
    }
  };

  const deleteAutomation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Failed to delete automation: ' + error.message);
      } else {
        // Refresh the list
        fetchAutomations();
      }
    } catch (err: any) {
      alert('Error deleting automation: ' + err.message);
    }
  };

  const getSchemaDescription = (schema: any) => {
    if (!schema) return 'No schema available';
    
    try {
      // Extract key information from the schema
      const triggers = schema.triggers?.length || 0;
      const criteria = schema.criteria?.length || 0;
      const actions = schema.actions?.length || 0;
      
      return `${triggers} trigger(s), ${criteria} criteria, ${actions} action(s)`;
    } catch {
      return 'Schema format unknown';
    }
  };

  const loadAutomationInBuilder = (automation: Automation) => {
    // Encode the automation data to pass to the builder
    const automationData = {
      id: automation.id,
      name: automation.name,
      goal: automation.goal,
      schema: automation.schema,
      start_date: automation.start_date,
      end_date: automation.end_date,
      is_active: automation.is_active
    };
    
    // Navigate to automation builder with the data
    const encodedData = encodeURIComponent(JSON.stringify(automationData));
    router.push(`/create-automation?edit=${encodedData}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Automations</h1>
          </div>
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-4" style={{ backgroundColor: '#1c4587' }}></div>
              <p className="text-gray-600">Loading automations...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Automations</h1>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-medium mb-2">Error Loading Automations</h3>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchAutomations}
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
          <h1 className="text-3xl font-bold text-gray-900">My Automations</h1>
          <Link href="/create-automation" className="text-white px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#1c4587' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}>
            Create New
          </Link>
        </div>
        {automations.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-gray-400">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Automations Yet</h3>
            <p className="text-gray-600 mb-6">Create your first automation to get started with automated financial workflows.</p>
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
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  All Automations ({automations.length})
                </h2>
                <button 
                  onClick={fetchAutomations}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  title="Refresh"
                >
                  🔄
                </button>
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
                      Goal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                  {automations.map((automation) => (
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
                        <div className="text-sm text-gray-500">
                          {automation.goal ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              🎯 {automation.goal}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No goal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAutomationStatus(automation.id, automation.is_active);
                          }}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            automation.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {automation.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(automation.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(automation.end_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate" title={JSON.stringify(automation.schema, null, 2)}>
                          {getSchemaDescription(automation.schema)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(automation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const popup = window.open('', '_blank', 'width=600,height=400');
                            if (popup) {
                              popup.document.write(`
                                <html>
                                  <head><title>${automation.name} - Schema</title></head>
                                  <body style="font-family: monospace; padding: 20px;">
                                    <h3>${automation.name}</h3>
                                    <pre>${JSON.stringify(automation.schema, null, 2)}</pre>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          View JSON
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAutomation(automation.id, automation.name);
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 