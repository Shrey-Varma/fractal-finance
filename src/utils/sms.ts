import { Vonage } from '@vonage/server-sdk'
import { Auth } from '@vonage/auth'

export async function sendSMS(to: string, text: string) {
    const vonage = new Vonage(new Auth({
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET
    }))

    const from = "12044805360"

    await vonage.sms.send({to, from, text})
        .then((resp: any) => { console.log('Message sent successfully'); console.log(resp); })
        .catch((err: any) => { console.log('There was an error sending the messages.'); console.error(err); });
}
