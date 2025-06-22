import { createClient } from '@/utils/supabase/server'
import { sendSMS } from './sms'

/**
 * Use ChatGPT to intelligently match user category requests with actual transaction categories
 */
async function findMatchingCategories(
  userCategory: string,
  availableCategories: string[],
  userId: string
): Promise<string[]> {
  console.log('🤖 [CATEGORY_AI] Finding intelligent category matches...')
  console.log('🤖 [CATEGORY_AI] User requested:', userCategory)
  console.log('🤖 [CATEGORY_AI] Available categories:', availableCategories.length)
  
  if (availableCategories.length === 0) {
    console.log('⚠️ [CATEGORY_AI] No categories available, using direct match')
    return [userCategory]
  }

  try {
    const prompt = `You are a financial transaction categorization expert. A user wants to filter transactions by "${userCategory}".

Here are the actual transaction categories available in their data:
${availableCategories.map(cat => `- ${cat}`).join('\n')}

Your task: Return a JSON array of category names from the available list that best match the user's intent for "${userCategory}".

Examples:
- If user asks for "grocery" → match ["Groceries", "Food and Drink", "Supermarkets"]
- If user asks for "food" → match ["Restaurants", "Food and Drink", "Groceries", "Fast Food"]
- If user asks for "gas" → match ["Gas Stations", "Transportation", "Automotive"]
- If user asks for "coffee" → match ["Coffee Shops", "Restaurants", "Food and Drink"]

Be inclusive - better to include more categories that might match than to miss relevant ones.

Return ONLY a valid JSON array of strings, no other text:
["category1", "category2", ...]`

    console.log('🤖 [CATEGORY_AI] Calling OpenAI for category matching...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial categorization expert. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.log('❌ [CATEGORY_AI] OpenAI API failed, falling back to fuzzy matching')
      return fuzzyMatchCategories(userCategory, availableCategories)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    
    console.log('🤖 [CATEGORY_AI] AI Response:', aiResponse)
    
    // Parse the JSON response
    const matchedCategories = JSON.parse(aiResponse)
    
    if (Array.isArray(matchedCategories) && matchedCategories.length > 0) {
      // Validate that returned categories exist in available categories
      const validMatches = matchedCategories.filter(cat => 
        availableCategories.some(available => 
          available.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(available.toLowerCase())
        )
      )
      
      console.log('✅ [CATEGORY_AI] AI matched categories:', validMatches)
      return validMatches.length > 0 ? validMatches : [userCategory]
    }
    
  } catch (error) {
    console.log('❌ [CATEGORY_AI] Error with AI matching:', error)
  }
  
  // Fallback to fuzzy matching if AI fails
  console.log('🔄 [CATEGORY_AI] Falling back to fuzzy matching')
  return fuzzyMatchCategories(userCategory, availableCategories)
}

/**
 * Fallback fuzzy matching for categories
 */
function fuzzyMatchCategories(userCategory: string, availableCategories: string[]): string[] {
  const userLower = userCategory.toLowerCase()
  const matches = availableCategories.filter(cat => 
    cat.toLowerCase().includes(userLower) || 
    userLower.includes(cat.toLowerCase()) ||
    // Additional fuzzy logic
    (userLower === 'food' && cat.toLowerCase().includes('restaurant')) ||
    (userLower === 'gas' && cat.toLowerCase().includes('station')) ||
    (userLower === 'coffee' && cat.toLowerCase().includes('coffee'))
  )
  
  console.log('🔍 [CATEGORY_AI] Fuzzy matches:', matches)
  return matches.length > 0 ? matches : [userCategory]
}

/**
 * Use ChatGPT to intelligently match user merchant requests with actual transaction merchants
 */
async function findMatchingMerchants(
  userMerchant: string,
  availableMerchants: string[],
  userId: string
): Promise<string[]> {
  console.log('🤖 [MERCHANT_AI] Finding intelligent merchant matches...')
  console.log('🤖 [MERCHANT_AI] User requested:', userMerchant)
  console.log('🤖 [MERCHANT_AI] Available merchants:', availableMerchants.length)
  
  if (availableMerchants.length === 0) {
    console.log('⚠️ [MERCHANT_AI] No merchants available, using direct match')
    return [userMerchant]
  }

  try {
    const prompt = `You are a financial transaction analysis expert. A user wants to filter transactions by merchants matching "${userMerchant}".

Here are the actual merchant names available in their transaction data:
${availableMerchants.map(merchant => `- ${merchant}`).join('\n')}

Your task: Return a JSON array of merchant names from the available list that best match the user's intent for "${userMerchant}".

Examples:
- If user asks for "fast food" → match ["McDonald's", "Burger King", "KFC", "Taco Bell", "Wendy's"]
- If user asks for "coffee" → match ["Starbucks", "Dunkin'", "Dunkin' Donuts", "Coffee Bean"]
- If user asks for "gas" or "gas stations" → match ["Shell", "Exxon", "BP", "Chevron", "Mobil"]
- If user asks for "grocery" → match ["Walmart", "Target", "Kroger", "Safeway", "Whole Foods"]
- If user asks for "amazon" → match ["Amazon", "Amazon.com", "AMAZON MARKETPLACE"]

Be inclusive - better to include more merchants that might match than to miss relevant ones.
Consider variations in naming, abbreviations, and business types.

Return ONLY a valid JSON array of strings, no other text:
["merchant1", "merchant2", ...]`

    console.log('🤖 [MERCHANT_AI] Calling OpenAI for merchant matching...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction expert. Return only valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.log('❌ [MERCHANT_AI] OpenAI API failed, falling back to fuzzy matching')
      return fuzzyMatchMerchants(userMerchant, availableMerchants)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    
    console.log('🤖 [MERCHANT_AI] AI Response:', aiResponse)
    
    // Parse the JSON response
    const matchedMerchants = JSON.parse(aiResponse)
    
    if (Array.isArray(matchedMerchants) && matchedMerchants.length > 0) {
      // Validate that returned merchants exist in available merchants
      const validMatches = matchedMerchants.filter(merchant => 
        availableMerchants.some(available => 
          available.toLowerCase().includes(merchant.toLowerCase()) ||
          merchant.toLowerCase().includes(available.toLowerCase()) ||
          available.toLowerCase() === merchant.toLowerCase()
        )
      )
      
      console.log('✅ [MERCHANT_AI] AI matched merchants:', validMatches)
      return validMatches.length > 0 ? validMatches : [userMerchant]
    }
    
  } catch (error) {
    console.log('❌ [MERCHANT_AI] Error with AI matching:', error)
  }
  
  // Fallback to fuzzy matching if AI fails
  console.log('🔄 [MERCHANT_AI] Falling back to fuzzy matching')
  return fuzzyMatchMerchants(userMerchant, availableMerchants)
}

/**
 * Fallback fuzzy matching for merchants
 */
function fuzzyMatchMerchants(userMerchant: string, availableMerchants: string[]): string[] {
  const userLower = userMerchant.toLowerCase()
  const matches = availableMerchants.filter(merchant => 
    merchant.toLowerCase().includes(userLower) || 
    userLower.includes(merchant.toLowerCase()) ||
    // Additional fuzzy logic for common merchant types
    (userLower.includes('fast food') && isFastFoodMerchant(merchant)) ||
    (userLower.includes('coffee') && isCoffeeMerchant(merchant)) ||
    (userLower.includes('gas') && isGasStationMerchant(merchant)) ||
    (userLower.includes('grocery') && isGroceryMerchant(merchant))
  )
  
  console.log('🔍 [MERCHANT_AI] Fuzzy matches:', matches)
  return matches.length > 0 ? matches : [userMerchant]
}

/**
 * Helper functions for merchant type detection
 */
function isFastFoodMerchant(merchant: string): boolean {
  const fastFoodKeywords = ['mcdonald', 'burger king', 'kfc', 'taco bell', 'wendy', 'subway', 'pizza hut', 'domino']
  return fastFoodKeywords.some(keyword => merchant.toLowerCase().includes(keyword))
}

function isCoffeeMerchant(merchant: string): boolean {
  const coffeeKeywords = ['starbucks', 'dunkin', 'coffee', 'cafe', 'espresso']
  return coffeeKeywords.some(keyword => merchant.toLowerCase().includes(keyword))
}

function isGasStationMerchant(merchant: string): boolean {
  const gasKeywords = ['shell', 'exxon', 'bp', 'chevron', 'mobil', 'citgo', 'speedway', 'wawa', 'gas']
  return gasKeywords.some(keyword => merchant.toLowerCase().includes(keyword))
}

function isGroceryMerchant(merchant: string): boolean {
  const groceryKeywords = ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe', 'costco', 'grocery']
  return groceryKeywords.some(keyword => merchant.toLowerCase().includes(keyword))
}

/**
 * Helper function to parse time windows and durations
 */
function parseTimeWindow(timeWindow?: {
  start?: string
  end?: string
  duration?: string
}, defaultDuration = '7 days'): { start: string; end: string } {
  const now = new Date()
  
  if (timeWindow?.start && timeWindow?.end) {
    // Use explicit start and end dates
    return {
      start: timeWindow.start,
      end: timeWindow.end
    }
  }
  
  // Parse duration string (e.g., "10 days", "2 weeks", "1 month")
  const duration = timeWindow?.duration || defaultDuration
  let daysBack = 7 // default
  
  const match = duration.match(/(\d+)\s*(days?|weeks?|months?)/i)
  if (match) {
    const amount = parseInt(match[1])
    const unit = match[2].toLowerCase()
    
    switch (unit) {
      case 'day':
      case 'days':
        daysBack = amount
        break
      case 'week':
      case 'weeks':
        daysBack = amount * 7
        break
      case 'month':
      case 'months':
        daysBack = amount * 30
        break
    }
  }
  
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  
  return {
    start: startDate.toISOString(),
    end: now.toISOString()
  }
}

export interface BalanceThreshold {
  amount: number
  operator: 'greater_than' | 'less_than' | 'equals'
}

export interface AutomationRule {
  triggers: Array<{
    id: string
    type: string
    account?: string
    threshold?: BalanceThreshold
  }>
  criteria: Array<{
    id: string
    conditionType?: string
    merchant?: string
    category?: string
    amount?: number
    operator?: string
    account?: string
    timeWindow?: {
      start?: string
      end?: string
      duration?: string // e.g., "10 days", "2 weeks", "1 month"
    }
  }>
  actions: Array<{
    id: string
    type: string
    message?: string
    notificationType?: string
    fromAccount?: string
    toAccount?: string
    amount?: number
    percentage?: number
  }>
}

export interface UserAccount {
  account_id: string
  name: string
  official_name?: string
  balance?: {
    current_balance: number
    available_balance: number
  }
}

export interface UserProfile {
  phone_number?: string
  full_name?: string
}

/**
 * Check if a balance threshold trigger condition is met
 */
export async function checkBalanceThreshold(
  threshold: BalanceThreshold,
  account: UserAccount
): Promise<boolean> {
  console.log('🔍 [BALANCE] Checking balance threshold condition...')
  console.log('🔍 [BALANCE] Account:', account.name || account.official_name)
  console.log('🔍 [BALANCE] Current balance:', account.balance?.current_balance)
  console.log('🔍 [BALANCE] Threshold amount:', threshold.amount)
  console.log('🔍 [BALANCE] Operator:', threshold.operator)

  if (!account.balance) {
    console.log('❌ [BALANCE] No balance data available for account')
    return false
  }

  const currentBalance = account.balance.current_balance
  const thresholdAmount = threshold.amount
  let result = false

  switch (threshold.operator) {
    case 'greater_than':
      result = currentBalance > thresholdAmount
      console.log(`🔍 [BALANCE] ${currentBalance} > ${thresholdAmount} = ${result}`)
      break
    case 'less_than':
      result = currentBalance < thresholdAmount
      console.log(`🔍 [BALANCE] ${currentBalance} < ${thresholdAmount} = ${result}`)
      break
    case 'equals':
      result = Math.abs(currentBalance - thresholdAmount) < 0.01
      console.log(`🔍 [BALANCE] ${currentBalance} ≈ ${thresholdAmount} = ${result}`)
      break
    default:
      console.log('❌ [BALANCE] Unknown operator:', threshold.operator)
      return false
  }

  console.log(`${result ? '✅' : '❌'} [BALANCE] Threshold condition: ${result ? 'MET' : 'NOT MET'}`)
  return result
}

/**
 * Check if all criteria conditions are satisfied
 */
export async function checkCriteriaConditions(
  criteria: AutomationRule['criteria'],
  userAccounts: UserAccount[],
  userId: string
): Promise<boolean> {
  console.log('🔍 [CRITERIA] Checking criteria conditions...')
  console.log('🔍 [CRITERIA] Number of criteria to check:', criteria?.length || 0)

  if (!criteria || criteria.length === 0) {
    console.log('✅ [CRITERIA] No criteria to check - condition met')
    return true
  }

  const supabase = await createClient()

  for (let i = 0; i < criteria.length; i++) {
    const criterion = criteria[i]
    console.log(`🔍 [CRITERIA] Checking criterion ${i + 1}/${criteria.length}:`, criterion.conditionType)
    
    let conditionMet = false

    switch (criterion.conditionType) {
      case 'spending_threshold':
        console.log('💰 [CRITERIA] Checking spending threshold...')
        conditionMet = await checkSpendingThreshold(criterion, userId, supabase)
        break
      case 'balance_check':
        console.log('💳 [CRITERIA] Checking balance condition...')
        conditionMet = await checkBalanceCondition(criterion, userAccounts)
        break
      case 'merchant_filter':
        console.log('🏪 [CRITERIA] Checking merchant filter...')
        conditionMet = await checkMerchantFilter(criterion, userId, supabase)
        break
      case 'category_filter':
        console.log('📂 [CRITERIA] Checking category filter...')
        conditionMet = await checkCategoryFilter(criterion, userId, supabase)
        break
      case 'category_spending':
        console.log('🛒 [CRITERIA] Checking category spending threshold...')
        conditionMet = await checkCategorySpending(criterion, userId, supabase)
        break
      case 'merchant_spending':
        console.log('🏪💰 [CRITERIA] Checking merchant spending threshold...')
        conditionMet = await checkMerchantSpending(criterion, userId, supabase)
        break
      case 'amount_range':
        console.log('💵 [CRITERIA] Checking amount range (auto-pass for balance triggers)...')
        conditionMet = true
        break
      default:
        console.log('❓ [CRITERIA] Unknown condition type, defaulting to true:', criterion.conditionType)
        conditionMet = true
    }

    console.log(`${conditionMet ? '✅' : '❌'} [CRITERIA] Criterion ${i + 1}: ${conditionMet ? 'PASSED' : 'FAILED'}`)

    if (!conditionMet) {
      console.log('❌ [CRITERIA] Overall criteria check: FAILED (AND logic)')
      return false
    }
  }

  console.log('✅ [CRITERIA] All criteria passed!')
  return true
}

async function checkSpendingThreshold(
  criterion: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  console.log('💰 [SPENDING] Checking spending threshold condition...')
  console.log('💰 [SPENDING] Target amount:', criterion.amount)
  console.log('💰 [SPENDING] Operator:', criterion.operator)
  console.log('💰 [SPENDING] Account filter:', criterion.account || 'Any account')

  if (!criterion.amount || !criterion.operator) {
    console.log('⚠️ [SPENDING] Missing amount or operator, defaulting to true')
    return true
  }

  const timeWindow = parseTimeWindow(criterion.timeWindow, '30 days')
  console.log('💰 [SPENDING] Time window:', timeWindow.start.split('T')[0], 'to', timeWindow.end.split('T')[0])
  
  if (criterion.timeWindow?.duration) {
    console.log('💰 [SPENDING] Duration specified:', criterion.timeWindow.duration)
  }

  let query = supabase
    .from('transactions')
    .select('amount')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])

  if (criterion.account && criterion.account !== 'Any account') {
    console.log('💰 [SPENDING] Filtering by account:', criterion.account)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_id')
      .eq('name', criterion.account)
      .limit(1)

    if (accounts && accounts.length > 0) {
      console.log('💰 [SPENDING] Found account ID:', accounts[0].account_id)
      query = query.eq('account_id', accounts[0].account_id)
    } else {
      console.log('⚠️ [SPENDING] Account not found, using all accounts')
    }
  }

  const { data: transactions } = await query
  console.log('💰 [SPENDING] Found transactions:', transactions?.length || 0)

  if (!transactions) {
    console.log('⚠️ [SPENDING] No transaction data, defaulting to true')
    return true
  }

  const totalSpent = transactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
  console.log('💰 [SPENDING] Total spent in period:', totalSpent)

  let result = false
  switch (criterion.operator) {
    case 'greater_than':
      result = totalSpent > criterion.amount
      console.log(`💰 [SPENDING] ${totalSpent} > ${criterion.amount} = ${result}`)
      break
    case 'less_than':
      result = totalSpent < criterion.amount
      console.log(`💰 [SPENDING] ${totalSpent} < ${criterion.amount} = ${result}`)
      break
    case 'equals':
      result = Math.abs(totalSpent - criterion.amount) < 0.01
      console.log(`💰 [SPENDING] ${totalSpent} ≈ ${criterion.amount} = ${result}`)
      break
    default:
      console.log('⚠️ [SPENDING] Unknown operator, defaulting to true')
      return true
  }

  return result
}

async function checkBalanceCondition(
  criterion: any,
  userAccounts: UserAccount[]
): Promise<boolean> {
  console.log('💳 [BALANCE_CHECK] Checking balance condition...')
  console.log('💳 [BALANCE_CHECK] Target amount:', criterion.amount)
  console.log('💳 [BALANCE_CHECK] Operator:', criterion.operator)
  console.log('💳 [BALANCE_CHECK] Account filter:', criterion.account || 'First account')

  if (!criterion.amount || !criterion.operator) {
    console.log('⚠️ [BALANCE_CHECK] Missing amount or operator, defaulting to true')
    return true
  }

  let targetAccount = userAccounts[0] // Default to first account
  if (criterion.account && criterion.account !== 'Any account') {
    const foundAccount = userAccounts.find(acc => 
      acc.name === criterion.account || acc.official_name === criterion.account
    )
    if (foundAccount) {
      targetAccount = foundAccount
      console.log('💳 [BALANCE_CHECK] Using specified account:', targetAccount.name || targetAccount.official_name)
    } else {
      console.log('⚠️ [BALANCE_CHECK] Specified account not found, using first account')
    }
  }

  if (!targetAccount?.balance) {
    console.log('❌ [BALANCE_CHECK] No balance data for target account')
    return false
  }

  const balance = targetAccount.balance.current_balance
  console.log('💳 [BALANCE_CHECK] Current balance:', balance)

  let result = false
  switch (criterion.operator) {
    case 'greater_than':
      result = balance > criterion.amount
      console.log(`💳 [BALANCE_CHECK] ${balance} > ${criterion.amount} = ${result}`)
      break
    case 'less_than':
      result = balance < criterion.amount
      console.log(`💳 [BALANCE_CHECK] ${balance} < ${criterion.amount} = ${result}`)
      break
    case 'equals':
      result = Math.abs(balance - criterion.amount) < 0.01
      console.log(`💳 [BALANCE_CHECK] ${balance} ≈ ${criterion.amount} = ${result}`)
      break
    default:
      console.log('⚠️ [BALANCE_CHECK] Unknown operator, defaulting to true')
      return true
  }

  return result
}

async function checkMerchantFilter(
  criterion: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  console.log('🏪 [MERCHANT] Checking merchant filter...')
  console.log('🏪 [MERCHANT] Target merchant:', criterion.merchant)

  if (!criterion.merchant) {
    console.log('⚠️ [MERCHANT] No merchant specified, defaulting to true')
    return true
  }

  const timeWindow = parseTimeWindow(criterion.timeWindow, '7 days')
  console.log('🏪 [MERCHANT] Time window:', timeWindow.start.split('T')[0], 'to', timeWindow.end.split('T')[0])
  
  if (criterion.timeWindow?.duration) {
    console.log('🏪 [MERCHANT] Duration specified:', criterion.timeWindow.duration)
  }

  // Step 1: Get unique merchants from user's transaction data
  console.log('🏪 [MERCHANT] Fetching available merchants from transaction data...')
  let merchantQuery = supabase
    .from('transactions')
    .select('merchant_name')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])
    .not('merchant_name', 'is', null)
    .neq('merchant_name', '')

  const { data: merchantData } = await merchantQuery.limit(1000)

  const availableMerchants: string[] = []
  if (merchantData) {
    const merchantSet = new Set<string>()
    merchantData.forEach((row: any) => {
      if (row.merchant_name && typeof row.merchant_name === 'string') {
        merchantSet.add(row.merchant_name)
      }
    })
    availableMerchants.push(...Array.from(merchantSet))
  }

  console.log('🏪 [MERCHANT] Available merchants:', availableMerchants.slice(0, 10), '...')

  // Step 2: Use AI to find matching merchants
  const matchedMerchants = await findMatchingMerchants(
    criterion.merchant,
    availableMerchants,
    userId
  )

  console.log('🏪 [MERCHANT] AI matched merchants:', matchedMerchants)

  // Step 3: Build query with account filter if specified
  let query = supabase
    .from('transactions')
    .select('merchant_name, amount, account_id')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])

  // Filter by account if specified
  if (criterion.account && criterion.account !== 'Any account') {
    console.log('🏪 [MERCHANT] Filtering by account:', criterion.account)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_id')
      .or(`name.eq.${criterion.account},official_name.eq.${criterion.account}`)
      .limit(1)

    if (accounts && accounts.length > 0) {
      console.log('🏪 [MERCHANT] Found account ID:', accounts[0].account_id)
      query = query.eq('account_id', accounts[0].account_id)
    } else {
      console.log('⚠️ [MERCHANT] Account not found, using all accounts')
    }
  }

  const { data: transactions } = await query.limit(500)

  if (!transactions) {
    console.log('⚠️ [MERCHANT] No transaction data')
    return false
  }

  // Step 4: Filter transactions using AI-matched merchants
  const merchantTransactions = transactions.filter((t: any) => {
    if (!t.merchant_name) return false
    
    return matchedMerchants.some(matched => 
      t.merchant_name.toLowerCase().includes(matched.toLowerCase()) ||
      matched.toLowerCase().includes(t.merchant_name.toLowerCase()) ||
      t.merchant_name.toLowerCase() === matched.toLowerCase()
    )
  })

  const found = merchantTransactions.length > 0
  console.log('🏪 [MERCHANT] Found matching transactions:', found)
  
  if (found) {
    console.log('🏪 [MERCHANT] Transaction count:', merchantTransactions.length)
    console.log('🏪 [MERCHANT] Sample transactions:', merchantTransactions.slice(0, 3).map((t: any) => ({
      merchant: t.merchant_name,
      amount: t.amount
    })))
  }

  return found
}

async function checkCategoryFilter(
  criterion: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  console.log('📂 [CATEGORY] Checking category filter...')
  console.log('📂 [CATEGORY] Target category:', criterion.category)

  if (!criterion.category) {
    console.log('⚠️ [CATEGORY] No category specified, defaulting to true')
    return true
  }

  const timeWindow = parseTimeWindow(criterion.timeWindow, '7 days')
  console.log('📂 [CATEGORY] Time window:', timeWindow.start.split('T')[0], 'to', timeWindow.end.split('T')[0])
  
  if (criterion.timeWindow?.duration) {
    console.log('📂 [CATEGORY] Duration specified:', criterion.timeWindow.duration)
  }

  // Step 1: Get unique categories from user's transaction data
  console.log('📂 [CATEGORY] Fetching available categories from transaction data...')
  const { data: categoryData } = await supabase
    .from('transactions')
    .select('category, merchant_name')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])
    .limit(1000)

  // Flatten and deduplicate categories
  const allCategories = new Set<string>()
  const merchantsWithoutCategories: string[] = []
  
  categoryData?.forEach((row: any) => {
    if (row.category) {
      if (Array.isArray(row.category)) {
        row.category.forEach((cat: string) => allCategories.add(cat))
      } else {
        allCategories.add(row.category)
      }
    } else if (row.merchant_name) {
      merchantsWithoutCategories.push(row.merchant_name)
    }
  })

  const availableCategories = Array.from(allCategories)
  console.log('📂 [CATEGORY] Available categories:', availableCategories.slice(0, 10), '...')
  console.log('📂 [CATEGORY] Merchants without categories:', merchantsWithoutCategories.slice(0, 5), '...')
  
  // If no categories but we have merchants, try merchant-based category matching
  if (availableCategories.length === 0 && merchantsWithoutCategories.length > 0) {
    console.log('📂 [CATEGORY] No categories found, trying merchant-based category matching...')
    const matchedMerchants = await findMatchingMerchants(
      criterion.category,
      merchantsWithoutCategories,
      userId
    )
    console.log('📂 [CATEGORY] Matched merchants for category:', matchedMerchants)
    
    if (matchedMerchants.length > 0) {
      // Use merchant names as pseudo-categories
      availableCategories.push(...matchedMerchants)
    }
  }

  // Step 2: Use AI to find matching categories
  const matchedCategories = await findMatchingCategories(
    criterion.category,
    availableCategories,
    userId
  )

  console.log('📂 [CATEGORY] AI matched categories:', matchedCategories)

  // Step 3: Build query with account filter if specified
  let query = supabase
    .from('transactions')
    .select('category, amount, merchant_name, account_id')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])

  // Filter by account if specified
  if (criterion.account && criterion.account !== 'Any account') {
    console.log('📂 [CATEGORY] Filtering by account:', criterion.account)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_id')
      .or(`name.eq.${criterion.account},official_name.eq.${criterion.account}`)
      .limit(1)

    if (accounts && accounts.length > 0) {
      console.log('📂 [CATEGORY] Found account ID:', accounts[0].account_id)
      query = query.eq('account_id', accounts[0].account_id)
    } else {
      console.log('⚠️ [CATEGORY] Account not found, using all accounts')
    }
  }

  const { data: transactions } = await query.limit(500)

  if (!transactions) {
    console.log('⚠️ [CATEGORY] No transaction data')
    return false
  }

  // Step 4: Filter transactions using AI-matched categories and merchants
  const categoryTransactions = transactions.filter((t: any) => {
    // First try category matching
    if (t.category) {
      if (Array.isArray(t.category)) {
        const categoryMatch = t.category.some((cat: string) => 
          matchedCategories.some(matched => 
            cat.toLowerCase().includes(matched.toLowerCase()) ||
            matched.toLowerCase().includes(cat.toLowerCase())
          )
        )
        if (categoryMatch) return true
      } else {
        const categoryMatch = matchedCategories.some(matched => 
          t.category.toLowerCase().includes(matched.toLowerCase()) ||
          matched.toLowerCase().includes(t.category.toLowerCase())
        )
        if (categoryMatch) return true
      }
    }
    
    // If no category match but we have merchant name, try merchant matching
    if (t.merchant_name) {
      const merchantMatch = matchedCategories.some(matched => 
        t.merchant_name.toLowerCase().includes(matched.toLowerCase()) ||
        matched.toLowerCase().includes(t.merchant_name.toLowerCase())
      )
      console.log(`📂 [CATEGORY] Merchant match for "${t.merchant_name}" with "${criterion.category}":`, merchantMatch)
      return merchantMatch
    }
    
    return false
  })

  const found = categoryTransactions.length > 0
  console.log('📂 [CATEGORY] Found matching transactions:', found)
  
  if (found) {
    console.log('📂 [CATEGORY] Transaction count:', categoryTransactions.length)
    console.log('📂 [CATEGORY] Sample transactions:', categoryTransactions.slice(0, 3).map((t: any) => ({
      category: t.category,
      merchant: t.merchant_name,
      amount: t.amount
    })))
  }

  return found
}

async function checkCategorySpending(
  criterion: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  console.log('🛒 [CATEGORY_SPENDING] Checking category spending threshold...')
  console.log('🛒 [CATEGORY_SPENDING] Category:', criterion.category)
  console.log('🛒 [CATEGORY_SPENDING] Threshold amount:', criterion.amount)
  console.log('🛒 [CATEGORY_SPENDING] Operator:', criterion.operator)

  if (!criterion.category || !criterion.amount || !criterion.operator) {
    console.log('⚠️ [CATEGORY_SPENDING] Missing required fields, defaulting to true')
    return true
  }

  const timeWindow = parseTimeWindow(criterion.timeWindow, '10 days')
  console.log('🛒 [CATEGORY_SPENDING] Time window:', timeWindow.start.split('T')[0], 'to', timeWindow.end.split('T')[0])
  
  if (criterion.timeWindow?.duration) {
    console.log('🛒 [CATEGORY_SPENDING] Duration specified:', criterion.timeWindow.duration)
  }

  // Build query for category transactions
  let query = supabase
    .from('transactions')
    .select('amount, category, merchant_name, account_id')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])

  // Filter by account if specified
  if (criterion.account && criterion.account !== 'Any account') {
    console.log('🛒 [CATEGORY_SPENDING] Filtering by account:', criterion.account)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_id')
      .or(`name.eq.${criterion.account},official_name.eq.${criterion.account}`)
      .limit(1)

    if (accounts && accounts.length > 0) {
      query = query.eq('account_id', accounts[0].account_id)
    }
  }

  const { data: transactions } = await query.limit(500)

  if (!transactions) {
    console.log('⚠️ [CATEGORY_SPENDING] No transaction data')
    return false
  }

  // Step 1: Get available categories from the queried transactions
  const allCategories = new Set<string>()
  transactions.forEach((row: any) => {
    if (row.category) {
      if (Array.isArray(row.category)) {
        row.category.forEach((cat: string) => allCategories.add(cat))
      } else {
        allCategories.add(row.category)
      }
    }
  })

  const availableCategories = Array.from(allCategories)
  console.log('🛒 [CATEGORY_SPENDING] Available categories:', availableCategories.slice(0, 10), '...')

  // Step 2: Use AI to find matching categories
  const matchedCategories = await findMatchingCategories(
    criterion.category,
    availableCategories,
    userId
  )

  console.log('🛒 [CATEGORY_SPENDING] AI matched categories:', matchedCategories)

  // Step 3: Filter transactions using AI-matched categories
  const categoryTransactions = transactions.filter((t: any) => {
    if (!t.category) return false
    
    if (Array.isArray(t.category)) {
      return t.category.some((cat: string) => 
        matchedCategories.some(matched => 
          cat.toLowerCase().includes(matched.toLowerCase()) ||
          matched.toLowerCase().includes(cat.toLowerCase())
        )
      )
    }
    
    return matchedCategories.some(matched => 
      t.category.toLowerCase().includes(matched.toLowerCase()) ||
      matched.toLowerCase().includes(t.category.toLowerCase())
    )
  })

  const totalSpent = categoryTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
  console.log('🛒 [CATEGORY_SPENDING] Category transactions found:', categoryTransactions.length)
  console.log('🛒 [CATEGORY_SPENDING] Total spent on category:', totalSpent)

  let result = false
  switch (criterion.operator) {
    case 'greater_than':
      result = totalSpent > criterion.amount
      break
    case 'less_than':
      result = totalSpent < criterion.amount
      break
    case 'equals':
      result = Math.abs(totalSpent - criterion.amount) < 0.01
      break
    default:
      return true
  }

  console.log(`🛒 [CATEGORY_SPENDING] ${totalSpent} ${criterion.operator} ${criterion.amount} = ${result}`)
  return result
}

async function checkMerchantSpending(
  criterion: any,
  userId: string,
  supabase: any
): Promise<boolean> {
  console.log('🏪💰 [MERCHANT_SPENDING] Checking merchant spending threshold...')
  console.log('🏪💰 [MERCHANT_SPENDING] Merchant:', criterion.merchant)
  console.log('🏪💰 [MERCHANT_SPENDING] Threshold amount:', criterion.amount)
  console.log('🏪💰 [MERCHANT_SPENDING] Operator:', criterion.operator)

  if (!criterion.merchant || !criterion.amount || !criterion.operator) {
    console.log('⚠️ [MERCHANT_SPENDING] Missing required fields, defaulting to true')
    return true
  }

  const timeWindow = parseTimeWindow(criterion.timeWindow, '10 days')
  console.log('🏪💰 [MERCHANT_SPENDING] Time window:', timeWindow.start.split('T')[0], 'to', timeWindow.end.split('T')[0])
  
  if (criterion.timeWindow?.duration) {
    console.log('🏪💰 [MERCHANT_SPENDING] Duration specified:', criterion.timeWindow.duration)
  }

  // Step 1: Get unique merchants from user's transaction data
  console.log('🏪💰 [MERCHANT_SPENDING] Fetching available merchants from transaction data...')
  let merchantQuery = supabase
    .from('transactions')
    .select('merchant_name')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])
    .not('merchant_name', 'is', null)
    .neq('merchant_name', '')

  const { data: merchantData } = await merchantQuery.limit(1000)

  const availableMerchants: string[] = []
  if (merchantData) {
    const merchantSet = new Set<string>()
    merchantData.forEach((row: any) => {
      if (row.merchant_name && typeof row.merchant_name === 'string') {
        merchantSet.add(row.merchant_name)
      }
    })
    availableMerchants.push(...Array.from(merchantSet))
  }

  console.log('🏪💰 [MERCHANT_SPENDING] Available merchants:', availableMerchants.slice(0, 10), '...')

  // Step 2: Use AI to find matching merchants
  const matchedMerchants = await findMatchingMerchants(
    criterion.merchant,
    availableMerchants,
    userId
  )

  console.log('🏪💰 [MERCHANT_SPENDING] AI matched merchants:', matchedMerchants)

  // Step 3: Build query for transactions
  let query = supabase
    .from('transactions')
    .select('amount, merchant_name, account_id')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])

  // Filter by account if specified
  if (criterion.account && criterion.account !== 'Any account') {
    console.log('🏪💰 [MERCHANT_SPENDING] Filtering by account:', criterion.account)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('account_id')
      .or(`name.eq.${criterion.account},official_name.eq.${criterion.account}`)
      .limit(1)

    if (accounts && accounts.length > 0) {
      query = query.eq('account_id', accounts[0].account_id)
    }
  }

  const { data: transactions } = await query.limit(500)

  if (!transactions) {
    console.log('⚠️ [MERCHANT_SPENDING] No transaction data')
    return false
  }

  // Step 4: Filter transactions using AI-matched merchants
  const merchantTransactions = transactions.filter((t: any) => {
    if (!t.merchant_name) return false
    
    return matchedMerchants.some(matched => 
      t.merchant_name.toLowerCase().includes(matched.toLowerCase()) ||
      matched.toLowerCase().includes(t.merchant_name.toLowerCase()) ||
      t.merchant_name.toLowerCase() === matched.toLowerCase()
    )
  })

  const totalSpent = merchantTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
  console.log('🏪💰 [MERCHANT_SPENDING] Merchant transactions found:', merchantTransactions.length)
  console.log('🏪💰 [MERCHANT_SPENDING] Total spent at matched merchants:', totalSpent)

  let result = false
  switch (criterion.operator) {
    case 'greater_than':
      result = totalSpent > criterion.amount
      break
    case 'less_than':
      result = totalSpent < criterion.amount
      break
    case 'equals':
      result = Math.abs(totalSpent - criterion.amount) < 0.01
      break
    default:
      return true
  }

  console.log(`🏪💰 [MERCHANT_SPENDING] ${totalSpent} ${criterion.operator} ${criterion.amount} = ${result}`)
  return result
}

/**
 * Execute actions when balance threshold is triggered
 */
export async function executeActions(
  actions: AutomationRule['actions'],
  userProfile: UserProfile,
  triggerAccount: UserAccount,
  thresholdAmount: number
): Promise<void> {
  console.log('🎬 [ACTIONS] Starting action execution...')
  console.log('🎬 [ACTIONS] Number of actions to execute:', actions.length)

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    console.log(`🎬 [ACTIONS] Executing action ${i + 1}/${actions.length}: ${action.type}`)

    try {
      switch (action.type) {
        case 'notify':
          console.log('📱 [ACTIONS] Executing notification action...')
          await executeNotifyAction(action, userProfile, triggerAccount, thresholdAmount)
          console.log('✅ [ACTIONS] Notification action completed')
          break
        case 'transfer':
          console.log('💸 [ACTIONS] Transfer action detected (logging only)...')
          console.log('💸 [ACTIONS] Transfer details:', {
            fromAccount: action.fromAccount,
            toAccount: action.toAccount,
            amount: action.amount,
            percentage: action.percentage
          })
          console.log('✅ [ACTIONS] Transfer action logged')
          break
        default:
          console.log('❓ [ACTIONS] Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('❌ [ACTIONS] Error executing action:', error)
    }
  }

  console.log('🎬 [ACTIONS] Action execution completed')
}

async function executeNotifyAction(
  action: any,
  userProfile: UserProfile,
  triggerAccount: UserAccount,
  thresholdAmount: number
): Promise<void> {
  console.log('📱 [NOTIFY] Executing notification action...')
  console.log('📱 [NOTIFY] User profile phone:', userProfile.phone_number ? '***' + userProfile.phone_number.slice(-4) : 'NOT SET')
  console.log('📱 [NOTIFY] Notification type:', action.notificationType || 'sms (default)')

  if (!userProfile.phone_number) {
    console.log('❌ [NOTIFY] No phone number found for user - cannot send SMS')
    return
  }

  const accountName = triggerAccount.official_name || triggerAccount.name
  const currentBalance = triggerAccount.balance?.current_balance || 0
  
  console.log('📱 [NOTIFY] Account name:', accountName)
  console.log('📱 [NOTIFY] Current balance:', currentBalance)
  console.log('📱 [NOTIFY] Threshold amount:', thresholdAmount)

  // Create a dynamic message if none provided
  let message = action.message
  if (!message) {
    message = `Balance Alert: Your ${accountName} balance is $${currentBalance.toFixed(2)} (threshold: $${thresholdAmount.toFixed(2)})`
    console.log('📱 [NOTIFY] Using default message template')
  } else {
    console.log('📱 [NOTIFY] Using custom message template')
    // Replace placeholders in the message
    message = message
      .replace('{account}', accountName)
      .replace('{balance}', `$${currentBalance.toFixed(2)}`)
      .replace('{threshold}', `$${thresholdAmount.toFixed(2)}`)
  }

  console.log('📱 [NOTIFY] Final message:', message)

  // Send SMS notification
  if (action.notificationType === 'sms' || !action.notificationType) {
    console.log('📱 [NOTIFY] Sending SMS notification...')
    await sendSMS(userProfile.phone_number, message)
    console.log('✅ [NOTIFY] SMS notification sent successfully')
  } else {
    console.log('⚠️ [NOTIFY] Non-SMS notification type not supported:', action.notificationType)
  }
}

/**
 * Process new transaction triggers for a user using their recent transactions
 */
export async function processNewTransactionTriggers(userId: string): Promise<{
  automationsFound: number
  accountsFound: number
  triggersExecuted: number
  notificationsSent: number
}> {
  console.log('🆕 [NEW_TRANSACTION] Starting new transaction trigger processing...')
  console.log('🆕 [NEW_TRANSACTION] User ID:', userId)
  console.log('=' .repeat(60))

  let automationsFound = 0
  let accountsFound = 0
  let triggersExecuted = 0
  let notificationsSent = 0

  const supabase = await createClient()

  try {
    // Step 1: Get user's active automations with new_transaction triggers
    console.log('📋 [NEW_TRANSACTION] Step 1: Fetching new transaction automations...')
    const { data: automations, error: automationsError } = await supabase
      .from('flows')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (automationsError) {
      console.error('❌ [NEW_TRANSACTION] Error fetching automations:', automationsError)
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    // Filter for new_transaction triggers
    const newTransactionAutomations = automations?.filter(automation => {
      const rule: AutomationRule = automation.schema
      return rule.triggers?.some(trigger => trigger.type === 'new_transaction')
    }) || []

    automationsFound = newTransactionAutomations.length
    console.log('📋 [NEW_TRANSACTION] Found new transaction automations:', automationsFound)

    if (newTransactionAutomations.length === 0) {
      console.log('⚠️ [NEW_TRANSACTION] No new transaction automations found')
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    // Step 2: Get user's accounts and recent transactions
    console.log('💳 [NEW_TRANSACTION] Step 2: Fetching user accounts and recent transactions...')
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        account_id,
        name,
        official_name,
        plaid_connections!inner(user_id),
        balances(
          current_balance,
          available_balance,
          last_updated_datetime
        )
      `)
      .eq('plaid_connections.user_id', userId)

    if (accountsError) {
      console.error('❌ [NEW_TRANSACTION] Error fetching accounts:', accountsError)
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    accountsFound = accounts?.length || 0
    console.log('💳 [NEW_TRANSACTION] Found accounts:', accountsFound)

    // Get recent transactions (last 7 days) to simulate "new" transactions
    // Using 7 days for testing - in production this could be reduced to 1 day or real-time
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(100)

    console.log('🆕 [NEW_TRANSACTION] Recent transactions (7 days):', recentTransactions?.length || 0)
    
    if (transactionsError) {
      console.error('❌ [NEW_TRANSACTION] Error fetching transactions:', transactionsError)
    }
    
    if (recentTransactions && recentTransactions.length > 0) {
      console.log('🆕 [NEW_TRANSACTION] Sample recent transactions:', recentTransactions.slice(0, 3).map(t => ({
        date: t.date,
        merchant: t.merchant_name,
        amount: t.amount,
        account_id: t.account_id?.slice(-4) || 'unknown'
      })))
    }

    if (!recentTransactions || recentTransactions.length === 0) {
      console.log('⚠️ [NEW_TRANSACTION] No recent transactions to process')
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    // Step 3: Get user profile
    console.log('👤 [NEW_TRANSACTION] Step 3: Fetching user profile...')
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('phone_number, full_name')
      .eq('user_id', userId)
      .single()

    const userProfile: UserProfile = profile || {}
    console.log('👤 [NEW_TRANSACTION] Profile found:', !!profile)
    console.log('👤 [NEW_TRANSACTION] Phone number available:', !!userProfile.phone_number)

    const userAccounts: UserAccount[] = (accounts || []).map(acc => ({
      account_id: acc.account_id,
      name: acc.name,
      official_name: acc.official_name,
      balance: acc.balances && acc.balances.length > 0 ? {
        current_balance: acc.balances[0].current_balance,
        available_balance: acc.balances[0].available_balance
      } : undefined
    }))

    // Step 4: Process each automation against recent transactions
    console.log('🔄 [NEW_TRANSACTION] Step 4: Processing automations...')
    for (let i = 0; i < newTransactionAutomations.length; i++) {
      const automation = newTransactionAutomations[i]
      console.log(`\n🔄 [NEW_TRANSACTION] Processing automation ${i + 1}/${newTransactionAutomations.length}: "${automation.name}"`)
      
      try {
        const rule: AutomationRule = automation.schema
        console.log('🔄 [NEW_TRANSACTION] Triggers in automation:', rule.triggers?.length || 0)
        console.log('🔄 [NEW_TRANSACTION] Criteria in automation:', rule.criteria?.length || 0)
        console.log('🔄 [NEW_TRANSACTION] Actions in automation:', rule.actions?.length || 0)

        // Check each new_transaction trigger
        for (let j = 0; j < (rule.triggers || []).length; j++) {
          const trigger = rule.triggers[j]
          console.log(`\n🎯 [NEW_TRANSACTION] Checking trigger ${j + 1}/${rule.triggers.length}: ${trigger.type}`)

          if (trigger.type !== 'new_transaction') {
            console.log('⏭️ [NEW_TRANSACTION] Skipping non-new-transaction trigger')
            continue
          }

          console.log(`🎯 [NEW_TRANSACTION] Trigger account filter: "${trigger.account || 'Any account'}"`)
          console.log(`🎯 [NEW_TRANSACTION] Processing ${recentTransactions.length} recent transactions...`)
          console.log(`🎯 [NEW_TRANSACTION] Note: For new_transaction triggers, we process ALL transactions and let criteria handle account filtering`)

          // Process recent transactions - let criteria handle account filtering for better flexibility
          for (const transaction of recentTransactions) {
            console.log(`\n💰 [NEW_TRANSACTION] Processing transaction: ${transaction.merchant_name || 'Unknown'} - $${Math.abs(transaction.amount)} (Date: ${transaction.date})`)
            console.log(`🏦 [NEW_TRANSACTION] Transaction account ID: ${transaction.account_id}`)
            
            const transactionAccount = userAccounts.find(acc => acc.account_id === transaction.account_id)
            if (transactionAccount) {
              console.log(`🏦 [NEW_TRANSACTION] Transaction account: ${transactionAccount.name} / ${transactionAccount.official_name}`)
            } else {
              console.log(`❌ [NEW_TRANSACTION] Transaction account not found in user accounts`)
              continue
            }

            // For new_transaction triggers, we don't filter by trigger account here
            // Instead, we let the criteria handle account-specific filtering
            // This allows more flexible automations like "if ANY transaction meets criteria"

            // Check if additional criteria are satisfied
            const criteriaMet = await checkCriteriaConditions(rule.criteria, userAccounts, userId)
            
            if (criteriaMet) {
              console.log('🎉 [NEW_TRANSACTION] TRANSACTION MATCHES CRITERIA - Executing actions!')
              
              triggersExecuted++
              const actionCount = rule.actions?.filter(action => action.type === 'notify').length || 0
              notificationsSent += actionCount
              
              // Find the account for this transaction
              const transactionAccount = userAccounts.find(acc => acc.account_id === transaction.account_id) || userAccounts[0]
              
              // Execute actions with transaction context
              await executeNewTransactionActions(
                rule.actions || [],
                userProfile,
                transactionAccount,
                transaction
              )
              
              // Only process one matching transaction per trigger to avoid spam
              break
            } else {
              console.log('❌ [NEW_TRANSACTION] Criteria not met for this transaction')
            }
          }
        }
      } catch (error) {
        console.error(`❌ [NEW_TRANSACTION] Error processing automation ${automation.id}:`, error)
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🏁 [NEW_TRANSACTION] New transaction processing completed!')
    console.log('📊 [NEW_TRANSACTION] Final stats:', { automationsFound, accountsFound, triggersExecuted, notificationsSent })

    return { automationsFound, accountsFound, triggersExecuted, notificationsSent }

  } catch (error) {
    console.error('❌ [NEW_TRANSACTION] Error in processNewTransactionTriggers:', error)
    return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
  }
}

/**
 * Execute actions for new transaction triggers with transaction context
 */
async function executeNewTransactionActions(
  actions: AutomationRule['actions'],
  userProfile: UserProfile,
  transactionAccount: UserAccount,
  transaction: any
): Promise<void> {
  console.log('🎬 [NEW_TX_ACTIONS] Starting new transaction action execution...')
  console.log('🎬 [NEW_TX_ACTIONS] Number of actions to execute:', actions.length)
  console.log('🎬 [NEW_TX_ACTIONS] Transaction context:', {
    merchant: transaction.merchant_name,
    amount: transaction.amount,
    date: transaction.date
  })

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    console.log(`🎬 [NEW_TX_ACTIONS] Executing action ${i + 1}/${actions.length}: ${action.type}`)

    try {
      switch (action.type) {
        case 'notify':
          console.log('📱 [NEW_TX_ACTIONS] Executing notification action...')
          await executeNewTransactionNotifyAction(action, userProfile, transactionAccount, transaction)
          console.log('✅ [NEW_TX_ACTIONS] Notification action completed')
          break
        case 'transfer':
          console.log('💸 [NEW_TX_ACTIONS] Transfer action detected (logging only)...')
          console.log('💸 [NEW_TX_ACTIONS] Transfer details:', {
            fromAccount: action.fromAccount,
            toAccount: action.toAccount,
            amount: action.amount,
            percentage: action.percentage
          })
          console.log('✅ [NEW_TX_ACTIONS] Transfer action logged')
          break
        default:
          console.log('❓ [NEW_TX_ACTIONS] Unknown action type:', action.type)
      }
    } catch (error) {
      console.error('❌ [NEW_TX_ACTIONS] Error executing action:', error)
    }
  }

  console.log('🎬 [NEW_TX_ACTIONS] Action execution completed')
}

/**
 * Execute notification action for new transaction triggers
 */
async function executeNewTransactionNotifyAction(
  action: any,
  userProfile: UserProfile,
  transactionAccount: UserAccount,
  transaction: any
): Promise<void> {
  console.log('📱 [NEW_TX_NOTIFY] Executing new transaction notification action...')
  console.log('📱 [NEW_TX_NOTIFY] User profile phone:', userProfile.phone_number ? '***' + userProfile.phone_number.slice(-4) : 'NOT SET')
  console.log('📱 [NEW_TX_NOTIFY] Notification type:', action.notificationType || 'sms (default)')

  if (!userProfile.phone_number) {
    console.log('❌ [NEW_TX_NOTIFY] No phone number found for user - cannot send SMS')
    return
  }

  const accountName = transactionAccount.official_name || transactionAccount.name
  const currentBalance = transactionAccount.balance?.current_balance || 0
  const merchantName = transaction.merchant_name || 'Unknown Merchant'
  const amount = Math.abs(transaction.amount)
  const transactionDate = transaction.date
  
  console.log('📱 [NEW_TX_NOTIFY] Account name:', accountName)
  console.log('📱 [NEW_TX_NOTIFY] Current balance:', currentBalance)
  console.log('📱 [NEW_TX_NOTIFY] Transaction merchant:', merchantName)
  console.log('📱 [NEW_TX_NOTIFY] Transaction amount:', amount)

  // Create a dynamic message if none provided
  let message = action.message
  if (!message) {
    message = `Transaction Alert: $${amount.toFixed(2)} spent at ${merchantName} on ${transactionDate}. Account balance: $${currentBalance.toFixed(2)}`
    console.log('📱 [NEW_TX_NOTIFY] Using default message template')
  } else {
    console.log('📱 [NEW_TX_NOTIFY] Using custom message template')
    // Replace placeholders in the message
    message = message
      .replace('{account}', accountName)
      .replace('{balance}', `$${currentBalance.toFixed(2)}`)
      .replace('{merchant}', merchantName)
      .replace('{amount}', `$${amount.toFixed(2)}`)
      .replace('{date}', transactionDate)
  }

  console.log('📱 [NEW_TX_NOTIFY] Final message:', message)

  // Send SMS notification
  if (action.notificationType === 'sms' || !action.notificationType) {
    console.log('📱 [NEW_TX_NOTIFY] Sending SMS notification...')
    await sendSMS(userProfile.phone_number, message)
    console.log('✅ [NEW_TX_NOTIFY] SMS notification sent successfully')
  } else {
    console.log('⚠️ [NEW_TX_NOTIFY] Non-SMS notification type not supported:', action.notificationType)
  }
}

/**
 * Process balance threshold triggers for a user
 */
export async function processBalanceThresholds(userId: string): Promise<{
  automationsFound: number
  accountsFound: number
  triggersExecuted: number
  notificationsSent: number
}> {
  console.log('🚀 [PROCESS] Starting balance threshold processing...')
  console.log('🚀 [PROCESS] User ID:', userId)
  console.log('=' .repeat(60))

  let automationsFound = 0
  let accountsFound = 0
  let triggersExecuted = 0
  let notificationsSent = 0

  const supabase = await createClient()

  try {
    // Step 1: Get user's active automations
    console.log('📋 [PROCESS] Step 1: Fetching user automations...')
    const { data: automations, error: automationsError } = await supabase
      .from('flows')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (automationsError) {
      console.error('❌ [PROCESS] Error fetching automations:', automationsError)
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    automationsFound = automations?.length || 0
    console.log('📋 [PROCESS] Found automations:', automationsFound)

    if (!automations || automations.length === 0) {
      console.log('⚠️ [PROCESS] No active automations found for user')
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    // Step 2: Get user's accounts with balances
    console.log('💳 [PROCESS] Step 2: Fetching user accounts...')
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        account_id,
        name,
        official_name,
        plaid_connections!inner(user_id),
        balances(
          current_balance,
          available_balance,
          last_updated_datetime
        )
      `)
      .eq('plaid_connections.user_id', userId)

    if (accountsError) {
      console.error('❌ [PROCESS] Error fetching accounts:', accountsError)
      return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
    }

    accountsFound = accounts?.length || 0
    console.log('💳 [PROCESS] Found accounts:', accountsFound)

    // Step 3: Get user profile
    console.log('👤 [PROCESS] Step 3: Fetching user profile...')
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('phone_number, full_name')
      .eq('user_id', userId)
      .single()

    const userProfile: UserProfile = profile || {}
    console.log('👤 [PROCESS] Profile found:', !!profile)
    console.log('👤 [PROCESS] Phone number available:', !!userProfile.phone_number)

    const userAccounts: UserAccount[] = (accounts || []).map(acc => ({
      account_id: acc.account_id,
      name: acc.name,
      official_name: acc.official_name,
      balance: acc.balances && acc.balances.length > 0 ? {
        current_balance: acc.balances[0].current_balance,
        available_balance: acc.balances[0].available_balance
      } : undefined
    }))

    console.log('💳 [PROCESS] Accounts with balance data:', userAccounts.filter(acc => acc.balance).length)

    // Step 4: Process each automation
    console.log('🔄 [PROCESS] Step 4: Processing automations...')
    for (let i = 0; i < automations.length; i++) {
      const automation = automations[i]
      console.log(`\n🔄 [PROCESS] Processing automation ${i + 1}/${automations.length}: "${automation.name}"`)
      
      try {
        const rule: AutomationRule = automation.schema
        console.log('🔄 [PROCESS] Triggers in automation:', rule.triggers?.length || 0)
        console.log('🔄 [PROCESS] Criteria in automation:', rule.criteria?.length || 0)
        console.log('🔄 [PROCESS] Actions in automation:', rule.actions?.length || 0)

        // Check each trigger
        for (let j = 0; j < (rule.triggers || []).length; j++) {
          const trigger = rule.triggers[j]
          console.log(`\n🎯 [PROCESS] Checking trigger ${j + 1}/${rule.triggers.length}: ${trigger.type}`)

          if (trigger.type !== 'balance_threshold' || !trigger.threshold) {
            console.log('⏭️ [PROCESS] Skipping non-balance-threshold trigger')
            continue
          }

          // Find the target account
          let targetAccount = userAccounts[0] // Default to first account
          if (trigger.account) {
            const foundAccount = userAccounts.find(acc => 
              acc.name === trigger.account || acc.official_name === trigger.account
            )
            if (foundAccount) {
              targetAccount = foundAccount
              console.log('🎯 [PROCESS] Using specified account:', targetAccount.name || targetAccount.official_name)
            } else {
              console.log('⚠️ [PROCESS] Specified account not found, using first account')
            }
          } else {
            console.log('🎯 [PROCESS] No account specified, using first account')
          }

          if (!targetAccount?.balance) {
            console.log('❌ [PROCESS] No balance data for target account, skipping trigger')
            continue
          }

          // Check if threshold condition is met
          const thresholdMet = await checkBalanceThreshold(trigger.threshold, targetAccount)
          
          if (thresholdMet) {
            console.log('✅ [PROCESS] Balance threshold MET!')
            
            // Check if additional criteria are satisfied
            const criteriaMet = await checkCriteriaConditions(rule.criteria, userAccounts, userId)
            
            if (criteriaMet) {
              console.log('🎉 [PROCESS] ALL CONDITIONS MET - Executing actions!')
              
              triggersExecuted++
              const actionCount = rule.actions?.filter(action => action.type === 'notify').length || 0
              notificationsSent += actionCount
              
              // Execute actions
              await executeActions(
                rule.actions || [],
                userProfile,
                targetAccount,
                trigger.threshold.amount
              )
            } else {
              console.log('❌ [PROCESS] Criteria not met, skipping action execution')
            }
          } else {
            console.log('❌ [PROCESS] Balance threshold not met, skipping')
          }
        }
      } catch (error) {
        console.error(`❌ [PROCESS] Error processing automation ${automation.id}:`, error)
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🏁 [PROCESS] Balance threshold processing completed!')
    console.log('📊 [PROCESS] Final stats:', { automationsFound, accountsFound, triggersExecuted, notificationsSent })

    return { automationsFound, accountsFound, triggersExecuted, notificationsSent }

  } catch (error) {
    console.error('❌ [PROCESS] Error in processBalanceThresholds:', error)
    return { automationsFound, accountsFound, triggersExecuted, notificationsSent }
  }
} 