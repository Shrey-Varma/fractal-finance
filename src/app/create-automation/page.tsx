'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { CodeBlock } from '@/components/ui/code-block';
import { Button } from '@/components/ui/stateful-button';

interface TriggerBlock {
  id: string;
  name?: string;
  type: string; // triggerType from schema
  account?: string;
  tracking_start_date?: string;
  tracking_end_date?: string;
  schedule?: {
    frequency?: string;
    dayOfWeek?: string;
    dayOfMonth?: number;
    time?: string;
    date?: string;
  };
  threshold?: {
    amount?: number;
    operator?: string;
  };
}

interface CriteriaBlock {
  id: string;
  name?: string;
  conditionType?: string;
  account?: string;
  merchant?: string;
  category?: string;
  amount?: number;
  operator?: string;
  tracking_start_date?: string;
  tracking_end_date?: string;
  timeWindow?: {
    start?: string;
    end?: string;
    duration?: string;
  };
}

interface ActionBlock {
  id: string;
  name?: string;
  type: string; // actionType from schema
  fromAccount?: string;
  toAccount?: string;
  amount?: number;
  percentage?: number;
  message?: string;
  notificationType?: string;
  tracking_start_date?: string;
  tracking_end_date?: string;
}

interface AutomationRule {
  triggers: TriggerBlock[];
  criteria: CriteriaBlock[];
  actions: ActionBlock[];
  tracking_start_date?: string;
  tracking_end_date?: string;
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
  const [userAccounts, setUserAccounts] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageProcessedRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [automationName, setAutomationName] = useState('');
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);

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
    
    const initialMessage = searchParams.get('initial');
    const editData = searchParams.get('edit');
    
    if (editData && !initialMessageProcessedRef.current) {
      // Load existing automation for editing
      try {
        const automationData = JSON.parse(decodeURIComponent(editData));
        setEditingAutomationId(automationData.id);
        setAutomationName(automationData.name || '');
        
        // Convert the schema to our rule format
        if (automationData.schema) {
          const rule = convertWorkflowToRule({ nodes: [] }); // Start with empty
          // If the schema is already in our rule format, use it directly
          if (automationData.schema.triggers || automationData.schema.criteria || automationData.schema.actions) {
            setCurrentRule({
              triggers: automationData.schema.triggers || [{ id: '1', type: 'new_transaction', account: '' }],
              criteria: automationData.schema.criteria || [],
              actions: automationData.schema.actions || [{ id: '1', type: 'transfer', amount: 0 }],
              tracking_start_date: automationData.schema.tracking_start_date || '',
              tracking_end_date: automationData.schema.tracking_end_date || ''
            });
          } else {
            // If it's a workflow format, convert it
            setCurrentRule(convertWorkflowToRule(automationData.schema));
          }
        }
        initialMessageProcessedRef.current = true;
      } catch (error) {
        console.error('Error loading automation for editing:', error);
        // Fall back to default initialization
        setCurrentRule({
          triggers: [{ id: '1', type: 'new_transaction', account: '' }],
          criteria: [],
          actions: [{ id: '1', type: 'transfer', amount: 0 }],
          tracking_start_date: '',
          tracking_end_date: ''
        });
      }
    } else if (initialMessage && !initialMessageProcessedRef.current) {
      handleSendMessage(initialMessage);
      initialMessageProcessedRef.current = true;
    } else {
      // Initialize with a basic rule structure
      setCurrentRule({
        triggers: [{ id: '1', type: 'new_transaction', account: '' }],
        criteria: [],
        actions: [{ id: '1', type: 'transfer', amount: 0 }],
        tracking_start_date: '',
        tracking_end_date: ''
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const convertWorkflowToRule = (workflow: any): AutomationRule => {
    if (!workflow || !workflow.nodes) {
      return {
        triggers: [],
        criteria: [],
        actions: []
      };
    }

    const triggers: TriggerBlock[] = [];
    const criteria: CriteriaBlock[] = [];
    const actions: ActionBlock[] = [];

    workflow.nodes.forEach((node: any) => {
      if (node.type === 'trigger') {
        triggers.push({
          id: node.id,
          name: node.name,
          type: node.config?.triggerType || 'new_transaction',
          account: findClosestAccount(node.config?.account || '', userAccounts),
          tracking_start_date: node.config?.tracking_start_date,
          tracking_end_date: node.config?.tracking_end_date,
          schedule: node.config?.schedule,
          threshold: node.config?.threshold
        });
      } else if (node.type === 'condition') {
        // Check if this condition has multiple condition types and split them
        const baseCondition = {
          id: node.id,
          name: node.name,
          account: findClosestAccount(node.config?.account || '', userAccounts),
          tracking_start_date: node.config?.tracking_start_date,
          tracking_end_date: node.config?.tracking_end_date,
          timeWindow: node.config?.timeWindow
        };

        const hasAmount = node.config?.amount !== undefined && node.config?.operator;
        const hasMerchant = node.config?.merchant;
        const hasCategory = node.config?.category;
        const conditionType = node.config?.conditionType;

        // If we have a merchant/category filter AND amount/operator, split into two criteria
        if ((hasMerchant || hasCategory) && hasAmount && conditionType !== 'amount_range') {
          // Add merchant/category filter
          if (hasMerchant) {
            criteria.push({
              ...baseCondition,
              id: `${node.id}-merchant`,
              name: `${node.name || 'Condition'} - Merchant Filter`,
              conditionType: 'merchant_filter',
              merchant: node.config?.merchant
            });
          }
          if (hasCategory) {
            criteria.push({
              ...baseCondition,
              id: `${node.id}-category`,
              name: `${node.name || 'Condition'} - Category Filter`,
              conditionType: 'category_filter',
              category: node.config?.category
            });
          }
          
          // Add spending threshold
          criteria.push({
            ...baseCondition,
            id: `${node.id}-threshold`,
            name: `${node.name || 'Condition'} - Spending Threshold`,
            conditionType: 'spending_threshold',
            amount: node.config?.amount,
            operator: node.config?.operator
          });
        } else {
          // Single condition type
          criteria.push({
            ...baseCondition,
            conditionType: node.config?.conditionType,
            merchant: node.config?.merchant,
            category: node.config?.category,
            amount: node.config?.amount,
            operator: node.config?.operator
          });
        }
      } else if (node.type === 'action') {
        actions.push({
          id: node.id,
          name: node.name,
          type: node.config?.actionType || 'transfer',
          fromAccount: findClosestAccount(node.config?.fromAccount || '', userAccounts),
          toAccount: findClosestAccount(node.config?.toAccount || '', userAccounts),
          amount: node.config?.amount,
          percentage: node.config?.percentage,
          message: node.config?.message,
          notificationType: node.config?.notificationType,
          tracking_start_date: node.config?.tracking_start_date,
          tracking_end_date: node.config?.tracking_end_date
        });
      }
    });

    // Extract global dates from the first item that has tracking dates
    let globalStartDate = '';
    let globalEndDate = '';
    
    [...triggers, ...criteria, ...actions].forEach(item => {
      if (item.tracking_start_date && !globalStartDate) {
        globalStartDate = item.tracking_start_date;
      }
      if (item.tracking_end_date && !globalEndDate) {
        globalEndDate = item.tracking_end_date;
      }
    });

    return {
      triggers: triggers.length > 0 ? triggers : [{ id: '1', type: 'new_transaction', account: '' }],
      criteria,
      actions: actions.length > 0 ? actions : [{ id: '1', type: 'transfer', amount: 0 }],
      tracking_start_date: globalStartDate,
      tracking_end_date: globalEndDate
    };
  };

  const convertRuleToWorkflow = (rule: AutomationRule): any => {
    const nodes: any[] = [];
    let nodeCounter = 1;

    // Add trigger nodes
    rule.triggers?.forEach((trigger) => {
      nodes.push({
        id: trigger.id,
        type: 'trigger',
        name: trigger.name || `Trigger ${nodeCounter++}`,
        position: { x: 100, y: 100 },
        enabled: true,
        config: {
          triggerType: trigger.type,
          account: trigger.account,
          tracking_start_date: trigger.tracking_start_date,
          tracking_end_date: trigger.tracking_end_date,
          schedule: trigger.schedule,
          threshold: trigger.threshold
        }
      });
    });

    // Add condition nodes
    rule.criteria?.forEach((criteria) => {
      nodes.push({
        id: criteria.id,
        type: 'condition',
        name: criteria.name || `Condition ${nodeCounter++}`,
        position: { x: 300, y: 100 },
        enabled: true,
        config: {
          conditionType: criteria.conditionType || 'amount_range',
          account: criteria.account,
          merchant: criteria.merchant,
          category: criteria.category,
          amount: criteria.amount,
          operator: criteria.operator,
          tracking_start_date: criteria.tracking_start_date,
          tracking_end_date: criteria.tracking_end_date,
          timeWindow: criteria.timeWindow
        }
      });
    });

    // Add action nodes
    rule.actions?.forEach((action) => {
      nodes.push({
        id: action.id,
        type: 'action',
        name: action.name || `Action ${nodeCounter++}`,
        position: { x: 500, y: 100 },
        enabled: true,
        config: {
          actionType: action.type,
          fromAccount: action.fromAccount,
          toAccount: action.toAccount,
          amount: action.amount,
          percentage: action.percentage,
          message: action.message,
          notificationType: action.notificationType,
          tracking_start_date: action.tracking_start_date,
          tracking_end_date: action.tracking_end_date
        }
      });
    });

    return {
      id: 'workflow-1',
      name: 'Generated Workflow',
      nodes,
      connections: []
    };
  };

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
      const response = await fetch('/api/parse_workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: messageText,
          currentWorkflow: currentRule ? convertRuleToWorkflow(currentRule) : null,
          availableAccounts: userAccounts
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I've updated your automation based on your description!",
          rule: convertWorkflowToRule(data.workflow),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        // Convert workflow format to our rule format
        const normalizedRule = convertWorkflowToRule(data.workflow);
        setCurrentRule(normalizedRule);
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

  const addTrigger = () => {
    if (!currentRule) return;
    const newTrigger: TriggerBlock = {
      id: Date.now().toString(),
      type: 'new_transaction',
      account: ''
    };
    setCurrentRule({
      ...currentRule,
      triggers: [...(currentRule.triggers || []), newTrigger]
    });
  };

  const addCriteria = () => {
    if (!currentRule) return;
    const newCriteria: CriteriaBlock = {
      id: Date.now().toString()
    };
    setCurrentRule({
      ...currentRule,
      criteria: [...(currentRule.criteria || []), newCriteria]
    });
  };

  const addAction = () => {
    if (!currentRule) return;
    const newAction: ActionBlock = {
      id: Date.now().toString(),
      type: 'transfer',
      amount: 0 // Initialize with fixed amount by default
    };
    setCurrentRule({
      ...currentRule,
      actions: [...(currentRule.actions || []), newAction]
    });
  };

  const updateTrigger = (id: string, field: string, value: any) => {
    if (!currentRule || !currentRule.triggers) return;
    const updatedRule = {
      ...currentRule,
      triggers: currentRule.triggers.map(trigger =>
        trigger.id === id ? { ...trigger, [field]: value } : trigger
      )
    };
    setCurrentRule(syncGlobalDates(updatedRule));
  };

  const updateCriteria = (id: string, field: string, value: any) => {
    if (!currentRule || !currentRule.criteria) return;
    const updatedRule = {
      ...currentRule,
      criteria: currentRule.criteria.map(criteria =>
        criteria.id === id ? { ...criteria, [field]: value } : criteria
      )
    };
    setCurrentRule(syncGlobalDates(updatedRule));
  };

  const updateAction = (id: string, field: string, value: any) => {
    if (!currentRule || !currentRule.actions) return;
    const updatedRule = {
      ...currentRule,
      actions: currentRule.actions.map(action =>
        action.id === id ? { ...action, [field]: value } : action
      )
    };
    setCurrentRule(syncGlobalDates(updatedRule));
  };

  const deleteTrigger = (id: string) => {
    if (!currentRule || !currentRule.triggers) return;
    setCurrentRule({
      ...currentRule,
      triggers: currentRule.triggers.filter(trigger => trigger.id !== id)
    });
  };

  const deleteCriteria = (id: string) => {
    if (!currentRule || !currentRule.criteria) return;
    setCurrentRule({
      ...currentRule,
      criteria: currentRule.criteria.filter(criteria => criteria.id !== id)
    });
  };

  const deleteAction = (id: string) => {
    if (!currentRule || !currentRule.actions) return;
    setCurrentRule({
      ...currentRule,
      actions: currentRule.actions.filter(action => action.id !== id)
    });
  };

  const updateGlobalField = (field: string, value: any) => {
    if (!currentRule) return;
    setCurrentRule({
      ...currentRule,
      [field]: value
    });
  };

  const syncGlobalDates = (rule: AutomationRule) => {
    // Extract earliest start date and latest end date from all blocks
    const allItems = [...(rule.triggers || []), ...(rule.criteria || []), ...(rule.actions || [])];
    
    let earliestStart = '';
    let latestEnd = '';
    
    allItems.forEach(item => {
      if (item.tracking_start_date) {
        if (!earliestStart || item.tracking_start_date < earliestStart) {
          earliestStart = item.tracking_start_date;
        }
      }
      if (item.tracking_end_date) {
        if (!latestEnd || item.tracking_end_date > latestEnd) {
          latestEnd = item.tracking_end_date;
        }
      }
    });

    return {
      ...rule,
      tracking_start_date: earliestStart || rule.tracking_start_date,
      tracking_end_date: latestEnd || rule.tracking_end_date
    };
  };

  const findClosestAccount = (suggestedAccount: string, availableAccounts: string[]): string => {
    if (!suggestedAccount || availableAccounts.length === 0) return '';
    
    // Exact match
    const exactMatch = availableAccounts.find(account => 
      account.toLowerCase() === suggestedAccount.toLowerCase()
    );
    if (exactMatch) return exactMatch;
    
    // Partial match
    const partialMatch = availableAccounts.find(account =>
      account.toLowerCase().includes(suggestedAccount.toLowerCase()) ||
      suggestedAccount.toLowerCase().includes(account.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // If no match, return the first account or empty string
    return availableAccounts[0] || '';
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

  const renderTriggerBlock = (trigger: TriggerBlock) => (
    <div key={trigger.id} className="automation-block bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 hover:from-blue-150 hover:to-blue-250 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">⚡</span>
        </div>
        <span className="font-bold text-blue-900 text-lg">Trigger</span>
        {currentRule && currentRule.triggers && currentRule.triggers.length > 1 && (
          <button
            onClick={() => deleteTrigger(trigger.id)}
            className="ml-auto w-6 h-6 bg-red-500 bg-opacity-70 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all text-white text-xs"
            title="Delete trigger"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="space-y-3 text-blue-800">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Type:</span>
          <EditableField
            value={trigger.type}
            onSave={(value) => updateTrigger(trigger.id, 'type', value)}
            type="select"
            options={['scheduled', 'new_transaction', 'income_received', 'balance_threshold']}
            placeholder="Select trigger type"
          />
        </div>
        
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Account:</span>
          <EditableField
            value={trigger.account}
            onSave={(value) => updateTrigger(trigger.id, 'account', value)}
            type="select"
            options={userAccounts}
            placeholder={loadingAccounts ? "Loading accounts..." : "Select account"}
          />
        </div>

        {trigger.type === 'scheduled' && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Frequency:</span>
              <EditableField
                value={trigger.schedule?.frequency}
                onSave={(value) => updateTrigger(trigger.id, 'schedule', { ...trigger.schedule, frequency: value })}
                type="select"
                options={['daily', 'weekly', 'monthly', 'once']}
                placeholder="Select frequency"
              />
            </div>
            
            {trigger.schedule?.frequency === 'weekly' && (
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Day:</span>
                <EditableField
                  value={trigger.schedule?.dayOfWeek}
                  onSave={(value) => updateTrigger(trigger.id, 'schedule', { ...trigger.schedule, dayOfWeek: value })}
                  type="select"
                  options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Any']}
                  placeholder="Select day"
                />
              </div>
            )}

            {trigger.schedule?.frequency === 'monthly' && (
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Day of Month:</span>
                <EditableField
                  value={trigger.schedule?.dayOfMonth}
                  onSave={(value) => updateTrigger(trigger.id, 'schedule', { ...trigger.schedule, dayOfMonth: parseInt(value) })}
                  type="number"
                  placeholder="1-31"
                />
              </div>
            )}

            {trigger.schedule?.frequency === 'once' && (
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Date:</span>
                <EditableField
                  value={trigger.schedule?.date}
                  onSave={(value) => updateTrigger(trigger.id, 'schedule', { ...trigger.schedule, date: value })}
                  type="text"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            )}

            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Time:</span>
              <EditableField
                value={trigger.schedule?.time}
                onSave={(value) => updateTrigger(trigger.id, 'schedule', { ...trigger.schedule, time: value })}
                placeholder="HH:MM"
              />
            </div>
          </>
        )}

        {trigger.type === 'balance_threshold' && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Operator:</span>
              <EditableField
                value={trigger.threshold?.operator}
                onSave={(value) => updateTrigger(trigger.id, 'threshold', { ...trigger.threshold, operator: value })}
                type="select"
                options={['greater_than', 'less_than', 'equals']}
                placeholder="Select operator"
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Amount $:</span>
              <EditableField
                value={trigger.threshold?.amount}
                onSave={(value) => updateTrigger(trigger.id, 'threshold', { ...trigger.threshold, amount: parseFloat(value) })}
                type="number"
                placeholder="Enter amount"
              />
            </div>
          </>
        )}


      </div>
    </div>
  );

  const renderCriteriaBlock = (criteria: CriteriaBlock) => (
    <div key={criteria.id} className="automation-block bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-300 hover:from-yellow-150 hover:to-yellow-250 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">🔍</span>
        </div>
        <span className="font-bold text-yellow-900 text-lg">Criteria</span>
        <button
          onClick={() => deleteCriteria(criteria.id)}
          className="ml-auto w-6 h-6 bg-red-500 bg-opacity-70 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all text-white text-xs"
          title="Delete criteria"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-yellow-800">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Type:</span>
          <EditableField
            value={criteria.conditionType}
            onSave={(value) => updateCriteria(criteria.id, 'conditionType', value)}
            type="select"
            options={['spending_threshold', 'balance_check', 'merchant_filter', 'category_filter', 'amount_range']}
            placeholder="Select condition type"
          />
        </div>

        {criteria.conditionType === 'merchant_filter' && (
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Merchant:</span>
            <EditableField
              value={criteria.merchant}
              onSave={(value) => updateCriteria(criteria.id, 'merchant', value)}
              placeholder="Enter merchant name"
            />
          </div>
        )}
        
        {criteria.conditionType === 'category_filter' && (
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Category:</span>
            <EditableField
              value={criteria.category}
              onSave={(value) => updateCriteria(criteria.id, 'category', value)}
              placeholder="Enter category"
            />
          </div>
        )}
        
        {(criteria.conditionType === 'spending_threshold' || criteria.conditionType === 'balance_check' || criteria.conditionType === 'amount_range') && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Operator:</span>
              <EditableField
                value={criteria.operator}
                onSave={(value) => updateCriteria(criteria.id, 'operator', value)}
                type="select"
                options={['greater_than', 'less_than', 'equals']}
                placeholder="Select operator"
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Amount $:</span>
              <EditableField
                value={criteria.amount}
                onSave={(value) => updateCriteria(criteria.id, 'amount', value)}
                type="number"
                placeholder="Enter amount"
              />
            </div>
          </>
        )}

        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Account:</span>
          <EditableField
            value={criteria.account}
            onSave={(value) => updateCriteria(criteria.id, 'account', value)}
            type="select"
            options={['Any account', ...userAccounts]}
            placeholder={loadingAccounts ? "Loading accounts..." : "Select account"}
          />
        </div>


      </div>
    </div>
  );

  const renderActionBlock = (action: ActionBlock) => (
    <div key={action.id} className="automation-block bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 hover:from-green-150 hover:to-green-250 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">🎯</span>
        </div>
        <span className="font-bold text-green-900 text-lg">Action</span>
        {currentRule && currentRule.actions && currentRule.actions.length > 1 && (
          <button
            onClick={() => deleteAction(action.id)}
            className="ml-auto w-6 h-6 bg-red-500 bg-opacity-70 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all text-white text-xs"
            title="Delete action"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="space-y-3 text-green-800">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Do:</span>
          <EditableField
            value={action.type}
            onSave={(value) => updateAction(action.id, 'type', value)}
            type="select"
            options={['transfer', 'notify']}
            placeholder="Select action"
          />
        </div>
        
        {action.type === 'transfer' && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">From:</span>
              <EditableField
                value={action.fromAccount}
                onSave={(value) => updateAction(action.id, 'fromAccount', value)}
                type="select"
                options={userAccounts}
                placeholder={loadingAccounts ? "Loading accounts..." : "Select source account"}
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">To:</span>
              <EditableField
                value={action.toAccount}
                onSave={(value) => updateAction(action.id, 'toAccount', value)}
                type="select"
                options={userAccounts}
                placeholder={loadingAccounts ? "Loading accounts..." : "Select destination account"}
              />
            </div>
            
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Amount Type:</span>
              <button
                onClick={() => {
                  // Switch to fixed amount mode - remove percentage field
                  updateAction(action.id, 'percentage', undefined);
                  updateAction(action.id, 'amount', action.amount || 0);
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  action.amount !== undefined 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                $ Fixed
              </button>
              <button
                onClick={() => {
                  // Switch to percentage mode - remove amount field
                  updateAction(action.id, 'amount', undefined);
                  updateAction(action.id, 'percentage', action.percentage || 0);
                }}
                className={`ml-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                  action.percentage !== undefined 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                % Percent
              </button>
            </div>
            
            {action.amount !== undefined && (
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Amount $:</span>
                <EditableField
                  value={action.amount}
                  onSave={(value) => updateAction(action.id, 'amount', value)}
                  type="number"
                  placeholder="Enter amount"
                />
              </div>
            )}
            
            {action.percentage !== undefined && (
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Percentage %:</span>
                <EditableField
                  value={action.percentage}
                  onSave={(value) => updateAction(action.id, 'percentage', value)}
                  type="number"
                  placeholder="Enter percentage"
                />
              </div>
            )}
          </>
        )}
        
        {action.type === 'notify' && (
          <>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Type:</span>
              <EditableField
                value={action.notificationType}
                onSave={(value) => updateAction(action.id, 'notificationType', value)}
                type="select"
                options={['email', 'sms', 'push', 'in_app']}
                placeholder="Select notification type"
              />
            </div>
          </>
        )}


        
        {action.type === 'notify' && (
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">Message:</span>
            <EditableField
              value={action.message}
              onSave={(value) => updateAction(action.id, 'message', value)}
              placeholder="Notification message"
            />
          </div>
        )}
      </div>
    </div>
  );

  const handleSaveAutomation = async () => {
    if (!currentRule) return;
    const workflowSchema = convertRuleToWorkflow(currentRule);
    const nameToSave = automationName.trim() || `Automation ${new Date().toISOString()}`;

    try {
      let response;
      let successMessage;

      if (editingAutomationId) {
        // Update existing automation
        response = await fetch('/api/update-workflow', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAutomationId,
            name: nameToSave,
            start_date: currentRule?.tracking_start_date || null,
            end_date: currentRule?.tracking_end_date || null,
            workflow: currentRule, // Save as rule format instead of workflow
            is_active: true
          })
        });
        successMessage = 'Automation updated successfully!';
      } else {
        // Create new automation
        response = await fetch('/api/save-workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameToSave,
            start_date: currentRule?.tracking_start_date || null,
            end_date: currentRule?.tracking_end_date || null,
            workflow: currentRule, // Save as rule format instead of workflow
            is_active: true
          })
        });
        successMessage = 'Automation saved successfully!';
      }

      const data = await response.json();
      if (response.ok) {
        let message = successMessage;
        
        // Check if immediate trigger execution was performed
        if (data.immediateCheck?.executed) {
          const immediateCheck = data.immediateCheck;
          
          // Handle legacy format (for old balance threshold only responses)
          if (immediateCheck.results) {
            const { automationsFound, accountsFound, triggersExecuted, notificationsSent } = immediateCheck.results;
            message += `\n\n🎯 Balance Threshold Check Executed:
• Found ${automationsFound} automation(s)
• Checked ${accountsFound} account(s)
• Executed ${triggersExecuted} trigger(s)
• Sent ${notificationsSent} notification(s)`;
            
            if (notificationsSent > 0) {
              message += '\n\n📱 SMS notifications have been sent to your phone!';
            }
          }
          // Handle new combined format
          else {
            message += `\n\n🚀 Immediate Trigger Execution Results:`;
            
            // Balance threshold results
            if (immediateCheck.balanceThreshold) {
              const bt = immediateCheck.balanceThreshold;
              message += `\n\n⚖️ Balance Threshold Check:
• Found ${bt.automationsFound} automation(s)
• Checked ${bt.accountsFound} account(s)
• Executed ${bt.triggersExecuted} trigger(s)
• Sent ${bt.notificationsSent} notification(s)`;
            }
            
            // New transaction results
            if (immediateCheck.newTransaction) {
              const nt = immediateCheck.newTransaction;
              message += `\n\n🆕 New Transaction Check:
• Found ${nt.automationsFound} automation(s)
• Checked ${nt.accountsFound} account(s)
• Executed ${nt.triggersExecuted} trigger(s)
• Sent ${nt.notificationsSent} notification(s)`;
            }
            
            // Summary
            if (immediateCheck.totalExecutions > 0) {
              message += `\n\n📊 Total Summary:
• ${immediateCheck.totalExecutions} trigger(s) executed
• ${immediateCheck.totalNotifications} notification(s) sent`;
              
              if (immediateCheck.totalNotifications > 0) {
                message += '\n\n📱 SMS notifications have been sent to your phone!';
              }
            } else {
              message += '\n\n💡 No triggers were executed (conditions not met or no recent data)';
            }
          }
        } else if (data.immediateCheck?.executed === false) {
          message += '\n\n⚠️ Immediate trigger execution failed but automation was saved successfully.';
          if (data.immediateCheck?.error) {
            message += `\nError: ${data.immediateCheck.error}`;
          }
        }
        
        alert(message);
        // Navigate back to automations list
        router.push('/automations');
      } else {
        alert(`Failed to save automation: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error saving automation: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* AI Assistant Chat */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 slide-up">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#1c458720' }}>
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Automation Agent</h3>
                    <p className="text-sm text-gray-600">Intelligent automation builder and optimizer</p>
                  </div>
                </div>

              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${message.type === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-3 text-sm`} style={message.type === 'user' ? { backgroundColor: '#1c4587' } : {}}>
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 smooth-transition text-sm"
                  style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !inputText.trim()}
                  className="text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed smooth-transition text-sm"
                  style={{ backgroundColor: '#1c4587' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

        {/* Main Automation Workflow */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">


            {/* Global Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: '#1c4587' }}>
                    <span className="text-white text-lg">⚙️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Automation Settings</h3>
                    <p className="text-sm text-gray-600">Configure your automation parameters</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Automation Name */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Automation Name</label>
                    <input
                      type="text"
                      value={automationName}
                      onChange={(e) => setAutomationName(e.target.value)}
                      placeholder="Enter automation name"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{ '--tw-ring-color': '#1c4587', minWidth: '200px' } as React.CSSProperties & { [key: string]: string }}
                    />
                  </div>

                  {/* Start Date */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={currentRule?.tracking_start_date || ''}
                      onChange={(e) => updateGlobalField('tracking_start_date', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                    />
                  </div>

                  {/* End Date */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={currentRule?.tracking_end_date || ''}
                      onChange={(e) => updateGlobalField('tracking_end_date', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                      style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={handleSaveAutomation}
                      disabled={loading}
                      className="px-6 py-2 text-white font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105"
                      style={{ backgroundColor: '#1c4587' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#153a73')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1c4587')}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        editingAutomationId ? 'Update Automation' : 'Save Automation'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Block Buttons */}
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={addTrigger}
                className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 px-5 py-3 rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <span className="text-lg">⚡</span>
                <span>Add Trigger</span>
              </button>
              <button
                onClick={addCriteria}
                className="flex items-center space-x-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 px-5 py-3 rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <span className="text-lg">🔍</span>
                <span>Add Criteria</span>
              </button>
              <button
                onClick={addAction}
                className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 hover:border-green-300 px-5 py-3 rounded-md transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <span className="text-lg">🎯</span>
                <span>Add Action</span>
              </button>
            </div>

            {/* Automation Blocks in Columns */}
            <div className="flex items-start justify-center space-x-4 mb-8 overflow-x-auto">
              {/* Triggers Column */}
              <div className="flex-1 max-w-sm">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-blue-900 mb-2">Triggers</h2>
                  <p className="text-sm text-blue-600">When should this automation run?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  {currentRule?.triggers?.map(trigger => renderTriggerBlock(trigger))}
                  {(!currentRule?.triggers || currentRule.triggers.length === 0) && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg w-full max-w-xs">
                      <span className="text-4xl mb-2 block">⚡</span>
                      <p>No triggers yet</p>
                      <p className="text-sm">Click "Add Trigger" above</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="flex items-center justify-center pt-16">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-400 to-yellow-400 rounded mb-1"></div>
                  <div className="text-gray-400 text-2xl">→</div>
                  <div className="w-12 h-1 bg-gradient-to-r from-blue-400 to-yellow-400 rounded mt-1"></div>
                </div>
              </div>

              {/* Criteria Column */}
              <div className="flex-1 max-w-sm">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-yellow-900 mb-2">Criteria</h2>
                  <p className="text-sm text-yellow-600">What conditions should be met?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  {currentRule?.criteria?.map(criteria => renderCriteriaBlock(criteria))}
                  {(!currentRule?.criteria || currentRule.criteria.length === 0) && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg w-full max-w-xs">
                      <span className="text-4xl mb-2 block">🔍</span>
                      <p>No criteria yet</p>
                      <p className="text-sm">Click "Add Criteria" above</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="flex items-center justify-center pt-16">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded mb-1"></div>
                  <div className="text-gray-400 text-2xl">→</div>
                  <div className="w-12 h-1 bg-gradient-to-r from-yellow-400 to-green-400 rounded mt-1"></div>
                </div>
              </div>

              {/* Actions Column */}
              <div className="flex-1 max-w-sm">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-green-900 mb-2">Actions</h2>
                  <p className="text-sm text-green-600">What should happen?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  {currentRule?.actions?.map(action => renderActionBlock(action))}
                  {(!currentRule?.actions || currentRule.actions.length === 0) && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg w-full max-w-xs">
                      <span className="text-4xl mb-2 block">🎯</span>
                      <p>No actions yet</p>
                      <p className="text-sm">Click "Add Action" above</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rule Preview */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Preview</h3>
              <CodeBlock
                language="json"
                code={JSON.stringify(currentRule, null, 2)}
              />
            </div>
          </div>
      </div>
    </DashboardLayout>
  );
} 