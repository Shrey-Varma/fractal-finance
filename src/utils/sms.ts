import { Vonage } from '@vonage/server-sdk'
import { Auth } from '@vonage/auth'

export async function sendSMS(to: string, text: string) {
    console.log('🔧 [SMS] Initializing Vonage SDK...')
    console.log('🔧 [SMS] API Key:', process.env.VONAGE_API_KEY ? '***' + process.env.VONAGE_API_KEY.slice(-4) : 'NOT SET')
    console.log('🔧 [SMS] API Secret:', process.env.VONAGE_API_SECRET ? '***' + process.env.VONAGE_API_SECRET.slice(-4) : 'NOT SET')
    
    // Fallback to hardcoded values if env vars not available (for debugging)
    const apiKey = process.env.VONAGE_API_KEY || 'd8902848'
    const apiSecret = process.env.VONAGE_API_SECRET || '71v6DufPxdc8TwU7'
    
    console.log('🔧 [SMS] Using API Key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT SET')
    console.log('🔧 [SMS] Using API Secret:', apiSecret ? '***' + apiSecret.slice(-4) : 'NOT SET')
    
    const vonage = new Vonage(new Auth({
        apiKey: apiKey,
        apiSecret: apiSecret
    }))

    const from = "12044805360"
    
    console.log('📤 [SMS] Preparing to send SMS...')
    console.log('📤 [SMS] From number:', from)
    console.log('📤 [SMS] To number:', to)
    console.log('📤 [SMS] Message length:', text.length, 'characters')
    console.log('📤 [SMS] Message preview:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))

    try {
        console.log('🚀 [SMS] Calling Vonage SMS API...')
        const response = await vonage.sms.send({to, from, text})
        
        console.log('✅ [SMS] API call successful!')
        console.log('✅ [SMS] Response:', JSON.stringify(response, null, 2))
        
        return response
    } catch (err: any) {
        console.log('❌ [SMS] API call failed!')
        console.log('❌ [SMS] Error details:', err.message || err)
        console.log('❌ [SMS] Error type:', err.constructor.name)
        
        // Check if it's a partial failure with response data
        if (err.response && err.response.messages) {
            console.log('🔍 [SMS] Checking individual message statuses...')
            const messages = err.response.messages
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i]
                console.log(`📱 [SMS] Message ${i + 1}:`)
                console.log(`📱 [SMS]   Status: ${msg.status}`)
                console.log(`📱 [SMS]   Message ID: ${msg['message-id'] || msg.messageId}`)
                
                // Status "0" means success in Vonage
                if (msg.status === "0") {
                    console.log('✅ [SMS] Message sent successfully despite partial failure error!')
                    console.log('✅ [SMS] Remaining balance:', msg['remaining-balance'] || msg.remainingBalance)
                    return err.response // Return the response since message was actually sent
                } else {
                    console.log('❌ [SMS] Message failed with status:', msg.status)
                    if (msg['error-text']) {
                        console.log('❌ [SMS] Error text:', msg['error-text'])
                    }
                }
            }
        }
        
        if (err.response) {
            console.log('❌ [SMS] HTTP Response Status:', err.response.status)
            console.log('❌ [SMS] HTTP Response Data:', JSON.stringify(err.response.data, null, 2))
        }
        
        throw err
    }
}

// sendSMS('16134134530', 'Test message from Fractal - Balance threshold trigger system is working!')
