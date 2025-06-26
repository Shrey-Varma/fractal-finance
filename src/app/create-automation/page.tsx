'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { CodeBlock } from '@/components/ui/code-block';
import { Button } from '@/components/ui/stateful-button';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [userAccounts, setUserAccounts] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testDescription, setTestDescription] = useState('');
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [saveSuccessData, setSaveSuccessData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageProcessedRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [automationName, setAutomationName] = useState('');
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [availableGoals, setAvailableGoals] = useState<string[]>([]);
  const [showNewGoalInput, setShowNewGoalInput] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');

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

  const fetchAvailableGoals = async () => {
    try {
      const response = await fetch('/api/get-goals');
      const data = await response.json();
      
      if (response.ok && data.goals) {
        setAvailableGoals(data.goals);
      } else {
        console.error('Failed to fetch goals:', data.error);
        setAvailableGoals([]);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      setAvailableGoals([]);
    }
  };

  useEffect(() => {
    fetchUserAccounts();
    fetchAvailableGoals();
    
    const initialMessage = searchParams.get('initial');
    const editData = searchParams.get('edit');
    
    if (editData && !initialMessageProcessedRef.current) {
      // Load existing automation for editing
      try {
        const automationData = JSON.parse(decodeURIComponent(editData));
        setEditingAutomationId(automationData.id);
        setAutomationName(automationData.name || '');
        setSelectedGoal(automationData.goal || '');
        
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
    console.log('Adding trigger');
    if (!currentRule) return;
    const newTrigger: TriggerBlock = {
      id: Date.now().toString(),
      type: 'new_transaction',
      account: ''
    };
    console.log('New trigger ID:', newTrigger.id);
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
    console.log('Adding action');
    if (!currentRule) return;
    const newAction: ActionBlock = {
      id: Date.now().toString(),
      type: 'transfer',
      amount: 0 // Initialize with fixed amount by default
    };
    console.log('New action ID:', newAction.id);
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

  const toggleBlockExpansion = (blockId: string) => {
    console.log('Toggling block expansion for:', blockId);
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        console.log('Collapsing block:', blockId);
        newSet.delete(blockId);
      } else {
        console.log('Expanding block:', blockId);
        newSet.add(blockId);
      }
      console.log('New expanded blocks:', Array.from(newSet));
      return newSet;
    });
  };

  const getBlockSummary = (block: any, type: 'trigger' | 'criteria' | 'action'): string => {
    if (type === 'trigger') {
      const typeMap: { [key: string]: string } = {
        'new_transaction': 'New Transaction',
        'scheduled': 'Scheduled',
        'income_received': 'Income Received',
        'balance_threshold': 'Balance Threshold'
      };
      return typeMap[block.type] || 'Trigger';
    } else if (type === 'criteria') {
      const typeMap: { [key: string]: string } = {
        'spending_threshold': 'Spending Check',
        'balance_check': 'Balance Check',
        'merchant_filter': 'Merchant Filter',
        'category_filter': 'Category Filter',
        'amount_range': 'Amount Range'
      };
      return typeMap[block.conditionType] || 'Condition';
    } else if (type === 'action') {
      const typeMap: { [key: string]: string } = {
        'transfer': 'Money Transfer',
        'notify': 'Send Notification'
      };
      return typeMap[block.type] || 'Action';
    }
    return '';
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
            className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent min-w-24"
            style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
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
          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent min-w-0"
          style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
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

  function renderTriggerBlock(trigger: TriggerBlock) {
    const isExpanded = expandedBlocks.has(trigger.id);
    const summary = getBlockSummary(trigger, 'trigger');
    
    return (
      <motion.div 
        key={trigger.id} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:border-gray-300 transition-all duration-200"
        onClick={() => toggleBlockExpansion(trigger.id)}
        style={{ backgroundColor: '#1c4587', color: 'white' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-3">⚡</span>
            <div>
              <div className="font-medium">{summary}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Deleting trigger:', trigger.id);
                deleteTrigger(trigger.id);
              }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 text-white hover:bg-white hover:bg-opacity-20"
              title="Remove trigger"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </motion.button>
            <span className="text-sm opacity-75">
              {isExpanded ? '−' : '+'}
            </span>
          </div>
      </div>
      
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-white border-opacity-20 space-y-3 text-white overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Type:</span>
              <EditableField
                value={trigger.type}
                onSave={(value) => updateTrigger(trigger.id, 'type', value)}
                type="select"
                options={['scheduled', 'new_transaction', 'income_received', 'balance_threshold', 'now']}
                placeholder="Select trigger type"
              />
            </div>

            {/* Only show other fields if not 'now' trigger */}
            {trigger.type !== 'now' && (
              <>
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
              </>
            )}

            {trigger.type === 'now' && (
              <div className="text-yellow-300 text-xs mt-2">
                <span>⚡ This is a test-only trigger. When you save, it will immediately check all conditions and perform the action if conditions are met.</span>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  const renderCriteriaBlock = (criteria: CriteriaBlock) => {
    const isExpanded = expandedBlocks.has(criteria.id);
    const summary = getBlockSummary(criteria, 'criteria');
    
    return (
      <motion.div 
        key={criteria.id} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:border-gray-300 transition-all duration-200"
        onClick={() => toggleBlockExpansion(criteria.id)}
        style={{ backgroundColor: '#1c4587', color: 'white' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-3">🔍</span>
            <div>
              <div className="font-medium">{summary}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Deleting criteria:', criteria.id);
                deleteCriteria(criteria.id);
              }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 text-white hover:bg-white hover:bg-opacity-20"
              title="Remove criteria"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </motion.button>
            <span className="text-sm opacity-75">
              {isExpanded ? '−' : '+'}
            </span>
          </div>
      </div>
      
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-white border-opacity-20 space-y-3 text-white overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderActionBlock = (action: ActionBlock) => {
    const isExpanded = expandedBlocks.has(action.id);
    const summary = getBlockSummary(action, 'action');
    
    return (
      <motion.div 
        key={action.id} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-4 cursor-pointer hover:border-gray-300 transition-all duration-200"
        onClick={() => toggleBlockExpansion(action.id)}
        style={{ backgroundColor: '#1c4587', color: 'white' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-3">🎯</span>
            <div>
              <div className="font-medium">{summary}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Deleting action:', action.id);
                deleteAction(action.id);
              }}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 text-white hover:bg-white hover:bg-opacity-20"
              title="Remove action"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </motion.button>
            <span className="text-sm opacity-75">
              {isExpanded ? '−' : '+'}
            </span>
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-white border-opacity-20 space-y-3 text-white overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
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
                          ? 'bg-white bg-opacity-20 text-white' 
                          : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
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
                          ? 'bg-white bg-opacity-20 text-white' 
                          : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
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
                  
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">Message:</span>
                    <EditableField
                      value={action.message}
                      onSave={(value) => updateAction(action.id, 'message', value)}
                      placeholder="Notification message"
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Systematic rule-based workflow description generator
  const generateWorkflowDescription = (rule: AutomationRule): string => {
    if (!rule) return 'No automation rule defined.';

    let description = '';
    
    // Process Triggers
    if (rule.triggers && rule.triggers.length > 0) {
      description += 'WHEN:\n';
      rule.triggers.forEach((trigger, index) => {
        if (index > 0) description += ' OR ';
        
        switch (trigger.type) {
          case 'new_transaction':
            description += `A new transaction occurs${trigger.account ? ` in ${trigger.account}` : ' in any account'}`;
            break;
          case 'scheduled':
            if (trigger.schedule) {
              const freq = trigger.schedule.frequency;
              switch (freq) {
                case 'daily':
                  description += `Every day${trigger.schedule.time ? ` at ${trigger.schedule.time}` : ''}`;
                  break;
                case 'weekly':
                  description += `Every week${trigger.schedule.dayOfWeek ? ` on ${trigger.schedule.dayOfWeek}` : ''}${trigger.schedule.time ? ` at ${trigger.schedule.time}` : ''}`;
                  break;
                case 'monthly':
                  description += `Every month${trigger.schedule.dayOfMonth ? ` on day ${trigger.schedule.dayOfMonth}` : ''}${trigger.schedule.time ? ` at ${trigger.schedule.time}` : ''}`;
                  break;
                case 'once':
                  description += `Once${trigger.schedule.date ? ` on ${trigger.schedule.date}` : ''}${trigger.schedule.time ? ` at ${trigger.schedule.time}` : ''}`;
                  break;
                default:
                  description += `On a ${freq} schedule`;
              }
            } else {
              description += 'On a scheduled basis';
            }
            break;
          case 'income_received':
            description += `Income is received${trigger.account ? ` in ${trigger.account}` : ' in any account'}`;
            break;
          case 'balance_threshold':
            if (trigger.threshold) {
              const operator = trigger.threshold.operator === 'greater_than' ? 'exceeds' : 
                             trigger.threshold.operator === 'less_than' ? 'falls below' : 'equals';
              description += `Account balance ${operator} $${trigger.threshold.amount || 0}${trigger.account ? ` in ${trigger.account}` : ''}`;
            } else {
              description += 'Balance threshold is met';
            }
            break;
          default:
            description += `Trigger of type "${trigger.type}" occurs`;
        }
        
        if (index < rule.triggers.length - 1) description += '\n';
      });
      description += '\n\n';
    }

    // Process Criteria
    if (rule.criteria && rule.criteria.length > 0) {
      description += 'IF:\n';
      rule.criteria.forEach((criteria, index) => {
        if (index > 0) description += ' AND ';
        
        switch (criteria.conditionType) {
          case 'amount_range':
            const operator = criteria.operator === 'greater_than' ? 'is greater than' :
                           criteria.operator === 'less_than' ? 'is less than' :
                           criteria.operator === 'equals' ? 'equals' : 'meets condition for';
            description += `Transaction amount ${operator} $${criteria.amount || 0}`;
            break;
          case 'merchant_match':
            description += `Transaction is from merchant "${criteria.merchant || 'unspecified'}"`;
            break;
          case 'category_match':
            description += `Transaction category is "${criteria.category || 'unspecified'}"`;
            break;
          case 'account_match':
            description += `Transaction is from account "${criteria.account || 'unspecified'}"`;
            break;
          case 'time_window':
            if (criteria.timeWindow) {
              description += `Transaction occurs between ${criteria.timeWindow.start || 'start'} and ${criteria.timeWindow.end || 'end'}`;
            } else {
              description += 'Transaction occurs within specified time window';
            }
            break;
          default:
            description += `Condition "${criteria.conditionType}" is met`;
        }
        
        if (index < rule.criteria.length - 1) description += '\n';
      });
      description += '\n\n';
    }

    // Process Actions
    if (rule.actions && rule.actions.length > 0) {
      description += 'THEN:\n';
      rule.actions.forEach((action, index) => {
        if (index > 0) description += ' AND ';
        
        switch (action.type) {
          case 'transfer':
            description += `Transfer $${action.amount || 0}${action.fromAccount ? ` from ${action.fromAccount}` : ''}${action.toAccount ? ` to ${action.toAccount}` : ''}`;
            break;
          case 'percentage_transfer':
            description += `Transfer ${action.percentage || 0}% of transaction amount${action.fromAccount ? ` from ${action.fromAccount}` : ''}${action.toAccount ? ` to ${action.toAccount}` : ''}`;
            break;
          case 'notification':
            const notifType = action.notificationType === 'sms' ? 'SMS' :
                            action.notificationType === 'email' ? 'Email' :
                            action.notificationType === 'push' ? 'Push notification' : 'Notification';
            description += `Send ${notifType}${action.message ? `: "${action.message}"` : ''}`;
            break;
          case 'categorize':
            description += `Categorize transaction as "${(action as any).category || 'unspecified'}"`;
            break;
          case 'tag':
            description += `Add tag "${(action as any).tag || 'unspecified'}" to transaction`;
            break;
          default:
            description += `Execute action of type "${action.type}"`;
        }
        
        if (index < rule.actions.length - 1) description += '\n';
      });
      description += '\n\n';
    }

    // Add global settings if present
    if (rule.tracking_start_date || rule.tracking_end_date) {
      description += 'ACTIVE PERIOD:\n';
      if (rule.tracking_start_date && rule.tracking_end_date) {
        description += `From ${rule.tracking_start_date} to ${rule.tracking_end_date}`;
      } else if (rule.tracking_start_date) {
        description += `Starting from ${rule.tracking_start_date}`;
      } else if (rule.tracking_end_date) {
        description += `Until ${rule.tracking_end_date}`;
      }
    }

    return description.trim();
  };

  const handleTestWorkflow = () => {
    if (!currentRule) {
      alert('No automation rule to test. Please create your automation first.');
      return;
    }

    const description = generateWorkflowDescription(currentRule);
    setTestDescription(description);
    setShowTestModal(true);
  };

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
            goal: selectedGoal || null,
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
            goal: selectedGoal || null,
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
        // Prepare data for the success modal
        const modalData = {
          isUpdate: !!editingAutomationId,
          automationName: nameToSave,
          goal: selectedGoal,
          immediateCheck: data.immediateCheck
        };
        
        setSaveSuccessData(modalData);
        setShowSaveSuccessModal(true);
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
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
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
          <div className="bg-white rounded-xl border border-gray-200 p-8">


            {/* Global Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
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

                  {/* Goal Assignment */}
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-gray-500 mb-1">Goal</label>
                    <div className="flex items-center space-x-2">
                      {!showNewGoalInput ? (
                        <>
                          <select
                            value={selectedGoal}
                            onChange={(e) => setSelectedGoal(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 flex-1"
                            style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                          >
                            <option value="">No Goal</option>
                            {availableGoals.map(goal => (
                              <option key={goal} value={goal}>{goal}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowNewGoalInput(true)}
                            className="px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                            title="Create new goal"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={newGoalName}
                            onChange={(e) => setNewGoalName(e.target.value)}
                            placeholder="Enter new goal name"
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 flex-1"
                            style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newGoalName.trim()) {
                                const trimmedGoal = newGoalName.trim();
                                if (!availableGoals.includes(trimmedGoal)) {
                                  setAvailableGoals([...availableGoals, trimmedGoal]);
                                }
                                setSelectedGoal(trimmedGoal);
                                setNewGoalName('');
                                setShowNewGoalInput(false);
                              } else if (e.key === 'Escape') {
                                setNewGoalName('');
                                setShowNewGoalInput(false);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newGoalName.trim()) {
                                const trimmedGoal = newGoalName.trim();
                                if (!availableGoals.includes(trimmedGoal)) {
                                  setAvailableGoals([...availableGoals, trimmedGoal]);
                                }
                                setSelectedGoal(trimmedGoal);
                                setNewGoalName('');
                                setShowNewGoalInput(false);
                              }
                            }}
                            className="px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                            disabled={!newGoalName.trim()}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewGoalName('');
                              setShowNewGoalInput(false);
                            }}
                            className="px-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                          >
                            ✗
                          </button>
                        </>
                      )}
                    </div>
            </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col justify-end space-y-2">
              <button
                      onClick={handleTestWorkflow}
                      disabled={!currentRule || loading}
                      className="px-4 py-2 text-white font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 text-sm"
                      style={{ backgroundColor: '#1c4587' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#153a73')}
                      onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1c4587')}
                    >
                      🧪 Test Workflow
              </button>
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



            {/* Automation Blocks in Columns */}
            <div className="flex items-start justify-center space-x-8 mb-8 overflow-x-auto">
              {/* Triggers Column */}
              <motion.div 
                className="flex-1 max-w-sm"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-xl font-bold" style={{ color: '#1c4587' }}>Triggers</h2>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        addTrigger();
                      }}
                      className="ml-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 hover:bg-opacity-10"
                      style={{ 
                        borderColor: '#1c4587', 
                        color: '#1c4587',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c458710'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Add Trigger"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      +
                    </motion.button>
                  </div>
                  <p className="text-sm text-gray-600">When should this automation run?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <AnimatePresence mode="popLayout">
                    {currentRule?.triggers?.map(trigger => renderTriggerBlock(trigger))}
                  </AnimatePresence>
                  {(!currentRule?.triggers || currentRule.triggers.length === 0) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-center text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg w-full max-w-xs"
                    >
                      <motion.span 
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="text-2xl mb-2 block"
                      >
                        ⚡
                      </motion.span>
                      <p className="text-sm">No triggers yet</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Criteria Column */}
              <motion.div 
                className="flex-1 max-w-sm"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-xl font-bold" style={{ color: '#1c4587' }}>Criteria</h2>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        addCriteria();
                      }}
                      className="ml-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 hover:bg-opacity-10"
                      style={{ 
                        borderColor: '#1c4587', 
                        color: '#1c4587',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c458710'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Add Criteria"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      +
                    </motion.button>
                  </div>
                  <p className="text-sm text-gray-600">What conditions should be met?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <AnimatePresence mode="popLayout">
                    {currentRule?.criteria?.map(criteria => renderCriteriaBlock(criteria))}
                  </AnimatePresence>
                  {(!currentRule?.criteria || currentRule.criteria.length === 0) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="text-center text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg w-full max-w-xs"
                    >
                      <motion.span 
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 1
                        }}
                        className="text-2xl mb-2 block"
                      >
                        🔍
                      </motion.span>
                      <p className="text-sm">No criteria yet</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Actions Column */}
              <motion.div 
                className="flex-1 max-w-sm"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-xl font-bold" style={{ color: '#1c4587' }}>Actions</h2>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        addAction();
                      }}
                      className="ml-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 hover:bg-opacity-10"
                      style={{ 
                        borderColor: '#1c4587', 
                        color: '#1c4587',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c458710'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Add Action"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      +
                    </motion.button>
                  </div>
                  <p className="text-sm text-gray-600">What should happen?</p>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <AnimatePresence mode="popLayout">
                    {currentRule?.actions?.map(action => renderActionBlock(action))}
                  </AnimatePresence>
                  {(!currentRule?.actions || currentRule.actions.length === 0) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="text-center text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg w-full max-w-xs"
                    >
                      <motion.span 
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 1
                        }}
                        className="text-2xl mb-2 block"
                      >
                        🎯
                      </motion.span>
                      <p className="text-sm">No actions yet</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
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

      {/* Save Success Modal - Outside DashboardLayout */}
      {showSaveSuccessModal && saveSuccessData && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border-0"
          >
            {/* Success Header with Animation */}
            <div 
              className="relative px-8 py-8 text-white overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)'
              }}
            >
              {/* Animated background shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -top-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full"
                />
                <motion.div
                  animate={{ 
                    rotate: [360, 0],
                    scale: [1.2, 1, 1.2]
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute -bottom-6 -left-6 w-32 h-32 bg-white opacity-5 rounded-full"
                />
              </div>

              <div className="relative z-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 10
                  }}
                  className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <motion.span 
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-4xl"
                  >
                    ✅
                  </motion.span>
                </motion.div>
                
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-2xl font-bold mb-2"
                >
                  {saveSuccessData.isUpdate ? 'Automation Updated!' : 'Automation Created!'}
                </motion.h2>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-green-100 text-lg"
                >
                  "{saveSuccessData.automationName}" is now {saveSuccessData.isUpdate ? 'updated' : 'active'}
                </motion.p>

                {saveSuccessData.goal && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-3"
                  >
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white text-green-700 shadow-sm">
                      🎯 Goal: {saveSuccessData.goal}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Immediate Execution Results */}
            {saveSuccessData.immediateCheck?.executed && (
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="px-8 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-blue-100"
              >
                <div className="flex items-center mb-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                    style={{ backgroundColor: '#1c4587' }}
                  >
                    <span className="text-white text-sm">⚡</span>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-900">Immediate Execution Results</h3>
                </div>

                <div className="space-y-4">
                  {/* Balance Threshold Results */}
                  {saveSuccessData.immediateCheck.balanceThreshold && (
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                      className="bg-white rounded-lg p-4 border border-blue-200"
                    >
                      <div className="flex items-center mb-3">
                        <span className="text-blue-600 text-lg mr-2">⚖️</span>
                        <h4 className="font-medium text-blue-900">Balance Threshold Check</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium">Automations:</span> {saveSuccessData.immediateCheck.balanceThreshold.automationsFound}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Accounts:</span> {saveSuccessData.immediateCheck.balanceThreshold.accountsFound}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Triggers:</span> {saveSuccessData.immediateCheck.balanceThreshold.triggersExecuted}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Notifications:</span> {saveSuccessData.immediateCheck.balanceThreshold.notificationsSent}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* New Transaction Results */}
                  {saveSuccessData.immediateCheck.newTransaction && (
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9, duration: 0.4 }}
                      className="bg-white rounded-lg p-4 border border-green-200"
                    >
                      <div className="flex items-center mb-3">
                        <span className="text-green-600 text-lg mr-2">🆕</span>
                        <h4 className="font-medium text-green-900">New Transaction Check</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium">Automations:</span> {saveSuccessData.immediateCheck.newTransaction.automationsFound}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Accounts:</span> {saveSuccessData.immediateCheck.newTransaction.accountsFound}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Triggers:</span> {saveSuccessData.immediateCheck.newTransaction.triggersExecuted}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Notifications:</span> {saveSuccessData.immediateCheck.newTransaction.notificationsSent}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Summary */}
                  {saveSuccessData.immediateCheck.totalExecutions > 0 ? (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.4 }}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-4"
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-1">
                          🎉 {saveSuccessData.immediateCheck.totalExecutions} trigger(s) executed successfully!
                        </div>
                        {saveSuccessData.immediateCheck.totalNotifications > 0 && (
                          <div className="text-green-100">
                            📱 {saveSuccessData.immediateCheck.totalNotifications} SMS notification(s) sent to your phone
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.4 }}
                      className="bg-gray-100 rounded-lg p-4 text-center"
                    >
                      <div className="text-gray-600">
                        💡 No triggers were executed (conditions not met or no recent data)
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error handling for failed immediate execution */}
            {saveSuccessData.immediateCheck?.executed === false && (
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="px-8 py-6 bg-yellow-50 border-t border-yellow-200"
              >
                <div className="flex items-center">
                  <span className="text-yellow-600 text-lg mr-3">⚠️</span>
                  <div>
                    <h3 className="font-medium text-yellow-900">Automation saved with minor issue</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      Immediate trigger execution failed, but your automation was saved successfully.
                    </p>
                    {saveSuccessData.immediateCheck?.error && (
                      <p className="text-yellow-600 text-xs mt-2">
                        Error: {saveSuccessData.immediateCheck.error}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="px-8 py-6 bg-gray-50 border-t border-gray-200"
            >
              <div className="flex justify-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSaveSuccessModal(false);
                    setSaveSuccessData(null);
                    router.push('/automations');
                  }}
                  className="px-8 py-3 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#1c4587' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
                >
                  View All Automations
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSaveSuccessModal(false);
                    setSaveSuccessData(null);
                  }}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Create Another
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Test Workflow Modal - Outside DashboardLayout */}
      {showTestModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: '#1c4587' }}>
                  <span className="text-white text-lg">🧪</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Workflow Test Results</h3>
                  <p className="text-sm text-gray-600">Systematic analysis of your automation rule</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: '#1c4587' }}>
                    <span className="text-white text-sm">📝</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">Natural Language Description</h4>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                    {testDescription}
                </pre>
              </div>
            </div>

              {/* Additional Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <span className="text-blue-600 text-lg mr-2">⚡</span>
                    <h5 className="font-medium text-blue-900">Triggers</h5>
          </div>
                  <p className="text-sm text-blue-700">
                    {currentRule?.triggers?.length || 0} trigger(s) configured
                  </p>
      </div>
                
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center mb-2">
                    <span className="text-amber-600 text-lg mr-2">🔍</span>
                    <h5 className="font-medium text-amber-900">Criteria</h5>
    </div>
                  <p className="text-sm text-amber-700">
                    {currentRule?.criteria?.length || 0} criteria configured
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 text-lg mr-2">🎯</span>
                    <h5 className="font-medium text-green-900">Actions</h5>
                  </div>
                  <p className="text-sm text-green-700">
                    {currentRule?.actions?.length || 0} action(s) configured
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                ✅ Analysis complete - No LLM used, 100% rule-based conversion
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(testDescription);
                    alert('Description copied to clipboard!');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  📋 Copy Text
                </button>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-6 py-2 text-white rounded-md transition-colors font-medium"
                  style={{ backgroundColor: '#1c4587' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#153a73'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1c4587'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 