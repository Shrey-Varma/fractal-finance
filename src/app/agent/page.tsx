'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Transaction {
  transaction_id: string;
  account_name: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category: string[];
}

interface Account {
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype: string;
  balances: {
    available?: number;
    current?: number;
  };
}

interface UserData {
  accounts: Account[];
  transactions: Transaction[];
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserData();
    // Add welcome message
    setMessages([{
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your financial assistant. I can help you analyze your transaction history, spending patterns, account balances, and provide personalized financial insights. What would you like to know about your finances?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUserData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch('/api/get-user-data');
      const data = await response.json();
      
      if (response.ok) {
        setUserData({
          accounts: data.accounts || [],
          transactions: data.transactions || []
        });
      } else {
        console.error('Failed to fetch user data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const generateFinancialContext = () => {
    if (!userData) return '';

    const totalBalance = userData.accounts.reduce((sum, account) => 
      sum + (account.balances.available || account.balances.current || 0), 0
    );

    const recentTransactions = userData.transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);

    const spendingByCategory = userData.transactions
      .filter(t => t.amount > 0)
      .reduce((acc, t) => {
        const category = t.category?.[0] || 'Other';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const monthlySpending = userData.transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return t.amount > 0 && transactionDate >= oneMonthAgo;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return `User's Financial Data Context:

ACCOUNT SUMMARY:
- Total accounts: ${userData.accounts.length}
- Total available balance: $${totalBalance.toFixed(2)}
- Account details: ${userData.accounts.map(acc => 
  `${acc.name || acc.official_name} (${acc.type}): $${(acc.balances.available || acc.balances.current || 0).toFixed(2)}`
).join(', ')}

TRANSACTION SUMMARY:
- Total transactions: ${userData.transactions.length}
- Recent transactions (last 50): ${recentTransactions.length}
- Monthly spending (last 30 days): $${monthlySpending.toFixed(2)}

SPENDING BY CATEGORY:
${Object.entries(spendingByCategory)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`)
  .join('\n')}

RECENT TRANSACTIONS (last 10):
${recentTransactions.slice(0, 10).map(t => 
  `- ${t.date}: ${t.name} - $${t.amount.toFixed(2)} (${t.category?.[0] || 'Other'})`
).join('\n')}`;
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || loading) return;

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
      const contextData = generateFinancialContext();
      
      const response = await fetch('/api/parse_rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: messageText,
          context: 'financial_assistant',
          systemPrompt: `You are a knowledgeable financial assistant with access to the user's complete financial data. Your role is to:

1. ANALYZE financial data and provide insights about spending patterns, account balances, and transaction history
2. ANSWER questions about specific transactions, categories, merchants, or time periods
3. PROVIDE personalized financial advice based on the user's actual data
4. IDENTIFY trends, unusual spending, or opportunities for savings
5. HELP with budgeting and financial planning using real transaction data
6. EXPLAIN financial concepts in simple, actionable terms

Guidelines:
- Always base your responses on the actual financial data provided
- Be specific with numbers, dates, and categories when relevant
- Provide actionable insights and recommendations
- Be conversational but professional
- If asked about data you don't have access to, explain what information you can see
- Focus on being helpful and educational about personal finance

User's Financial Context:
${contextData}

Respond as a helpful financial assistant who has analyzed this data and can provide specific, actionable insights.`
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What's my spending breakdown by category this month?",
    "Show me my largest transactions recently",
    "How much did I spend on dining out?",
    "What's my current account balance?",
    "Are there any unusual transactions I should know about?",
    "How does my spending compare to last month?"
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: '#1c458720' }}>
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Assistant</h1>
              <p className="text-gray-600">AI-powered insights for your financial data</p>
            </div>
          </div>
          {loadingData && (
            <div className="text-sm text-gray-500">Loading financial data...</div>
          )}
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${
                  message.type === 'user' 
                    ? 'text-white rounded-lg rounded-br-sm' 
                    : 'bg-gray-50 text-gray-900 rounded-lg rounded-bl-sm'
                } p-4 shadow-sm`} 
                style={message.type === 'user' ? { backgroundColor: '#1c4587' } : {}}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-lg rounded-bl-sm p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && !loading && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Try asking me:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    style={{ color: '#1c4587' }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me about your finances..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-base"
                style={{ '--tw-ring-color': '#1c4587' } as React.CSSProperties & { [key: string]: string }}
                disabled={loading || loadingData}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim() || loadingData}
                className="text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                style={{ backgroundColor: '#1c4587' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#153a73')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#1c4587')}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 