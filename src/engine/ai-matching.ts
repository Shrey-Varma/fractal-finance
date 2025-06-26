/**
 * Use ChatGPT to intelligently match user category requests with actual transaction categories
 */
export async function findMatchingCategories(
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
export async function findMatchingMerchants(
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