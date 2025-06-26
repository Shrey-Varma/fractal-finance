import { createClient } from '@/utils/supabase/server'
import { sendSMS } from './sms'

/**
 * Use ChatGPT to intelligently match user category requests with actual transaction categories
 */
async function findMatchingCategories(
  userCategory: string,
  availableCategories: any[],
  userId: string
): Promise<string[]> {
  console.log('🤖 [CATEGORY_AI] Finding intelligent category matches...')
  console.log('🤖 [CATEGORY_AI] User requested:', userCategory)
  console.log('🤖 [CATEGORY_AI] Available categories count:', availableCategories.length)
  
  // Note: AI can only match against categories that actually exist in the user's transaction data
  // If the user asks for "food" but only has "FOOD_AND_DRINK" transactions, that's all we can match

  if (availableCategories.length === 0) {
    console.log('⚠️ [CATEGORY_AI] No categories available, using direct match')
    return []
  }

  // Extract primary category names from the objects
  const categoryNames = availableCategories.map(cat => {
    if (typeof cat === 'string') return cat;
    if (cat.primary) return cat.primary;
    if (cat.detailed) return cat.detailed;
    return null;
  }).filter(Boolean);

  const prompt = `You are a financial transaction categorization expert. A user wants to filter transactions by "${userCategory}".

Here are the ONLY valid transaction categories (copy-paste from this list only, do not invent new ones):
${categoryNames.map(cat => `- ${cat}`).join('\n')}

Your task: Return a JSON array of category names from the available list that best match the user's intent for "${userCategory}".

IMPORTANT: 
- Only use categories from the list above. Do NOT invent or hallucinate new categories.
- The output must be a JSON array of exact strings from the list above.
- Copy-paste the exact category names as they appear in the list.
- Return each category ONLY ONCE - no duplicates.
- Be inclusive - better to include more categories that might match than to miss relevant ones.

Examples:
- If user asks for "food" → match ["FOOD_AND_DRINK"] (or whatever food-related categories are available)
- If user asks for "gas" → match ["TRANSPORTATION", "AUTOMOTIVE"] (if available)
- If user asks for "coffee" → match ["FOOD_AND_DRINK"] (since coffee is food/drink)
- If user asks for "shopping" → match ["SHOPPING", "GENERAL_MERCHANDISE"] (if available)

IMPORTANT: Only return categories that actually exist in the list above. If only one category matches, return just that one. If multiple categories match, return all of them.

Return ONLY a valid JSON array of strings, no other text:
["category1", "category2", ...]`

  try {
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
      return []
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    
    console.log('🤖 [CATEGORY_AI] AI response:', aiResponse)
    
    let matchedCategories: string[] = []
    try {
      matchedCategories = JSON.parse(aiResponse || '[]')
      // Remove duplicates as a safety measure
      matchedCategories = Array.from(new Set(matchedCategories))
    } catch {
      console.log('🤖 [CATEGORY_AI] Failed to parse AI response, using empty array')
      matchedCategories = []
    }
    
    // Only keep categories that are an exact match in categoryNames
    const validMatches = matchedCategories.filter(cat => categoryNames.includes(cat))
    console.log('✅ [CATEGORY_AI] Valid matched categories:', validMatches)
    if (validMatches.length > 0) {
      return validMatches
    } else {
      // No fuzzy fallback: just return empty array
      return []
    }
  } catch (error) {
    console.log('❌ [CATEGORY_AI] Error with AI matching:', error)
    return []
  }
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
    
    let matchedMerchants: string[] = []
    try {
      matchedMerchants = JSON.parse(aiResponse || '[]')
      // Remove duplicates as a safety measure
      matchedMerchants = Array.from(new Set(matchedMerchants))
    } catch {
      console.log('🤖 [MERCHANT_AI] Failed to parse AI response, using empty array')
      matchedMerchants = []
    }
    
    if (Array.isArray(matchedMerchants) && matchedMerchants.length > 0) {
      // Validate that returned merchants exist in available merchants
      const validMatches = matchedMerchants.filter(merchant => 
        availableMerchants.some(available => 
          available.toLowerCase().includes(merchant.toLowerCase()) ||
          merchant.toLowerCase().includes(available.toLowerCase()) ||
          available.toLowerCase() === merchant.toLowerCase()
        )
      )
      
      console.log('✅ [MERCHANT_AI] Valid matched merchants:', validMatches)
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

  // --- ENHANCED LOGIC FOR STACKING ---
  // Collect filters and thresholds
  let merchant = null
  let category = null
  let account = null
  let spendingThreshold = null
  let balanceCheck = null
  let otherCriteria = []

  for (const criterion of criteria) {
    switch (criterion.conditionType) {
      case 'merchant_filter':
        merchant = criterion.merchant
        // Log available categories if present
        try {
          const supabase = await createClient();
          const { data: transactions } = await supabase
            .from('transactions')
            .select('personal_finance_category')
            .limit(1000);
          const allCategories = Array.from(new Set((transactions || []).flatMap(t => Array.isArray(t.personal_finance_category) ? t.personal_finance_category : [t.personal_finance_category]).filter(Boolean)));
        } catch (e) { console.log('[DEBUG] Could not fetch categories for merchant_filter:', e); }
        break
      case 'category_filter':
        category = criterion.category
        // Log available categories if present
        try {
          const supabase = await createClient();
          const { data: transactions } = await supabase
            .from('transactions')
            .select('personal_finance_category')
            .limit(1000);
          const allCategories = Array.from(new Set((transactions || []).flatMap(t => Array.isArray(t.personal_finance_category) ? t.personal_finance_category : [t.personal_finance_category]).filter(Boolean)));
        } catch (e) { console.log('[DEBUG] Could not fetch categories for category_filter:', e); }
        break
      case 'balance_check':
        balanceCheck = criterion
        break
      case 'spending_threshold':
        spendingThreshold = criterion
        break
      case 'account_match':
        account = criterion.account
        break
      default:
        otherCriteria.push(criterion)
    }
  }

  const supabase = await createClient()

  // --- COMBINED SPENDING THRESHOLD ---
  if (spendingThreshold && (merchant || category || account)) {
    // Compose a query for spending threshold with filters
    console.log('🔗 [CRITERIA] Combining spending threshold with filters:', { merchant, category, account })
    const timeWindow = parseTimeWindow(spendingThreshold.timeWindow, '30 days')
    let query = supabase
      .from('transactions')
      .select('amount, merchant_name, personal_finance_category, account_id')
      .gte('date', timeWindow.start.split('T')[0])
      .lte('date', timeWindow.end.split('T')[0])

    if (account && account !== 'Any account') {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('account_id')
        .or(`name.eq.${account},official_name.eq.${account}`)
        .limit(1)
      if (accounts && accounts.length > 0) {
        query = query.eq('account_id', accounts[0].account_id)
      }
    }
    if (merchant) {
      query = query.ilike('merchant_name', `%${merchant}%`)
    }
    let matchedCategories: string[] = [];
    if (category) {
      // Fetch all available categories from the DB
      const { data: allTrans } = await supabase
        .from('transactions')
        .select('personal_finance_category')
        .limit(2000);
      const availableCategories = Array.from(new Set((allTrans || []).flatMap((t: any) => {
        if (!t.personal_finance_category) return [];
        if (Array.isArray(t.personal_finance_category)) {
          return t.personal_finance_category.map((cat: any) => 
            typeof cat === 'string' ? cat : (cat.primary || cat.detailed)
          );
        }
        return [typeof t.personal_finance_category === 'string' 
          ? t.personal_finance_category 
          : (t.personal_finance_category.primary || t.personal_finance_category.detailed)];
      }).filter(Boolean)));
      // Use AI to match
      matchedCategories = await findMatchingCategories(category, availableCategories, userId);
      // If AI returns empty or only the user input, fallback to fuzzy matcher
      if (!matchedCategories || matchedCategories.length === 0) {
        return false;
      }
      // Only keep categories that exist in availableCategories
      matchedCategories = matchedCategories.filter(cat => availableCategories.includes(cat));
      // If still empty, fallback to all availableCategories (last resort)
      if (matchedCategories.length === 0) {
        matchedCategories = availableCategories;
      }
      console.log('[COMBINED] AI-mapped categories for filter:', matchedCategories);
      if (matchedCategories.length > 0) {
        console.log('[COMBINED] Adding category filter to query:', matchedCategories);
        // Since categories are stored as objects, we need to use a different approach
        // For now, let's fetch all transactions and filter in memory
        console.log('[COMBINED] Using in-memory filtering for category objects');
      }
    }
    console.log('[COMBINED] Final query filters:', { 
      timeWindow: `${timeWindow.start.split('T')[0]} to ${timeWindow.end.split('T')[0]}`,
      account: account || 'Any account',
      merchant: merchant || 'None',
      categories: matchedCategories || 'None'
    });
    const { data: transactions } = await query
    
    // Filter by category in memory if needed
    let filteredTransactions = transactions;
    if (matchedCategories && matchedCategories.length > 0) {
      filteredTransactions = transactions?.filter((t: any) => {
        if (!t.personal_finance_category) return false;
        
        if (Array.isArray(t.personal_finance_category)) {
          return t.personal_finance_category.some((cat: any) => {
            const categoryName = typeof cat === 'string' ? cat : (cat.primary || cat.detailed);
            return matchedCategories.includes(categoryName);
          });
        }
        
        const categoryName = typeof t.personal_finance_category === 'string' 
          ? t.personal_finance_category 
          : (t.personal_finance_category.primary || t.personal_finance_category.detailed);
        return matchedCategories.includes(categoryName);
      }) || [];
      
      console.log('[COMBINED] After category filtering:', filteredTransactions.length, 'transactions');
    }
    
    if (!filteredTransactions || filteredTransactions.length === 0) {
      console.log('⚠️ [COMBINED] No transaction data after filtering')
      return false
    }
    console.log(`[LOGIC] Transactions included in calculation:`, filteredTransactions.map(t => ({ merchant: t.merchant_name, category: t.personal_finance_category, amount: t.amount, account_id: t.account_id })))
    const totalSpent = filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    console.log(`[LOGIC] Total spent after stacking filters: $${totalSpent}`)
    let result = false
    if (spendingThreshold.amount === undefined) {
      console.log('[COMBINED] spendingThreshold.amount is undefined, failing check')
      return false
    }
    switch (spendingThreshold.operator) {
      case 'greater_than':
        result = totalSpent > spendingThreshold.amount
        break
      case 'less_than':
        result = totalSpent < spendingThreshold.amount
        break
      case 'equals':
        result = Math.abs(totalSpent - spendingThreshold.amount) < 0.01
        break
      default:
        result = true
    }
    console.log(`[COMBINED] Total spent with filters: ${totalSpent}, threshold: ${spendingThreshold.amount}, result: ${result}`)
    if (!result) return false
  }

  // --- COMBINED BALANCE CHECK ---
  if (balanceCheck && (account || merchant || category)) {
    // Find the right account
    let targetAccount = userAccounts[0]
    if (account && account !== 'Any account') {
      const foundAccount = userAccounts.find(acc => acc.name === account || acc.official_name === account)
      if (foundAccount) targetAccount = foundAccount
    }
    console.log('[LOGIC] Using COMBINED balance check logic (stacked filters)')
    // Optionally, could filter by merchant/category if you have per-account/merchant/category balances
    // For now, just use account
    if (!targetAccount?.balance) {
      console.log('❌ [COMBINED BALANCE] No balance data for target account')
      return false
    }
    const balance = targetAccount.balance.current_balance
    console.log(`[LOGIC] Balance for account ${targetAccount.name || targetAccount.official_name}: $${balance}`)
    let result = false
    if (balanceCheck.amount === undefined) {
      console.log('[COMBINED] balanceCheck.amount is undefined, failing check')
      return false
    }
    switch (balanceCheck.operator) {
      case 'greater_than':
        result = balance > balanceCheck.amount
        break
      case 'less_than':
        result = balance < balanceCheck.amount
        break
      case 'equals':
        result = Math.abs(balance - balanceCheck.amount) < 0.01
        break
      default:
        result = true
    }
    console.log(`[COMBINED] Balance check with filters: ${balance}, threshold: ${balanceCheck.amount}, result: ${result}`)
    if (!result) return false
  }

  // --- FALLBACK: check other criteria as usual ---
  for (let i = 0; i < otherCriteria.length; i++) {
    const criterion = otherCriteria[i]
    let conditionMet = false
    switch (criterion.conditionType) {
      case 'merchant_spending':
        conditionMet = await checkMerchantSpending(criterion, userId, supabase)
        break
      case 'category_spending':
        conditionMet = await checkCategorySpending(criterion, userId, supabase)
        break
      case 'merchant_filter':
        conditionMet = await checkMerchantFilter(criterion, userId, supabase)
        break
      case 'category_filter':
        conditionMet = await checkCategoryFilter(criterion, userId, supabase)
        break
      case 'spending_threshold':
        conditionMet = await checkSpendingThreshold(criterion, userId, supabase)
        break
      case 'balance_check':
        conditionMet = await checkBalanceCondition(criterion, userAccounts)
        break
      case 'amount_range':
        conditionMet = true
        break
      default:
        conditionMet = true
    }
    if (!conditionMet) {
      console.log('❌ [CRITERIA] Fallback criteria failed:', criterion)
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
    .select('personal_finance_category, merchant_name')
    .gte('date', timeWindow.start.split('T')[0])
    .lte('date', timeWindow.end.split('T')[0])
    .limit(1000)

  // Flatten and deduplicate categories
  const allCategories = new Set<string>()
  const merchantsWithoutCategories: string[] = []
  
  categoryData?.forEach((row: any) => {
    if (row.personal_finance_category) {
      if (Array.isArray(row.personal_finance_category)) {
        row.personal_finance_category.forEach((cat: string) => allCategories.add(cat))
      } else {
        allCategories.add(row.personal_finance_category)
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
    .select('personal_finance_category, amount, merchant_name, account_id')
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

  // Step 4: Filter transactions using AI-matched categories (exact matches only)
  const categoryTransactions = transactions.filter((t: any) => {
    if (!t.personal_finance_category) return false
    
    if (Array.isArray(t.personal_finance_category)) {
      return t.personal_finance_category.some((cat: any) => {
        const categoryName = typeof cat === 'string' ? cat : (cat.primary || cat.detailed);
        return matchedCategories.includes(categoryName);
      });
    }
    
    const categoryName = typeof t.personal_finance_category === 'string' 
      ? t.personal_finance_category 
      : (t.personal_finance_category.primary || t.personal_finance_category.detailed);
    return matchedCategories.includes(categoryName);
  })

  const found = categoryTransactions.length > 0
  console.log('📂 [CATEGORY] Found matching transactions:', found)
  
  if (found) {
    console.log('📂 [CATEGORY] Transaction count:', categoryTransactions.length)
    console.log('📂 [CATEGORY] Sample transactions:', categoryTransactions.slice(0, 3).map((t: any) => ({
      category: t.personal_finance_category,
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
    .select('amount, personal_finance_category, merchant_name, account_id')
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
    if (row.personal_finance_category) {
      if (Array.isArray(row.personal_finance_category)) {
        row.personal_finance_category.forEach((cat: string) => allCategories.add(cat))
      } else {
        allCategories.add(row.personal_finance_category)
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

  // Step 3: Filter transactions using AI-matched categories (exact matches only)
  const categoryTransactions = transactions.filter((t: any) => {
    if (!t.personal_finance_category) return false
    
    if (Array.isArray(t.personal_finance_category)) {
      return t.personal_finance_category.some((cat: any) => {
        const categoryName = typeof cat === 'string' ? cat : (cat.primary || cat.detailed);
        return matchedCategories.includes(categoryName);
      });
    }
    
    const categoryName = typeof t.personal_finance_category === 'string' 
      ? t.personal_finance_category 
      : (t.personal_finance_category.primary || t.personal_finance_category.detailed);
    return matchedCategories.includes(categoryName);
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

    const userProfile = (profile || {}) as any
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

    const userProfile = (profile || {}) as any
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
          let targetAccount = userAccounts[0]
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

/**
 * Process a workflow immediately for the NOW trigger, returning a detailed summary
 */
export async function processNowTriggerWorkflow(workflow: any, userId: string) {
  const supabase = await createClient();
  let triggersChecked = 0;
  let triggersMet = 0;
  let conditionsChecked = 0;
  let conditionsMet = 0;
  let actionsChecked = 0;
  let actionsExecuted = 0;
  let notificationsSent = 0;
  let triggerResults: any[] = [];

  // Get user accounts and profile
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('phone_number, full_name')
    .eq('user_id', userId)
    .single();
  const userAccounts = (accounts || []).map((acc: any) => ({
    account_id: acc.account_id,
    name: acc.name,
    official_name: acc.official_name,
    balance: acc.balances && acc.balances.length > 0 ? {
      current_balance: acc.balances[0].current_balance,
      available_balance: acc.balances[0].available_balance
    } : undefined
  }));
  const userProfile = (profile || {}) as any;

  // For each trigger in the workflow
  for (const trigger of workflow.triggers || []) {
    triggersChecked++;
    let triggerMet = false;
    let triggerType = trigger.type;
    let triggerSummary = { triggerType, met: false, conditions: [], actions: [] as any[] };

    // For NOW, always check all triggers as if they fired
    // Check criteria/conditions
    let criteriaMet = true;
    if (workflow.criteria && workflow.criteria.length > 0) {
      conditionsChecked += workflow.criteria.length;
      criteriaMet = await checkCriteriaConditions(workflow.criteria, userAccounts, userId);
      if (criteriaMet) {
        conditionsMet += workflow.criteria.length;
      }
      triggerSummary.conditions = workflow.criteria.map((c: any) => ({ type: c.conditionType, met: criteriaMet }));
    }

    // If criteria are met, "fire" the trigger
    if (criteriaMet) {
      triggerMet = true;
      triggersMet++;
      // Execute actions
      for (const action of workflow.actions || []) {
        actionsChecked++;
        // Only count as executed if it's a notify or transfer
        if (action.type === 'notify') {
          actionsExecuted++;
          // Actually send notification if possible
          if (userProfile.phone_number) {
            notificationsSent++;
            // (In real use, call sendSMS here)
            // await sendSMS(userProfile.phone_number, 'Test notification from NOW trigger');
          }
        } else if (action.type === 'transfer') {
          actionsExecuted++;
        }
        triggerSummary.actions.push({ type: action.type, executed: true });
      }
    } else {
      // Actions not executed
      for (const action of workflow.actions || []) {
        actionsChecked++;
        triggerSummary.actions.push({ type: action.type, executed: false });
      }
    }
    triggerSummary.met = triggerMet;
    triggerResults.push(triggerSummary);
  }

  return {
    triggersChecked,
    triggersMet,
    conditionsChecked,
    conditionsMet,
    actionsChecked,
    actionsExecuted,
    notificationsSent,
    triggerResults
  };
} 

function normalizeCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}