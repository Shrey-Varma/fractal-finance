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