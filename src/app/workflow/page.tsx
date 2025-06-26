'use client';

import { useState, useEffect } from "react";
import Link from "next/link";

interface MissingField {
  nodeIndex: number;
  nodeType: string;
  nodeName: string;
  missingField: string;
  nodeId: string;
}

export default function WorkflowPage() {
  const [text, setText] = useState("");
  const [userReprompt, setUserReprompt] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReprompt, setShowReprompt] = useState(false);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [partialWorkflow, setPartialWorkflow] = useState<any>(null);
  const [showMissingFieldsForm, setShowMissingFieldsForm] = useState(false);
  const [missingFieldsData, setMissingFieldsData] = useState<{[key: string]: string}>({});
  const [repromptCount, setRepromptCount] = useState(0);
  const [userAccounts, setUserAccounts] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const MAX_REPROMPTS = 3;

  const fetchUserAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      
      if (response.ok && data.accounts) {
        const accountNames = data.accounts.map((account: any) => 
          account.official_name || account.name
        ).filter(Boolean);
        setUserAccounts(accountNames);
      } else {
        console.error('Failed to fetch user accounts:', data.error);
        setUserAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      setUserAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchUserAccounts();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    setMissingFields([]);
    setShowMissingFieldsForm(false);
    // Reset reprompt count on new submission
    setRepromptCount(0);

    try {
      const res = await fetch("/api/parse_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          userReprompt,
          availableAccounts: userAccounts 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.missingFields && data.missingFields.length > 0) {
          // Show missing fields form
          setMissingFields(data.missingFields);
          setPartialWorkflow(data.partialWorkflow);
          setShowMissingFieldsForm(true);
          setError("Please provide the missing information:");
          setRepromptCount((c) => c + 1);
        } else {
          setShowReprompt(true);
          setRepromptCount((c) => c + 1);
          throw new Error(data.error);
        }
      } else {
        setResponse(data.workflow);
        setShowReprompt(false);
        setUserReprompt("");
        setRepromptCount(0);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleMissingFieldsSubmit = async () => {
    setLoading(true);
    try {
      // Update the partial workflow with the missing field data
      const updatedWorkflow = { ...partialWorkflow };
      missingFields.forEach(field => {
        const node = updatedWorkflow.nodes[field.nodeIndex];
        if (node && node.config) {
          node.config[field.missingField] = missingFieldsData[field.nodeId + '_' + field.missingField];
        }
      });
      const res = await fetch("/api/parse_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          userReprompt: `Please update the workflow with these missing fields: ${JSON.stringify(missingFieldsData)}`,
          availableAccounts: userAccounts
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.missingFields && data.missingFields.length > 0) {
          setMissingFields(data.missingFields);
          setPartialWorkflow(data.partialWorkflow);
          setShowMissingFieldsForm(true);
          setError("Please provide the missing information:");
          setRepromptCount((c) => c + 1);
        } else {
          setShowReprompt(true);
          setRepromptCount((c) => c + 1);
          throw new Error(data.error);
        }
      } else {
        setResponse(data.workflow);
        setShowMissingFieldsForm(false);
        setMissingFields([]);
        setMissingFieldsData({});
        setError("");
        setRepromptCount(0);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (nodeType: string, missingField: string) => {
    const labels: {[key: string]: {[key: string]: string}} = {
      trigger: {
        schedule: "Schedule (e.g., weekly, daily)",
        threshold: "Threshold amount",
        account: "Account name"
      },
      condition: {
        amount: "Amount",
        operator: "Operator (greater_than, less_than, equals)",
        merchant: "Merchant name",
        category: "Category name"
      },
      action: {
        fromAccount: "From account",
        toAccount: "To account",
        amount: "Fixed dollar amount",
        percentage: "Percentage of balance/amount",
        amount_or_percentage: "Transfer amount (fixed $ or %)",
        amount_or_percentage_conflict: "Choose either fixed amount OR percentage, not both",
        message: "Message content"
      }
    };
    
    return labels[nodeType]?.[missingField] || missingField;
  };

  const getFieldPlaceholder = (nodeType: string, missingField: string) => {
    const placeholders: {[key: string]: {[key: string]: string}} = {
      trigger: {
        schedule: '{"frequency": "weekly", "dayOfWeek": "Tuesday"} or {"frequency": "once", "date": "2024-12-25"}',
        threshold: '{"amount": 500, "operator": "less_than"}',
        account: userAccounts.length > 0 ? `Select from: ${userAccounts.join(', ')}` : "Any, All, or specific account name"
      },
      condition: {
        amount: "50",
        operator: "greater_than",
        merchant: "amazon",
        category: "restaurants",
        account: userAccounts.length > 0 ? `Select from: ${userAccounts.join(', ')}` : "Any, All, or specific account name"
      },
      action: {
        fromAccount: userAccounts.length > 0 ? `Select from: ${userAccounts.join(', ')}` : "Any, All, or specific account name",
        toAccount: userAccounts.length > 0 ? `Select from: ${userAccounts.join(', ')}` : "Any, All, or specific account name",
        amount: "Enter fixed dollar amount (e.g., 50 for $50)",
        percentage: "Enter percentage (e.g., 10 for 10%)",
        amount_or_percentage: "Enter amount (e.g., 50 for $50) or percentage (e.g., 10 for 10%)",
        amount_or_percentage_conflict: "Remove one of the conflicting fields",
        message: "Your notification message"
      }
    };
    
    return placeholders[nodeType]?.[missingField] || "Enter value";
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fractal - Workflow Automation</h1>
        <Link 
          href="/home" 
          className="text-white px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#1c4587' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
        >
          Simple Mode
        </Link>
      </div>
      
      <p className="text-gray-600 mb-6">
        Create complex automation workflows with multiple triggers, conditions, and actions.
      </p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g., "Every Tuesday if my account balance is lower than 500$ and if I have spent more than 50$ on amazon, send me a message saying that cut down on spending and transfer 10$ to my savings account" or "On December 25th, if my balance is over $1000, transfer $100 to savings"'
        className="w-full p-2 border rounded mb-4"
        rows={4}
      />
      
      {showReprompt && repromptCount < MAX_REPROMPTS && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            The workflow parsing failed. Please provide additional context to help the model understand:
          </label>
          <textarea
            value={userReprompt}
            onChange={(e) => setUserReprompt(e.target.value)}
            placeholder='e.g., "This should create a scheduled trigger, then two conditions, then two actions"'
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      )}

      {showMissingFieldsForm && repromptCount < MAX_REPROMPTS && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-medium text-yellow-800 mb-3">Missing Required Information</h3>
          <p className="text-yellow-700 mb-4">Please provide the following missing details:</p>
          
          {missingFields.map((field) => (
            <div key={field.nodeId + '_' + field.missingField} className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.nodeName} ({field.nodeType}): {getFieldLabel(field.nodeType, field.missingField)}
              </label>
              <input
                type="text"
                value={missingFieldsData[field.nodeId + '_' + field.missingField] || ""}
                onChange={(e) => setMissingFieldsData({
                  ...missingFieldsData,
                  [field.nodeId + '_' + field.missingField]: e.target.value
                })}
                placeholder={getFieldPlaceholder(field.nodeType, field.missingField)}
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleMissingFieldsSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {loading ? "Updating..." : "Update Workflow"}
            </button>
            <button
              onClick={() => {
                setShowMissingFieldsForm(false);
                setMissingFields([]);
                setMissingFieldsData({});
                setError("");
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {repromptCount >= MAX_REPROMPTS && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded text-red-800">
          <strong>Too many attempts.</strong> Please review your input and try again later or contact support if you need help.
        </div>
      )}
      
      <button
        onClick={handleSubmit}
        disabled={loading || showMissingFieldsForm}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Parsing Workflow..." : "Create Workflow"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {response && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Generated Workflow</h2>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium mb-2">Workflow: {response.name}</h3>
            <p className="text-gray-600 mb-4">{response.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-blue-600">Triggers ({response.nodes.filter((n: any) => n.type === 'trigger').length})</h4>
                {response.nodes.filter((n: any) => n.type === 'trigger').map((node: any) => (
                  <div key={node.id} className="bg-blue-50 p-2 rounded mt-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.config.triggerType}</div>
                    {node.config.account && (
                      <div className="text-sm text-blue-700">Account: {node.config.account}</div>
                    )}
                    {node.config.schedule && (
                      <div className="text-sm text-blue-700">
                        Schedule: {node.config.schedule.frequency}
                        {node.config.schedule.frequency === 'weekly' && node.config.schedule.dayOfWeek && (
                          <span> on {node.config.schedule.dayOfWeek}</span>
                        )}
                        {node.config.schedule.frequency === 'once' && node.config.schedule.date && (
                          <span> on {node.config.schedule.date}</span>
                        )}
                        {node.config.schedule.time && (
                          <span> at {node.config.schedule.time}</span>
                        )}
                      </div>
                    )}
                    {node.config.threshold && (
                      <div className="text-sm text-blue-700">
                        Threshold: {node.config.threshold.operator} ${node.config.threshold.amount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium text-orange-600">Conditions ({response.nodes.filter((n: any) => n.type === 'condition').length})</h4>
                {response.nodes.filter((n: any) => n.type === 'condition').map((node: any) => (
                  <div key={node.id} className="bg-orange-50 p-2 rounded mt-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.config.conditionType}</div>
                    {node.config.account && (
                      <div className="text-sm text-orange-700">Account: {node.config.account}</div>
                    )}
                    {node.config.merchant && (
                      <div className="text-sm text-orange-700">Merchant: {node.config.merchant}</div>
                    )}
                    {node.config.category && (
                      <div className="text-sm text-orange-700">Category: {node.config.category}</div>
                    )}
                    {node.config.amount && node.config.operator && (
                      <div className="text-sm text-orange-700">
                        Amount: {node.config.operator} ${node.config.amount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium text-green-600">Actions ({response.nodes.filter((n: any) => n.type === 'action').length})</h4>
                {response.nodes.filter((n: any) => n.type === 'action').map((node: any) => (
                  <div key={node.id} className="bg-green-50 p-2 rounded mt-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.config.actionType}</div>
                    {node.config.actionType === 'transfer' && (
                      <>
                        {node.config.fromAccount && (
                          <div className="text-sm text-green-700">From: {node.config.fromAccount}</div>
                        )}
                        {node.config.toAccount && (
                          <div className="text-sm text-green-700">To: {node.config.toAccount}</div>
                        )}
                        {node.config.amount !== undefined && (
                          <div className="text-sm text-green-700">Fixed Amount: ${node.config.amount}</div>
                        )}
                        {node.config.percentage !== undefined && (
                          <div className="text-sm text-green-700">Percentage: {node.config.percentage}%</div>
                        )}
                      </>
                    )}
                    {node.config.actionType === 'notify' && node.config.message && (
                      <div className="text-sm text-green-700">Message: {node.config.message}</div>
                    )}
                    {node.config.actionType === 'set_reminder' && node.config.message && (
                      <div className="text-sm text-green-700">Reminder: {node.config.message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">View Full JSON</summary>
              <pre className="mt-2 bg-white p-4 rounded text-sm overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </main>
  );
} 