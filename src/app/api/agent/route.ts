import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

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
  balance?: {
    current_balance?: number;
    available_balance?: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, dateRange } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Initialize OpenAI with LangChain
    const model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // If user didn't specify a date range, ask the LLM to interpret what they might want
    let startDate: string | null = null
    let endDate: string | null = null

    if (dateRange) {
      startDate = dateRange.start
      endDate = dateRange.end
    } else {
      // Use LLM to interpret the date range from the user's message
      const dateInterpretationPrompt = `Based on today's date (${new Date().toISOString().split('T')[0]}), interpret what date range the user is asking about in their message. 

User message: "${message}"

Respond with a JSON object containing "start" and "end" dates in YYYY-MM-DD format, or null if no specific timeframe is mentioned. Consider common phrases like:
- "last month" = previous month
- "this month" = current month  
- "last week" = previous 7 days
- "recent" or "recently" = last 30 days
- "this year" = current year
- "last year" = previous year
- If no timeframe mentioned, return null for both dates

Example responses:
{"start": "2024-01-01", "end": "2024-01-31"}
{"start": null, "end": null}`

      try {
        const dateResponse = await model.invoke([
          new SystemMessage('You are a date interpretation assistant. Always respond with valid JSON.'),
          new HumanMessage(dateInterpretationPrompt)
        ])

        const dateResult = JSON.parse(dateResponse.content as string)
        startDate = dateResult.start
        endDate = dateResult.end
      } catch (error) {
        console.error('Error interpreting dates:', error)
        // Fall back to last 30 days if interpretation fails
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        startDate = thirtyDaysAgo.toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
      }
    }

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        *,
        plaid_connections!inner(user_id),
        balances(
          current_balance,
          available_balance,
          credit_limit,
          iso_currency_code,
          last_updated_datetime
        )
      `)
      .eq('plaid_connections.user_id', userData.user.id)

    if (accountsError) {
      throw new Error('Failed to fetch accounts')
    }

    // Format accounts
    const formattedAccounts: Account[] = (accounts || []).map(account => {
      const latestBalance = account.balances && account.balances.length > 0 
        ? account.balances.reduce((latest: any, current: any) => 
            new Date(current.last_updated_datetime) > new Date(latest.last_updated_datetime) 
            ? current 
            : latest
          )
        : null

      return {
        account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        balance: latestBalance ? {
          current_balance: latestBalance.current_balance,
          available_balance: latestBalance.available_balance
        } : undefined
      }
    })

    // Fetch transactions based on date range
    let transactionQuery = supabase
      .from('transactions')
      .select(`
        transaction_id,
        account_id,
        name,
        amount,
        date,
        category,
        merchant_name,
        accounts!inner(
          name,
          official_name,
          plaid_connections!inner(user_id)
        )
      `)
      .eq('accounts.plaid_connections.user_id', userData.user.id)
      .order('date', { ascending: false })

    // Apply date filters if specified
    if (startDate) {
      transactionQuery = transactionQuery.gte('date', startDate)
    }
    if (endDate) {
      transactionQuery = transactionQuery.lte('date', endDate)
    }

    // Limit to reasonable number for context
    transactionQuery = transactionQuery.limit(500)

    const { data: transactions, error: transactionsError } = await transactionQuery

    if (transactionsError) {
      throw new Error('Failed to fetch transactions')
    }

    // Format transactions
    const formattedTransactions: Transaction[] = (transactions || []).map((transaction: any) => ({
      transaction_id: transaction.transaction_id,
      account_name: transaction.accounts?.official_name || transaction.accounts?.name || 'Unknown Account',
      amount: transaction.amount,
      date: transaction.date,
      name: transaction.name,
      merchant_name: transaction.merchant_name,
      category: transaction.category || []
    }))

    // Generate financial context
    const totalBalance = formattedAccounts.reduce((sum, account) => 
      sum + (account.balance?.available_balance || account.balance?.current_balance || 0), 0
    )

    const spendingByCategory = formattedTransactions
      .filter(t => t.amount > 0)
      .reduce((acc, t) => {
        const category = t.category?.[0] || 'Other'
        acc[category] = (acc[category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)

    const totalSpending = formattedTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const dateRangeText = startDate && endDate 
      ? `from ${startDate} to ${endDate}` 
      : startDate 
        ? `from ${startDate}` 
        : endDate 
          ? `until ${endDate}` 
          : 'for all available data'

    const financialContext = `FINANCIAL DATA ANALYSIS ${dateRangeText.toUpperCase()}:

ACCOUNT SUMMARY:
- Total accounts: ${formattedAccounts.length}
- Total available balance: $${totalBalance.toFixed(2)}
- Account details: ${formattedAccounts.map(acc => 
  `${acc.name || acc.official_name} (${acc.type}): $${(acc.balance?.available_balance || acc.balance?.current_balance || 0).toFixed(2)}`
).join(', ')}

TRANSACTION ANALYSIS ${dateRangeText}:
- Total transactions analyzed: ${formattedTransactions.length}
- Total spending: $${totalSpending.toFixed(2)}
- Average transaction: $${formattedTransactions.length > 0 ? (totalSpending / formattedTransactions.length).toFixed(2) : '0.00'}

SPENDING BY CATEGORY ${dateRangeText}:
${Object.entries(spendingByCategory)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([category, amount]) => `- ${category}: $${amount.toFixed(2)}`)
  .join('\n')}

RECENT TRANSACTIONS:
${formattedTransactions.slice(0, 15).map(t => 
  `- ${t.date}: ${t.name} - $${t.amount.toFixed(2)} (${t.category?.[0] || 'Other'}) from ${t.account_name}`
).join('\n')}`

    // Create system prompt for the financial assistant
    const systemPrompt = `You are an expert financial advisor and analyst with access to the user's complete financial data. Your role is to provide insightful, actionable financial guidance based on their actual transaction history and account information.

CAPABILITIES:
- Analyze spending patterns and trends
- Identify unusual transactions or spending behaviors  
- Provide personalized budgeting and savings recommendations
- Answer specific questions about transactions, categories, merchants, or accounts
- Offer financial insights and optimization strategies
- Help with financial goal setting and tracking

GUIDELINES:
- Always base responses on the actual financial data provided
- Be specific with numbers, percentages, and concrete examples
- Provide actionable, practical advice
- Explain financial concepts clearly and simply
- Be conversational yet professional
- When showing calculations, break them down step by step
- Highlight both positive patterns and areas for improvement
- If asked about data outside the provided timeframe, clearly state the limitation

${financialContext}

Respond as a knowledgeable financial advisor who has thoroughly analyzed this data and can provide specific, personalized insights and recommendations.`

    // Get response from OpenAI via LangChain
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message)
    ]

    const response = await model.invoke(messages)

    return NextResponse.json({
      response: response.content,
      dateRange: {
        start: startDate,
        end: endDate,
        description: dateRangeText
      },
      dataStats: {
        transactionCount: formattedTransactions.length,
        accountCount: formattedAccounts.length,
        totalSpending: totalSpending,
        totalBalance: totalBalance
      }
    })

  } catch (error: any) {
    console.error('Agent API error:', error)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` }, 
      { status: 500 }
    )
  }
} 