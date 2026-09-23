const DEFAULT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const apiBase = (token: string) => `https://api.telegram.org/bot${token}`;

type Button = { text: string; url: string };
type ButtonRow = Button[];

interface SendOptions {
  chatId: string;
  text?: string;
  parseMode?: string;
  buttons?: ButtonRow[];
  photoUrl?: string;
  videoUrl?: string;
  disableNotification?: boolean;
  botToken?: string; // optional per-channel override
}

interface MediaGroupPhoto {
  url: string;
  caption?: string;
  parseMode?: string;
}

async function callTelegram(method: string, body: Record<string, any>, token?: string) {
  const base = apiBase(token || DEFAULT_TOKEN());
  const res = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method}: ${data.description || 'Unknown error'}`);
  }
  return data.result;
}

function buildReplyMarkup(buttons?: ButtonRow[]) {
  if (!buttons || buttons.length === 0) return undefined;
  return { inline_keyboard: buttons.map(row => row.map(btn => ({ text: btn.text, url: btn.url }))) };
}

async function sendVideoWithUrlOrUpload(opts: SendOptions, replyMarkup: any) {
  const t = opts.botToken;
  const base = apiBase(t || DEFAULT_TOKEN());

  // First try by URL (fast path)
  try {
    return await callTelegram('sendVideo', {
      chat_id: opts.chatId,
      video: opts.videoUrl,
      caption: opts.text || '',
      parse_mode: opts.parseMode || 'HTML',
      reply_markup: replyMarkup,
      disable_notification: opts.disableNotification || false,
    }, t);
  } catch (err: any) {
    const msg = String(err?.message || '');
    const retriable = [
      'wrong type of the web page content',
      'failed to get HTTP URL content',
      'Wrong file identifier/HTTP URL specified',
    ];
    if (!retriable.some(r => msg.includes(r))) {
      throw err;
    }
  }

  // Fallback: download from R2 and upload as file to Telegram
  if (!opts.videoUrl) {
    throw new Error('Missing videoUrl for upload fallback');
  }

  const fileRes = await fetch(opts.videoUrl);
  if (!fileRes.ok) {
    throw new Error(`Fetch video failed: ${fileRes.status} ${fileRes.statusText}`);
  }

  const blob = await fileRes.blob();
  const form = new FormData();
  form.append('chat_id', opts.chatId);
  form.append('video', blob, 'video.mp4');
  if (opts.text) form.append('caption', opts.text);
  if (opts.parseMode) form.append('parse_mode', opts.parseMode);
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
  if (opts.disableNotification) form.append('disable_notification', 'true');

  const res = await fetch(`${base}/sendVideo`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram sendVideo (upload): ${data.description || 'Unknown error'}`);
  }
  return data.result;
}

async function sendPhotoWithUrlOrUpload(opts: SendOptions, replyMarkup: any) {
  const t = opts.botToken;
  const base = apiBase(t || DEFAULT_TOKEN());

  try {
    return await callTelegram('sendPhoto', {
      chat_id: opts.chatId,
      photo: opts.photoUrl,
      caption: opts.text || '',
      parse_mode: opts.parseMode || 'HTML',
      reply_markup: replyMarkup,
      disable_notification: opts.disableNotification || false,
    }, t);
  } catch (err: any) {
    const msg = String(err?.message || '');
    const retriable = [
      'wrong type of the web page content',
      'failed to get HTTP URL content',
      'Wrong file identifier/HTTP URL specified',
      'wrong file_id or you are trying to use a file_id',
    ];
    if (!retriable.some(r => msg.includes(r))) {
      throw err;
    }
  }

  if (!opts.photoUrl) {
    throw new Error('Missing photoUrl for upload fallback');
  }

  const fileRes = await fetch(opts.photoUrl);
  if (!fileRes.ok) {
    throw new Error(`Fetch photo failed: ${fileRes.status} ${fileRes.statusText}`);
  }

  const blob = await fileRes.blob();
  const form = new FormData();
  form.append('chat_id', opts.chatId);
  form.append('photo', blob, 'photo.jpg');
  if (opts.text) form.append('caption', opts.text);
  if (opts.parseMode) form.append('parse_mode', opts.parseMode);
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
  if (opts.disableNotification) form.append('disable_notification', 'true');

  const res = await fetch(`${base}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram sendPhoto (upload): ${data.description || 'Unknown error'}`);
  }
  return data.result;
}

export async function sendMessage(opts: SendOptions) {
  const replyMarkup = buildReplyMarkup(opts.buttons);
  const t = opts.botToken;

  if (opts.photoUrl) {
    return sendPhotoWithUrlOrUpload(opts, replyMarkup);
  }

  if (opts.videoUrl) {
    return sendVideoWithUrlOrUpload(opts, replyMarkup);
  }

  return callTelegram('sendMessage', {
    chat_id: opts.chatId,
    text: opts.text || '',
    parse_mode: opts.parseMode || 'HTML',
    reply_markup: replyMarkup,
    disable_notification: opts.disableNotification || false,
  }, t);
}

/**
 * Send 2–10 photos as a Telegram album.
 * Note: albums cannot carry inline buttons — send those in a follow-up message.
 */
export async function sendMediaGroup(opts: {
  chatId: string;
  photos: MediaGroupPhoto[];
  disableNotification?: boolean;
  botToken?: string;
}) {
  if (!opts.photos.length) {
    throw new Error('sendMediaGroup requires at least 1 photo');
  }
  const media = opts.photos.slice(0, 10).map((p, i) => {
    const item: Record<string, any> = {
      type: 'photo',
      media: p.url,
    };
    if (i === 0 && p.caption) {
      item.caption = p.caption;
      item.parse_mode = p.parseMode || 'HTML';
    }
    return item;
  });

  return callTelegram('sendMediaGroup', {
    chat_id: opts.chatId,
    media,
    disable_notification: opts.disableNotification || false,
  }, opts.botToken);
}

export async function getMe(token?: string) {
  return callTelegram('getMe', {}, token);
}

export async function getChatMemberCount(chatId: string, token?: string): Promise<number> {
  return callTelegram('getChatMemberCount', { chat_id: chatId }, token);
}

export async function getChat(chatId: string, token?: string): Promise<any> {
  return callTelegram('getChat', { chat_id: chatId }, token);
}

export async function getChatAdministrators(chatId: string, token?: string): Promise<any[]> {
  return callTelegram('getChatAdministrators', { chat_id: chatId }, token);
}

export async function checkBotIsAdmin(chatId: string, token?: string): Promise<boolean> {
  try {
    const me = await getMe(token);
    const admins: any[] = await getChatAdministrators(chatId, token);
    const botEntry = admins.find(a => a.user?.id === me.id);
    if (!botEntry) return false;
    return botEntry.can_post_messages !== false;
  } catch {
    return false;
  }
}
