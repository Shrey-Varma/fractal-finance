'use client';

import { useState } from "react";
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

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    setMissingFields([]);
    setShowMissingFieldsForm(false);

    try {
      const res = await fetch("/api/parse_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userReprompt })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.missingFields && data.missingFields.length > 0) {
          // Show missing fields form
          setMissingFields(data.missingFields);
          setPartialWorkflow(data.partialWorkflow);
          setShowMissingFieldsForm(true);
          setError("Please provide the missing information:");
        } else {
          setShowReprompt(true);
          throw new Error(data.error);
        }
      } else {
        setResponse(data.workflow);
        setShowReprompt(false);
        setUserReprompt("");
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
          userReprompt: `Please update the workflow with these missing fields: ${JSON.stringify(missingFieldsData)}` 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setResponse(data.workflow);
      setShowMissingFieldsForm(false);
      setMissingFields([]);
      setMissingFieldsData({});
      setError("");
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
        message: "Message content"
      }
    };
    
    return labels[nodeType]?.[missingField] || missingField;
  };

  const getFieldPlaceholder = (nodeType: string, missingField: string) => {
    const placeholders: {[key: string]: {[key: string]: string}} = {
      trigger: {
        schedule: '{"frequency": "weekly", "dayOfWeek": "Tuesday"}',
        threshold: '{"amount": 500, "operator": "less_than"}',
        account: "Any, All, or specific account name"
      },
      condition: {
        amount: "50",
        operator: "greater_than",
        merchant: "amazon",
        category: "restaurants"
      },
      action: {
        fromAccount: "Any, All, or specific account name",
        toAccount: "Any, All, or specific account name",
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
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
        placeholder='e.g., "Every Tuesday if my account balance is lower than 500$ and if I have spent more than 50$ on amazon, send me a message saying that cut down on spending and transfer 10$ to my savings account"'
        className="w-full p-2 border rounded mb-4"
        rows={4}
      />
      
      {showReprompt && (
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

      {showMissingFieldsForm && (
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
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium text-orange-600">Conditions ({response.nodes.filter((n: any) => n.type === 'condition').length})</h4>
                {response.nodes.filter((n: any) => n.type === 'condition').map((node: any) => (
                  <div key={node.id} className="bg-orange-50 p-2 rounded mt-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.config.conditionType}</div>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium text-green-600">Actions ({response.nodes.filter((n: any) => n.type === 'action').length})</h4>
                {response.nodes.filter((n: any) => n.type === 'action').map((node: any) => (
                  <div key={node.id} className="bg-green-50 p-2 rounded mt-2">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.config.actionType}</div>
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