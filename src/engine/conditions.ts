import { createClient } from '@/utils/supabase/server'
import { findMatchingCategories, findMatchingMerchants } from './ai-matching'
import { parseTimeWindow } from './utils'
import type { AutomationRule, UserAccount } from './types'

/**
 * Check if a balance threshold trigger condition is met
 */
export async function checkBalanceThreshold(
  threshold: any,
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