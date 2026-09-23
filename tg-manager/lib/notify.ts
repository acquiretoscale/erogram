const OWNER_CHAT_ID = process.env.ALERT_CHAT_ID || '';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

export async function notifyOwner(message: string) {
  const chatId = OWNER_CHAT_ID;
  const token = getBotToken();
  if (!chatId || !token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
  } catch {
    console.error('Failed to send alert notification');
  }
}

export async function notifyPostErrors(results: { schedule: string; group: string; error: string }[]) {
  if (results.length === 0) return;

  const lines = results.slice(0, 10).map(
    r => `• <b>${r.group}</b> (${r.schedule}): ${r.error}`
  );
  if (results.length > 10) lines.push(`...and ${results.length - 10} more`);

  const msg = `⚠️ <b>TGempire Post Errors</b>\n\n${lines.join('\n')}`;
  await notifyOwner(msg);
}

export async function notifyQueueEmpty(folders: string[]) {
  if (folders.length === 0) return;
  const list = folders.map(f => `• <b>${f}/</b>`).join('\n');
  const msg = `📭 <b>Queue Empty</b>\n\nThese folders have no unposted content:\n${list}\n\nArchive files will be reused until you import new media.`;
  await notifyOwner(msg);
}
