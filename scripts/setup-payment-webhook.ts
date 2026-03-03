/**
 * One-time script to register the Telegram Bot webhook for payment processing.
 *
 * Usage:
 *   npx tsx scripts/setup-payment-webhook.ts
 *
 * This tells Telegram to send payment events (pre_checkout_query, successful_payment)
 * to https://erogram.pro/api/payments/webhook
 *
 * You only need to run this once (or again if you change the domain).
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8441115133:AAFN2d6HLxcRHkrNXF3uZ1J31ZKzwBIVbNQ';
const WEBHOOK_URL = 'https://erogram.pro/api/payments/webhook';

async function main() {
  console.log('Setting up Telegram webhook for payments...');
  console.log(`Bot token: ${BOT_TOKEN.substring(0, 10)}...`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);

  // First check current webhook
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log('\nCurrent webhook info:', JSON.stringify(info.result, null, 2));

  // Set new webhook (allowed_updates includes message for successful_payment and pre_checkout_query)
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'pre_checkout_query'],
    }),
  });

  const data = await res.json();
  console.log('\nsetWebhook response:', JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log('\nWebhook set successfully! Telegram Stars payments are now active.');
    console.log('Users can purchase premium via the upgrade modal in the app.');
  } else {
    console.error('\nFailed to set webhook. Check your bot token and ensure the domain has a valid SSL certificate.');
  }

  // Verify
  const verifyRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const verify = await verifyRes.json();
  console.log('\nUpdated webhook info:', JSON.stringify(verify.result, null, 2));
}

main().catch(console.error);
