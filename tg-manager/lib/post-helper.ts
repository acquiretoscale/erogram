import { TgPostLog, TgMediaOrder, TgSettings, TgCreatorQueue } from './models';
import { listFiles } from './r2';
import { sendMessage, sendMediaGroup } from './telegram';
import {
  getOnlyFansCreatorModel,
  creatorPhotoUrls,
  erogramProfileUrl,
  type ErogramCreator,
} from './erogram-db';

type PostType = 'promo' | 'media' | 'creator';

interface PostToGroupOpts {
  group: any;
  template: any | null;
  postType: PostType;
}

type Button = { text: string; url: string };

export function resolveBotToken(group: any): string {
  return group.botToken?.trim() || process.env.TELEGRAM_BOT_TOKEN!;
}

async function pickNextFile(folder: string, groupId: string) {
  // Telegram bot uploads max ~50MB; prefer those so posts don't fail
  const MAX_TG_BYTES = 49 * 1024 * 1024;
  const allFiles = (await listFiles(folder)).filter(f => !f.key.endsWith('/.keep'));
  if (allFiles.length === 0) return null;

  const orderDoc = await TgMediaOrder.findOne({ folder }).lean();
  const savedOrder: string[] = (orderDoc as { keys?: string[] })?.keys || [];

  function orderFiles(files: typeof allFiles) {
    if (savedOrder.length === 0) return files;
    const fileMap = new Map(files.map(f => [f.key, f]));
    const sorted: typeof files = [];
    for (const key of savedOrder) {
      const f = fileMap.get(key);
      if (f) { sorted.push(f); fileMap.delete(key); }
    }
    fileMap.forEach(f => sorted.push(f));
    return sorted;
  }

  const postedLogs = await TgPostLog.find({
    groupId,
    status: 'success',
    mediaKey: { $ne: '', $exists: true },
  }).select('mediaKey').lean();
  const postedKeys = new Set(
    (postedLogs as unknown as { mediaKey: string }[])
      .map(l => l.mediaKey)
      .filter(k => k && !String(k).startsWith('creator:'))
  );

  const under = orderFiles(allFiles.filter(f => f.size <= MAX_TG_BYTES));
  const unpostedUnder = under.filter(f => !postedKeys.has(f.key));
  if (unpostedUnder.length > 0) return unpostedUnder[0];

  // No small fresh file left - try larger unposted (may fail on Telegram)
  const unpostedAny = orderFiles(allFiles).filter(f => !postedKeys.has(f.key));
  if (unpostedAny.length === 0) return null;
  return unpostedAny[0];
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function mergeButtons(auto: Button[][], fromTemplate: Button[][] | undefined): Button[][] {
  const rows: Button[][] = [];
  if (auto.length) rows.push(...auto);
  if (fromTemplate?.length) {
    for (const row of fromTemplate) {
      const clean = (row || []).filter(b => b?.text && b?.url);
      if (clean.length) rows.push(clean);
    }
  }
  return rows;
}

async function pickCreatorForGroup(group: any): Promise<{
  creator: ErogramCreator;
  source: 'queue' | 'random';
  niche: string;
} | null> {
  const niche = String(group.creatorNiche || group.tag || '').trim().toLowerCase();
  if (!niche) return null;

  const Creator = await getOnlyFansCreatorModel();

  // 1) Curated queue for this niche
  const queue = await TgCreatorQueue.findOne({ niche });
  if (queue && queue.items?.length) {
    const idx = (queue.cursor || 0) % queue.items.length;
    const item = queue.items[idx];
    const username = String(item.username || '').replace(/^@/, '').trim().toLowerCase();
    const safe = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const creator = await Creator.findOne({
      username: { $regex: `^${safe}$`, $options: 'i' },
      deleted: { $ne: true },
    }).lean() as ErogramCreator | null;

    queue.cursor = (idx + 1) % queue.items.length;
    await queue.save();

    if (creator && creatorPhotoUrls(creator).length >= 1) {
      return { creator, source: 'queue', niche };
    }
  }

  // 2) Random from Erogram DB by niche, prefer 2+ photos, skip recently posted in this group
  const recentlyPosted = await TgPostLog.find({
    groupId: group._id,
    status: 'success',
    creatorUsername: { $ne: '', $exists: true },
  })
    .sort({ postedAt: -1 })
    .limit(80)
    .select('creatorUsername')
    .lean();
  const skip = new Set(
    (recentlyPosted as { creatorUsername?: string }[])
      .map(l => (l.creatorUsername || '').toLowerCase())
      .filter(Boolean)
  );

  const candidates = await Creator.find({
    categories: niche,
    deleted: { $ne: true },
    avatar: { $nin: ['', null] },
    $or: [
      { 'extraPhotos.0': { $exists: true } },
      { header: { $nin: ['', null] } },
    ],
  })
    .select('name username slug categories avatar header extraPhotos instagramUrl instagramUsername twitterUrl')
    .limit(120)
    .lean() as ErogramCreator[];

  const fresh = candidates.filter(c => !skip.has(String(c.username || '').toLowerCase()));
  const pool = fresh.length > 0 ? fresh : candidates;
  if (pool.length === 0) return null;

  const creator = pool[Math.floor(Math.random() * pool.length)];
  return { creator, source: 'random', niche };
}

async function postCreatorToGroup(group: any, template: any | null) {
  const pick = await pickCreatorForGroup(group);
  if (!pick) {
    return {
      group: group.name,
      status: 'skipped' as const,
      reason: !String(group.creatorNiche || group.tag || '').trim()
        ? 'no creator niche on group'
        : 'no eligible creators for niche',
    };
  }

  const { creator, niche } = pick;
  const photos = creatorPhotoUrls(creator, 8);
  if (photos.length === 0) {
    return { group: group.name, status: 'skipped' as const, reason: `no photos for @${creator.username}` };
  }

  const profileUrl = erogramProfileUrl(creator.username);
  const vars = {
    name: creator.name || creator.username,
    username: creator.username,
    erogram_url: profileUrl,
    niche,
  };

  const caption = template?.text
    ? fillTemplate(template.text, vars)
    : `<b>${vars.name}</b>\n@${vars.username}`;

  const autoRows: Button[][] = [[{ text: 'View on Erogram', url: profileUrl }]];
  if (creator.instagramUrl) {
    autoRows.push([{ text: 'Instagram', url: creator.instagramUrl }]);
  } else if (creator.instagramUsername) {
    autoRows.push([{
      text: 'Instagram',
      url: `https://instagram.com/${String(creator.instagramUsername).replace(/^@/, '')}`,
    }]);
  }
  if (creator.twitterUrl) {
    autoRows.push([{ text: 'X / Twitter', url: creator.twitterUrl }]);
  }

  const buttons = mergeButtons(autoRows, template?.buttons);
  const botToken = resolveBotToken(group);
  const parseMode = template?.parseMode || 'HTML';

  if (photos.length === 1) {
    await sendMessage({
      chatId: group.channelId,
      text: caption,
      parseMode,
      buttons,
      photoUrl: photos[0],
      botToken,
    });
  } else {
    await sendMediaGroup({
      chatId: group.channelId,
      photos: photos.map((url, i) => ({
        url,
        caption: i === 0 ? caption : undefined,
        parseMode,
      })),
      botToken,
    });
    if (buttons.length > 0) {
      await sendMessage({
        chatId: group.channelId,
        text: `🔗 <b>${vars.name}</b>`,
        parseMode: 'HTML',
        buttons,
        botToken,
      });
    }
  }

  await TgPostLog.create({
    groupId: group._id,
    groupName: group.name,
    templateId: template?._id || null,
    mediaKey: `creator:${creator.username}`,
    mediaUrl: photos[0] || '',
    mediaFolder: niche,
    creatorUsername: creator.username,
    postType: 'creator',
    status: 'success',
  });

  return {
    group: group.name,
    status: 'success' as const,
    mediaKey: `creator:${creator.username}`,
    creatorUsername: creator.username,
    photoCount: photos.length,
  };
}

export async function postToGroup({ group, template, postType }: PostToGroupOpts) {
  if (postType === 'creator') {
    return postCreatorToGroup(group, template);
  }

  let mediaUrl: string | undefined;
  let mediaKey: string | undefined;
  let isVideo = false;

  if (postType === 'promo' && template?.mediaFolder) {
    const folder = template.mediaFolder;
    const files = (await listFiles(folder)).filter(f => !f.key.endsWith('/.keep'));
    if (files.length > 0) {
      const pick = files[Math.floor(Math.random() * files.length)];
      mediaUrl = pick.url;
      mediaKey = pick.key;
      isVideo = /\.(mp4|webm|mov|gif)$/i.test(pick.key);
    }
  } else if (postType === 'promo' && template?.mediaUrl) {
    mediaUrl = template.mediaUrl;
    isVideo = template.mediaType === 'video';
  } else if (postType === 'media') {
    if (!group.mediaFolder) {
      return { group: group.name, status: 'skipped' as const, reason: 'no media folder assigned' };
    }
    const pick = await pickNextFile(group.mediaFolder, group._id.toString());
    if (!pick) {
      return { group: group.name, status: 'skipped' as const, reason: `no fresh unposted files in ${group.mediaFolder}/` };
    }
    mediaUrl = pick.url;
    mediaKey = pick.key;
    isVideo = /\.(mp4|webm|mov|gif)$/i.test(pick.key);
  }

  // For promo with no template text/media, also skip gracefully
  if (postType === 'promo' && !mediaUrl && !template?.text) {
    return { group: group.name, status: 'skipped' as const, reason: 'template has no text and no media' };
  }

  let caption = template?.text || '';
  let buttons = template?.buttons || [];
  let ctaVariant = '';

  if (postType === 'media' && mediaKey) {
    try {
      const ctaDoc = await TgSettings.findOne({ key: 'cta' }).lean();
      if (ctaDoc && (ctaDoc as any).enabled) {
        const cta = (ctaDoc as any).data || {};
        const freq = cta.frequency || 3;
        const postCount = await TgPostLog.countDocuments({
          groupId: group._id,
          status: 'success',
          mediaKey: { $ne: '', $exists: true },
        });
        if ((postCount + 1) % freq === 0) {
          const variants: any[] = cta.variants || [];
          if (variants.length > 0) {
            const pick = variants[Math.floor(Math.random() * variants.length)];
            caption = pick.caption || '';
            buttons = pick.buttons || [];
            ctaVariant = pick.name || 'A';
          } else if (cta.caption || cta.buttons) {
            caption = cta.caption || '';
            buttons = cta.buttons || [];
            ctaVariant = 'A';
          }
        }
      }
    } catch { /* CTA is optional - don't break posting */ }
  }

  // Telegram rejects empty text/url buttons
  buttons = (buttons || [])
    .map((row: any[]) => (row || []).filter((b: any) => b?.text?.trim() && b?.url?.trim()))
    .filter((row: any[]) => row.length > 0);

  await sendMessage({
    chatId: group.channelId,
    text: caption,
    parseMode: template?.parseMode || 'HTML',
    buttons,
    photoUrl: mediaUrl && !isVideo ? mediaUrl : undefined,
    videoUrl: mediaUrl && isVideo ? mediaUrl : undefined,
    botToken: resolveBotToken(group),
  });

  const folder = mediaKey ? mediaKey.split('/').slice(-2, -1)[0] || '' : '';
  await TgPostLog.create({
    groupId: group._id,
    groupName: group.name,
    templateId: template?._id || null,
    mediaKey: mediaKey || '',
    mediaUrl: mediaUrl || '',
    mediaFolder: folder,
    ctaVariant,
    postType,
    status: 'success',
  });

  return { group: group.name, status: 'success' as const, mediaKey };
}

/** Peek next creator for a niche without advancing the queue cursor. */
export async function peekNextCreator(nicheRaw: string): Promise<{
  niche: string;
  source: 'queue' | 'random' | 'empty';
  username?: string;
  name?: string;
  photoCount?: number;
  queueRemaining?: number;
  queueTotal?: number;
} | null> {
  const niche = String(nicheRaw || '').trim().toLowerCase();
  if (!niche) return null;

  const queue = await TgCreatorQueue.findOne({ niche }).lean() as any;
  if (queue?.items?.length) {
    const idx = (queue.cursor || 0) % queue.items.length;
    const item = queue.items[idx];
    return {
      niche,
      source: 'queue',
      username: item.username,
      name: item.name || item.username,
      queueTotal: queue.items.length,
      queueRemaining: queue.items.length - idx,
    };
  }

  try {
    const Creator = await getOnlyFansCreatorModel();
    const count = await Creator.countDocuments({
      categories: niche,
      deleted: { $ne: true },
      avatar: { $nin: ['', null] },
      $or: [
        { 'extraPhotos.0': { $exists: true } },
        { header: { $nin: ['', null] } },
      ],
    });
    if (count === 0) return { niche, source: 'empty' };
    return { niche, source: 'random', queueTotal: count };
  } catch {
    return { niche, source: 'empty' };
  }
}
