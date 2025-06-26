import { sendSMS } from '../utils/sms'
import type { AutomationRule, UserProfile, UserAccount } from './types'

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