'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AutomationRule {
  trigger: {
    type: string;
    account: string;
  };
  criteria?: {
    merchant?: string;
    category?: string;
    amount_greater_than?: number;
    amount_less_than?: number;
    tracking_duration?: string;
  };
  action: {
    type: string;
    from_account?: string;
    to_account?: string;
    dollar_amount?: number;
    percent_amount?: number;
    message?: string;
    frequency?: {
      day_of_week?: string;
    };
  };
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  rule?: AutomationRule;
  timestamp: Date;
}

export default function CreateAutomationPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRule, setCurrentRule] = useState<AutomationRule | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const initialMessage = searchParams.get('initial');
    if (initialMessage) {
      handleSendMessage(initialMessage);
      setShowChat(true);
    } else {
      // Initialize with a basic rule structure
      setCurrentRule({
        trigger: { type: 'new_transaction', account: '' },
        action: { type: 'transfer' }
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch('/api/parse_rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText })
      });

      const data = await response.json();
      
      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I've updated your automation based on your description!",
          rule: data.rule,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentRule(data.rule);
      } else {
        throw new Error(data.error || 'Failed to create automation');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I couldn't process that: ${error.message}. Try describing your automation differently.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = (path: string, value: any) => {
    if (!currentRule) return;
    
    const newRule = { ...currentRule };
    const keys = path.split('.');
    let current: any = newRule;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setCurrentRule(newRule);
  };

  const EditableField = ({ 
    value, 
    onSave, 
    type = 'text', 
    placeholder = '', 
    options = [] 
  }: {
    value: any;
    onSave: (value: any) => void;
    type?: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: string[];
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');

    const handleSave = () => {
      onSave(type === 'number' ? parseFloat(editValue) || 0 : editValue);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(value || '');
        setIsEditing(false);
      }
    };

    if (isEditing) {
      if (type === 'select') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            className="bg-white border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            <option value="">Select...</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="bg-white border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    return (
      <span
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:bg-white hover:bg-opacity-50 rounded px-1 py-0.5 transition-all duration-200 border border-transparent hover:border-white hover:border-opacity-30"
      >
        {value || <span className="text-opacity-60 italic">{placeholder}</span>}
      </span>
    );
  };

  const renderTriggerBlock = () => (
    <div className="automation-block bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 hover:from-blue-150 hover:to-blue-250">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">⚡</span>
        </div>
        <span className="font-bold text-blue-900 text-lg">Trigger</span>
      </div>
      
      <div className="space-y-3 text-blue-800">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">When:</span>
          <EditableField
            value={currentRule?.trigger.type.replace('_', ' ')}
            onSave={(value) => updateRule('trigger.type', value.replace(' ', '_'))}
            type="select"
            options={['new transaction', 'income received', 'tracking']}
            placeholder="Select trigger type"
          />
        </div>
        
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Account:</span>
          <EditableField
            value={currentRule?.trigger.account}
            onSave={(value) => updateRule('trigger.account', value)}
            placeholder="Enter account name"
          />
        </div>
      </div>
    </div>
  );

  const renderCriteriaBlock = () => (
    <div className="automation-block bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-300 hover:from-yellow-150 hover:to-yellow-250">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">🔍</span>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="font-bold text-yellow-900 text-lg">Criteria</span>
          <button
            onClick={() => {
              if (currentRule?.criteria) {
                const newRule = { ...currentRule };
                delete newRule.criteria;
                setCurrentRule(newRule);
              } else {
                updateRule('criteria', {});
              }
            }}
            className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors"
          >
            {currentRule?.criteria ? 'Remove' : 'Add'}
          </button>
        </div>
      </div>
      
      {currentRule?.criteria && (
        <div className="space-y-3 text-yellow-800">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Merchant:</span>
            <EditableField
              value={currentRule.criteria.merchant}
              onSave={(value) => updateRule('criteria.merchant', value)}
              placeholder="Any merchant"
            />
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Category:</span>
            <EditableField
              value={currentRule.criteria.category}
              onSave={(value) => updateRule('criteria.category', value)}
              placeholder="Any category"
            />
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Min $:</span>
            <EditableField
              value={currentRule.criteria.amount_greater_than}
              onSave={(value) => updateRule('criteria.amount_greater_than', value)}
              type="number"
              placeholder="0"
            />
          </div>
          
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Max $:</span>
            <EditableField
              value={currentRule.criteria.amount_less_than}
              onSave={(value) => updateRule('criteria.amount_less_than', value)}
              type="number"
              placeholder="∞"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderActionBlock = () => (
    <div className="automation-block bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 hover:from-green-150 hover:to-green-250">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">🎯</span>
        </div>
        <span className="font-bold text-green-900 text-lg">Action</span>
      </div>
      
      <div className="space-y-3 text-green-800">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Do:</span>
          <EditableField
            value={currentRule?.action.type}
            onSave={(value) => updateRule('action.type', value)}
            type="select"
            options={['transfer', 'notify']}
            placeholder="Select action"
          />
        </div>
        
        {currentRule?.action.type === 'transfer' && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">From:</span>
              <EditableField
                value={currentRule.action.from_account}
                onSave={(value) => updateRule('action.from_account', value)}
                placeholder="Source account"
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">To:</span>
              <EditableField
                value={currentRule.action.to_account}
                onSave={(value) => updateRule('action.to_account', value)}
                placeholder="Destination account"
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Amount $:</span>
              <EditableField
                value={currentRule.action.dollar_amount}
                onSave={(value) => updateRule('action.dollar_amount', value)}
                type="number"
                placeholder="Fixed amount"
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Or %:</span>
              <EditableField
                value={currentRule.action.percent_amount}
                onSave={(value) => updateRule('action.percent_amount', value)}
                type="number"
                placeholder="Percentage"
              />
            </div>
          </>
        )}
        
        {currentRule?.action.type === 'notify' && (
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Message:</span>
            <EditableField
              value={currentRule.action.message}
              onSave={(value) => updateRule('action.message', value)}
              placeholder="Notification message"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/home" className="text-gray-600 hover:text-gray-900 smooth-transition">
                ← Back to Dashboard
              </Link>
              <div className="text-2xl font-bold text-gray-900">
                <span className="text-purple-600">Automation Builder</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowChat(!showChat)}
                className="btn-secondary text-sm"
              >
                {showChat ? 'Hide' : 'Show'} AI Assistant
              </button>
              <button className="btn-primary">
                Save Automation
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Assistant Chat (Collapsible) */}
        {showChat && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 slide-up">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Assistant</h3>
                    <p className="text-sm text-gray-600">Describe changes to update your automation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600 smooth-transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${message.type === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3 text-sm`}>
                    {message.content}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me to modify your automation..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 smooth-transition text-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !inputText.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed smooth-transition text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Automation Workflow */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Build Your Automation</h1>
            <p className="text-gray-600">Click on any field below to edit it directly</p>
          </div>

          {/* Automation Blocks */}
          <div className="flex items-center justify-center space-x-8 mb-8 overflow-x-auto pb-4">
            {renderTriggerBlock()}
            
            {/* Arrow */}
            <div className="flex items-center">
              <div className="w-12 h-1 bg-gradient-to-r from-blue-300 to-yellow-300 rounded"></div>
              <div className="text-gray-400 text-3xl mx-2">→</div>
              <div className="w-12 h-1 bg-gradient-to-r from-blue-300 to-yellow-300 rounded"></div>
            </div>

            {renderCriteriaBlock()}
            
            {/* Arrow */}
            <div className="flex items-center">
              <div className="w-12 h-1 bg-gradient-to-r from-yellow-300 to-green-300 rounded"></div>
              <div className="text-gray-400 text-3xl mx-2">→</div>
              <div className="w-12 h-1 bg-gradient-to-r from-yellow-300 to-green-300 rounded"></div>
            </div>

            {renderActionBlock()}
          </div>

          {/* Rule Preview */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Preview</h3>
            <div className="bg-white rounded-lg p-4 border">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(currentRule, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 