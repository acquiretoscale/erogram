import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8441115133:AAFN2d6HLxcRHkrNXF3uZ1J31ZKzwBIVbNQ';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@erogrampro';

function escapeHTML(text: string = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCategoryEmoji(category: string) {
  const categoryEmojis: { [key: string]: string } = {
    'Technology': '💻',
    'Gaming': '🎮',
    'Crypto': '₿',
    'Business': '💼',
    'Education': '📚',
    'Entertainment': '🎭',
    'News': '📰',
    'Sports': '⚽',
    'Health': '🏥',
    'Travel': '✈️',
    'Food': '🍕',
    'Music': '🎵',
    'Art': '🎨',
    'Photography': '📸',
    'Fashion': '👗',
    'Beauty': '💄',
    'Fitness': '💪',
    'Lifestyle': '🌟',
    'Finance': '💰',
    'Real Estate': '🏠',
  };
  return categoryEmojis[category] || '📂';
}

function getCountryEmoji(country: string) {
  const countryEmojis: { [key: string]: string } = {
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Russia': '🇷🇺',
    'Mexico': '🇲🇽',
    'Netherlands': '🇳🇱',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Finland': '🇫🇮',
    'Denmark': '🇩🇰',
    'Switzerland': '🇨🇭',
  };
  return countryEmojis[country] || '🌍';
}

async function sendNewGroupTelegramNotification(group: any = {}, sendToPlus: boolean = true) {
  // Get environment variables at runtime to ensure they're available
  const botToken = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
  let channelId = process.env.TELEGRAM_CHANNEL_ID || CHANNEL_ID;

  if (!botToken || !channelId) {
    console.error('[Telegram Notification] Missing configuration:', {
      hasBotToken: !!botToken,
      hasChannelId: !!channelId,
      botTokenLength: botToken?.length || 0,
      channelId: channelId
    });
    return { success: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID' };
  }

  // Normalize channel ID - ensure numeric IDs are strings, remove any whitespace
  channelId = String(channelId).trim();

  // Validate channel ID format (supports @channelname or numeric IDs like -1001234567890)
  const isValidChannelId = channelId.startsWith('@') || /^-?\d+$/.test(channelId);
  if (!isValidChannelId) {
    console.error('[Telegram Notification] Invalid channel ID format:', channelId);
    console.error('[Telegram Notification] Channel ID should be @channelname or numeric ID like -1001234567890');
    return { success: false, error: 'Invalid channel ID format' };
  }

  console.log('[Telegram Notification] Attempting to send notification for group:', group.name || 'Unknown');
  console.log('[Telegram Notification] Configuration:', {
    hasBotToken: !!botToken,
    channelId: channelId,
    channelIdType: channelId.startsWith('@') ? 'username' : 'numeric',
    botTokenPrefix: botToken.substring(0, 10) + '...'
  });

  const name = escapeHTML(group.name || 'Unnamed Group');
  const category = escapeHTML(group.category || 'Unknown');
  const country = escapeHTML(group.country || 'Unknown');
  const description = escapeHTML(group.description || 'No description provided');
  const slug = group.slug || '';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  const isDevelopment = siteUrl.includes('localhost') || siteUrl.startsWith('http://');

  // Use production URL for buttons since Telegram requires HTTPS
  const productionUrl = 'https://erogram.pro';
  const url = isDevelopment
    ? `${productionUrl}/${slug}/?utm_source=telegram&utm_medium=button&utm_campaign=group_notification`
    : `${siteUrl}/${slug}/?utm_source=telegram&utm_medium=button&utm_campaign=group_notification`;

  const browseUrl = isDevelopment
    ? `${productionUrl}/?utm_source=telegram&utm_medium=button&utm_campaign=see_all_groups`
    : `${siteUrl}/?utm_source=telegram&utm_medium=button&utm_campaign=see_all_groups`;

  // Use production URL for image since Telegram needs publicly accessible HTTPS URLs
  // In development, localhost URLs won't be accessible to Telegram
  const imageUrl = isDevelopment ? productionUrl : siteUrl;

  // Handle different image formats:
  // - Data URIs (data:image/...) - convert to Buffer and upload via multipart/form-data
  // - Full URLs (https://...) can be used directly
  // - Relative paths (/path/to/image.jpg) need to be prefixed with site URL
  let photoUrl: string | null = null;
  let photoBuffer: Buffer | null = null;
  let useMultipartUpload = false;

  // Debug: Log what image we received
  console.log(`[Telegram Notification] Group image value: ${group.image ? (group.image.substring(0, 50) + (group.image.length > 50 ? '...' : '')) : 'null'} (length: ${group.image?.length || 0}, isPlaceholder: ${group.image === '/assets/image.jpg'})`);

  if (!group.image || group.image === '/assets/image.jpg') {
    // If image is placeholder or missing, use default
    photoUrl = `${imageUrl}/assets/image.jpg`;
    console.log(`[Telegram Notification] Using default placeholder image`);
  } else if (group.image.startsWith('data:image/')) {
    // Data URI - convert to Buffer for multipart upload
    try {
      const base64Data = group.image.split(',')[1];
      photoBuffer = Buffer.from(base64Data, 'base64');
      useMultipartUpload = true;
      console.log('[Telegram Notification] Converting data URI to Buffer for upload');
    } catch {
      console.warn('[Telegram Notification] Failed to convert data URI, using default image instead');
      photoUrl = `${imageUrl}/assets/image.jpg`;
    }
  } else if (group.image.startsWith('http://') || group.image.startsWith('https://')) {
    // Already a full URL
    photoUrl = group.image;
  } else {
    // Relative path (with or without leading slash)
    // Try to read from filesystem first
    try {
      const publicDir = path.join(process.cwd(), 'public');
      // Remove leading slash for path.join if present, or just let path.join handle it (it handles absolute paths by restarting, so we should be careful)
      // Actually path.join('/foo', '/bar') -> '/bar'. We want 'public/bar'.
      // So we should strip leading slash from group.image if we want to join with publicDir.
      const imagePath = group.image.startsWith('/') ? group.image.substring(1) : group.image;
      const filePath = path.join(publicDir, imagePath);

      if (fs.existsSync(filePath)) {
        photoBuffer = fs.readFileSync(filePath);
        useMultipartUpload = true;
        console.log('[Telegram Notification] Read image from filesystem:', filePath);
      } else {
        // Fallback to URL if file not found locally
        const prefix = group.image.startsWith('/') ? '' : '/';
        photoUrl = `${imageUrl}${prefix}${group.image}`;
      }
    } catch (err) {
      console.warn('[Telegram Notification] Failed to read file from filesystem:', err);
      const prefix = group.image.startsWith('/') ? '' : '/';
      photoUrl = `${imageUrl}${prefix}${group.image}`;
    }
  }

  // Ensure photoUrl is HTTPS and publicly accessible (only if using URL)
  if (photoUrl && !useMultipartUpload) {
    if (!photoUrl.startsWith('https://')) {
      // If it's HTTP, try to convert to HTTPS
      if (photoUrl.startsWith('http://')) {
        photoUrl = photoUrl.replace('http://', 'https://');
      } else {
        // If no protocol, assume HTTPS
        photoUrl = `https://${photoUrl.replace(/^https?:\/\//, '')}`;
      }
    }
  }

  const getMessageStyle = () => {
    const styles = [
      `🎉 <b>NEW GROUP DISCOVERED!</b> 🎉`,
      `✨ <b>FRESH GROUP ALERT!</b> ✨`,
      `🚀 <b>HOT NEW GROUP!</b> 🚀`,
      `🔥 <b>AMAZING GROUP FOUND!</b> 🔥`,
      `💎 <b>GEM OF A GROUP!</b> 💎`,
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const truncateDescription = (desc: string, maxLength: number = 200) => {
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength - 3) + '...';
  };

  const getCallToAction = () => {
    const actions = [
      `✨ <i>Join thousands of users discovering amazing Telegram groups on Erogram!</i> ✨`,
      `🌟 <i>Don't miss out on this incredible Telegram community!</i> 🌟`,
      `🚀 <i>Be part of the growing Erogram community!</i> 🚀`,
      `💫 <i>Discover more amazing groups like this on Erogram!</i> 💫`,
      `🎯 <i>Find your perfect Telegram community on Erogram!</i> 🎯`,
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  };

  const getButtonStyle = () => {
    const styles = [
      { join: '🚀 Join This Group', browse: '🔍 Browse All Groups' },
      { join: '✨ Join Now', browse: '🔍 Explore Groups' },
      { join: '🔥 Join Group', browse: '📋 All Groups' },
      { join: '💎 Join This Group', browse: '🌐 Browse Groups' },
      { join: '🎯 Join Today', browse: '🗂️ View Groups' },
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const caption = `${getMessageStyle()}

🔥 <b>${name}</b> 🔥

${getCategoryEmoji(category)} <b>Category:</b> ${category}
${getCountryEmoji(country)} <b>Location:</b> ${country}

📝 <b>About this group:</b>
${truncateDescription(description)}

${getCallToAction()}

#${category.toLowerCase().replace(/\s+/g, '')} #TelegramGroups #Erogram`;

  const buttonStyle = getButtonStyle();

  // Telegram requires HTTPS URLs for inline keyboard buttons
  // Ensure URLs are valid HTTPS
  const validateUrl = (urlString: string): string | null => {
    try {
      const url = new URL(urlString);
      // Telegram only accepts HTTPS for inline keyboard buttons
      if (url.protocol === 'https:') {
        return urlString;
      }
      return null;
    } catch {
      return null;
    }
  };

  const validJoinUrl = validateUrl(url);
  const validBrowseUrl = validateUrl(browseUrl);

  // Build inline keyboard only if we have valid HTTPS URLs
  const replyMarkup: any = { inline_keyboard: [] };

  if (validJoinUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.join, url: validJoinUrl }]);
  }

  if (validBrowseUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.browse, url: validBrowseUrl }]);
  }

  // Prepare request payload
  let requestPayload: any;
  let axiosConfig: any = {};

  if (useMultipartUpload && photoBuffer) {
    // Use multipart/form-data for data URI uploads
    // Create FormData manually for axios
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('chat_id', channelId);
    formData.append('photo', photoBuffer, {
      filename: 'group-image.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('caption', caption.trim());
    formData.append('parse_mode', 'HTML');

    if (replyMarkup.inline_keyboard.length > 0) {
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }

    requestPayload = formData;
    axiosConfig = {
      headers: formData.getHeaders()
    };

    console.log('[Telegram Notification] Uploading image via multipart/form-data (from data URI)');
  }

  if (!useMultipartUpload) {
    // Use URL-based upload
    requestPayload = {
      chat_id: channelId,
      photo: photoUrl,
      caption: caption.trim(),
      parse_mode: 'HTML',
    };

    console.log('[Telegram Notification] Using photo URL:', photoUrl);

    // Only add reply_markup if we have valid buttons
    if (replyMarkup.inline_keyboard.length > 0) {
      requestPayload.reply_markup = replyMarkup;
    } else {
      console.warn('[Telegram Notification] No valid HTTPS URLs for inline buttons - sending message without buttons');
    }
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, requestPayload, axiosConfig);

    console.log('[Telegram Notification] ✅ Successfully sent notification for group:', name);

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send to Plus channel with direct link (only if sendToPlus is true)
    if (sendToPlus) {
      try {
        const plusBotToken = process.env.EROGRAM_PLUS_TOKEN;
        const plusChannelId = process.env.EROGRAM_PLUS_CHANNEL_ID;

        if (!plusBotToken || !plusChannelId) {
          console.warn('[Telegram Notification] Plus channel config missing');
        } else {
          // Normalize plusChannelId
          let plusChannelIdStr = String(plusChannelId).trim();

          // Validate
          const isValidPlusChannelId = plusChannelIdStr.startsWith('@') || /^-?\d+$/.test(plusChannelIdStr);
          if (!isValidPlusChannelId) {
            console.error('[Telegram Notification] Invalid Plus channel ID format:', plusChannelIdStr);
          } else {
            // For Plus, use direct link
            const directUrl = group.telegramLink;

            if (!directUrl) {
              console.warn('[Telegram Notification] No telegramLink for Plus notification');
            } else {
              // Build payload similar but with directUrl
              const validDirectUrl = validateUrl(directUrl);

              const replyMarkupPlus: any = { inline_keyboard: [] };

              if (validDirectUrl) {
                replyMarkupPlus.inline_keyboard.push([{ text: buttonStyle.join, url: validDirectUrl }]);
              }

              if (validBrowseUrl) {
                replyMarkupPlus.inline_keyboard.push([{ text: buttonStyle.browse, url: validBrowseUrl }]);
              }

              let requestPayloadPlus: any;
              let axiosConfigPlus: any = {};

              if (useMultipartUpload && photoBuffer) {
                const FormData = require('form-data');
                const formDataPlus = new FormData();

                formDataPlus.append('chat_id', plusChannelIdStr);
                formDataPlus.append('photo', photoBuffer, {
                  filename: 'group-image.jpg',
                  contentType: 'image/jpeg'
                });
                formDataPlus.append('caption', caption.trim());
                formDataPlus.append('parse_mode', 'HTML');

                if (replyMarkupPlus.inline_keyboard.length > 0) {
                  formDataPlus.append('reply_markup', JSON.stringify(replyMarkupPlus));
                }

                requestPayloadPlus = formDataPlus;
                axiosConfigPlus = {
                  headers: formDataPlus.getHeaders()
                };
              } else {
                requestPayloadPlus = {
                  chat_id: plusChannelIdStr,
                  photo: photoUrl,
                  caption: caption.trim(),
                  parse_mode: 'HTML',
                };

                if (replyMarkupPlus.inline_keyboard.length > 0) {
                  requestPayloadPlus.reply_markup = replyMarkupPlus;
                }
              }

              const plusResponse = await axios.post(`https://api.telegram.org/bot${plusBotToken}/sendPhoto`, requestPayloadPlus, axiosConfigPlus);

              console.log('[Telegram Notification] ✅ Successfully sent Plus notification for group:', name);
            }
          }
        }
      } catch (plusErr: any) {
        console.error('[Telegram Notification] ❌ Error sending Plus notification:', plusErr.message);
      }
    }

    return { success: true, messageId: response.data?.result?.message_id };
  } catch (err: any) {
    // If it failed and we were using a custom image, try with default image
    // This handles cases where the image URL is not accessible to Telegram (400 Bad Request)
    if (err.response?.status === 400 && photoUrl !== `${imageUrl}/assets/image.jpg` && !useMultipartUpload) {
      console.warn('[Telegram Notification] Failed with custom image, retrying with default image...');
      try {
        const defaultPayload = {
          chat_id: channelId,
          photo: `${imageUrl}/assets/image.jpg`,
          caption: caption.trim(),
          parse_mode: 'HTML',
        };

        if (replyMarkup.inline_keyboard.length > 0) {
          (defaultPayload as any).reply_markup = replyMarkup;
        }

        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, defaultPayload);
        console.log('[Telegram Notification] ✅ Successfully sent notification with default image');
        return { success: true, messageId: response.data?.result?.message_id };
      } catch (retryErr: any) {
        console.error('[Telegram Notification] Retry with default image failed:', retryErr.message);
      }
    }

    const errorDetails = {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      url: err.config?.url
    };

    console.error('[Telegram Notification] ❌ Error sending notification:', errorDetails);

    // Provide helpful error messages
    if (err.response?.status === 401) {
      console.error('[Telegram Notification] Bot token is invalid or expired');
    } else if (err.response?.status === 403) {
      console.error('[Telegram Notification] Bot does not have permission to post to channel');
      console.error('[Telegram Notification] Make sure the bot is added as an admin to the channel');
    } else if (err.response?.status === 400) {
      if (err.response?.data?.description?.includes('remote file identifier')) {
        console.error('[Telegram Notification] Image URL is not accessible to Telegram');
        console.error('[Telegram Notification] Make sure the image URL is publicly accessible via HTTPS');
        console.error('[Telegram Notification] Photo URL used:', photoUrl || 'N/A (multipart upload)');
      } else {
        console.error('[Telegram Notification] Invalid request - check channel ID format');
        console.error('[Telegram Notification] Channel ID should be @channelname or -1001234567890 (numeric)');
      }
    }

    return {
      success: false,
      error: err.message,
      details: errorDetails
    };
  }
}

async function sendNewBotTelegramNotification(bot: any = {}) {
  // Get environment variables at runtime to ensure they're available
  const botToken = process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
  let channelId = process.env.TELEGRAM_CHANNEL_ID || CHANNEL_ID;

  if (!botToken || !channelId) {
    console.error('[Telegram Notification] Missing configuration:', {
      hasBotToken: !!botToken,
      hasChannelId: !!channelId,
      botTokenLength: botToken?.length || 0,
      channelId: channelId
    });
    return { success: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID' };
  }

  // Normalize channel ID - ensure numeric IDs are strings, remove any whitespace
  channelId = String(channelId).trim();

  // Validate channel ID format (supports @channelname or numeric IDs like -1001234567890)
  const isValidChannelId = channelId.startsWith('@') || /^-?\d+$/.test(channelId);
  if (!isValidChannelId) {
    console.error('[Telegram Notification] Invalid channel ID format:', channelId);
    console.error('[Telegram Notification] Channel ID should be @channelname or numeric ID like -1001234567890');
    return { success: false, error: 'Invalid channel ID format' };
  }

  console.log('[Telegram Notification] Attempting to send notification for bot:', bot.name || 'Unknown');
  console.log('[Telegram Notification] Configuration:', {
    hasBotToken: !!botToken,
    channelId: channelId,
    channelIdType: channelId.startsWith('@') ? 'username' : 'numeric',
    botTokenPrefix: botToken.substring(0, 10) + '...'
  });

  const name = escapeHTML(bot.name || 'Unnamed Bot');
  const category = escapeHTML(bot.category || 'Unknown');
  const country = escapeHTML(bot.country || 'Unknown');
  const description = escapeHTML(bot.description || 'No description provided');
  const slug = bot.slug || '';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  const isDevelopment = siteUrl.includes('localhost') || siteUrl.startsWith('http://');

  // Use production URL for buttons since Telegram requires HTTPS
  const productionUrl = 'https://erogram.pro';
  const url = isDevelopment
    ? `${productionUrl}/${slug}/?utm_source=telegram&utm_medium=button&utm_campaign=bot_notification`
    : `${siteUrl}/${slug}/?utm_source=telegram&utm_medium=button&utm_campaign=bot_notification`;

  const browseUrl = isDevelopment
    ? `${productionUrl}/bots?utm_source=telegram&utm_medium=button&utm_campaign=see_all_bots`
    : `${siteUrl}/bots?utm_source=telegram&utm_medium=button&utm_campaign=see_all_bots`;

  // Use production URL for image since Telegram needs publicly accessible HTTPS URLs
  // In development, localhost URLs won't be accessible to Telegram
  const imageUrl = isDevelopment ? productionUrl : siteUrl;

  // Handle different image formats:
  // - Data URIs (data:image/...) - convert to Buffer and upload via multipart/form-data
  // - Full URLs (https://...) can be used directly
  // - Relative paths (/path/to/image.jpg) need to be prefixed with site URL
  let photoUrl: string | null = null;
  let photoBuffer: Buffer | null = null;
  let useMultipartUpload = false;

  if (!bot.image) {
    photoUrl = `${imageUrl}/assets/image.jpg`;
  } else if (bot.image.startsWith('data:image/')) {
    // Data URI - convert to Buffer for multipart upload
    try {
      const base64Data = bot.image.split(',')[1];
      photoBuffer = Buffer.from(base64Data, 'base64');
      useMultipartUpload = true;
      console.log('[Telegram Notification] Converting data URI to Buffer for upload');
    } catch {
      console.warn('[Telegram Notification] Failed to convert data URI, using default image instead');
      photoUrl = `${imageUrl}/assets/image.jpg`;
    }
  } else if (bot.image.startsWith('http://') || bot.image.startsWith('https://')) {
    // Already a full URL
    photoUrl = bot.image;
  } else {
    // Relative path
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const imagePath = bot.image.startsWith('/') ? bot.image.substring(1) : bot.image;
      const filePath = path.join(publicDir, imagePath);

      if (fs.existsSync(filePath)) {
        photoBuffer = fs.readFileSync(filePath);
        useMultipartUpload = true;
        console.log('[Telegram Notification] Read image from filesystem:', filePath);
      } else {
        const prefix = bot.image.startsWith('/') ? '' : '/';
        photoUrl = `${imageUrl}${prefix}${bot.image}`;
      }
    } catch (err) {
      console.warn('[Telegram Notification] Failed to read file from filesystem:', err);
      const prefix = bot.image.startsWith('/') ? '' : '/';
      photoUrl = `${imageUrl}${prefix}${bot.image}`;
    }
  }

  // Ensure photoUrl is HTTPS and publicly accessible (only if using URL)
  if (photoUrl && !useMultipartUpload) {
    if (!photoUrl.startsWith('https://')) {
      // If it's HTTP, try to convert to HTTPS
      if (photoUrl.startsWith('http://')) {
        photoUrl = photoUrl.replace('http://', 'https://');
      } else {
        // If no protocol, assume HTTPS
        photoUrl = `https://${photoUrl.replace(/^https?:\/\//, '')}`;
      }
    }
  }

  const getMessageStyle = () => {
    const styles = [
      `🎉 <b>NEW BOT DISCOVERED!</b> 🎉`,
      `✨ <b>FRESH BOT ALERT!</b> ✨`,
      `🚀 <b>HOT NEW BOT!</b> 🚀`,
      `🔥 <b>AMAZING BOT FOUND!</b> 🔥`,
      `💎 <b>GEM OF A BOT!</b> 💎`,
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const truncateDescription = (desc: string, maxLength: number = 200) => {
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength - 3) + '...';
  };

  const getCallToAction = () => {
    const actions = [
      `✨ <i>Join thousands of users discovering amazing Telegram bots on Erogram!</i> ✨`,
      `🌟 <i>Don't miss out on this incredible Telegram bot!</i> 🌟`,
      `🚀 <i>Be part of the growing Erogram community!</i> 🚀`,
      `💫 <i>Discover more amazing bots like this on Erogram!</i> 💫`,
      `🎯 <i>Find your perfect Telegram bot on Erogram!</i> 🎯`,
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  };

  const getButtonStyle = () => {
    const styles = [
      { join: '🤖 Use This Bot', browse: '🔍 Browse All Bots' },
      { join: '✨ Use Now', browse: '🔍 Explore Bots' },
      { join: '🔥 Use Bot', browse: '📋 All Bots' },
      { join: '💎 Use This Bot', browse: '🌐 Browse Bots' },
      { join: '🎯 Use Today', browse: '🗂️ View Bots' },
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const caption = `${getMessageStyle()}

🔥 <b>${name}</b> 🔥

${getCategoryEmoji(category)} <b>Category:</b> ${category}
${getCountryEmoji(country)} <b>Location:</b> ${country}

📝 <b>About this bot:</b>
${truncateDescription(description)}

${getCallToAction()}

#${category.toLowerCase().replace(/\s+/g, '')} #TelegramBots #Erogram`;

  const buttonStyle = getButtonStyle();

  // Telegram requires HTTPS URLs for inline keyboard buttons
  // Ensure URLs are valid HTTPS
  const validateUrl = (urlString: string): string | null => {
    try {
      const url = new URL(urlString);
      // Telegram only accepts HTTPS for inline keyboard buttons
      if (url.protocol === 'https:') {
        return urlString;
      }
      return null;
    } catch {
      return null;
    }
  };

  const validJoinUrl = validateUrl(url);
  const validBrowseUrl = validateUrl(browseUrl);

  // Build inline keyboard only if we have valid HTTPS URLs
  const replyMarkup: any = { inline_keyboard: [] };

  if (validJoinUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.join, url: validJoinUrl }]);
  }

  if (validBrowseUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.browse, url: validBrowseUrl }]);
  }

  // Prepare request payload
  let requestPayload: any;
  let axiosConfig: any = {};

  if (useMultipartUpload && photoBuffer) {
    // Use multipart/form-data for data URI uploads
    // Create FormData manually for axios
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('chat_id', channelId);
    formData.append('photo', photoBuffer, {
      filename: 'bot-image.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('caption', caption.trim());
    formData.append('parse_mode', 'HTML');

    if (replyMarkup.inline_keyboard.length > 0) {
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }

    requestPayload = formData;
    axiosConfig = {
      headers: formData.getHeaders()
    };

    console.log('[Telegram Notification] Uploading image via multipart/form-data (from data URI)');
  }

  if (!useMultipartUpload) {
    // Use URL-based upload
    requestPayload = {
      chat_id: channelId,
      photo: photoUrl,
      caption: caption.trim(),
      parse_mode: 'HTML',
    };

    console.log('[Telegram Notification] Using photo URL:', photoUrl);

    // Only add reply_markup if we have valid buttons
    if (replyMarkup.inline_keyboard.length > 0) {
      requestPayload.reply_markup = replyMarkup;
    } else {
      console.warn('[Telegram Notification] No valid HTTPS URLs for inline buttons - sending message without buttons');
    }
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, requestPayload, axiosConfig);

    console.log('[Telegram Notification] ✅ Successfully sent notification for bot:', name);

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send to Plus channel with direct link
    try {
      const plusBotToken = process.env.EROGRAM_PLUS_TOKEN;
      const plusChannelId = process.env.EROGRAM_PLUS_CHANNEL_ID;

      if (!plusBotToken || !plusChannelId) {
        console.warn('[Telegram Notification] Plus channel config missing');
      } else {
        // Normalize plusChannelId
        let plusChannelIdStr = String(plusChannelId).trim();

        // Validate
        const isValidPlusChannelId = plusChannelIdStr.startsWith('@') || /^-?\d+$/.test(plusChannelIdStr);
        if (!isValidPlusChannelId) {
          console.error('[Telegram Notification] Invalid Plus channel ID format:', plusChannelIdStr);
        } else {
          // For Plus, use direct link
          const directUrl = bot.telegramLink;

          if (!directUrl) {
            console.warn('[Telegram Notification] No telegramLink for Plus notification');
          } else {
            // Build payload similar but with directUrl
            const validDirectUrl = validateUrl(directUrl);

            const replyMarkupPlus: any = { inline_keyboard: [] };

            if (validDirectUrl) {
              replyMarkupPlus.inline_keyboard.push([{ text: buttonStyle.join, url: validDirectUrl }]);
            }

            if (validBrowseUrl) {
              replyMarkupPlus.inline_keyboard.push([{ text: buttonStyle.browse, url: validBrowseUrl }]);
            }

            let requestPayloadPlus: any;
            let axiosConfigPlus: any = {};

            if (useMultipartUpload && photoBuffer) {
              const FormData = require('form-data');
              const formDataPlus = new FormData();

              formDataPlus.append('chat_id', plusChannelIdStr);
              formDataPlus.append('photo', photoBuffer, {
                filename: 'bot-image.jpg',
                contentType: 'image/jpeg'
              });
              formDataPlus.append('caption', caption.trim());
              formDataPlus.append('parse_mode', 'HTML');

              if (replyMarkupPlus.inline_keyboard.length > 0) {
                formDataPlus.append('reply_markup', JSON.stringify(replyMarkupPlus));
              }

              requestPayloadPlus = formDataPlus;
              axiosConfigPlus = {
                headers: formDataPlus.getHeaders()
              };
            } else {
              requestPayloadPlus = {
                chat_id: plusChannelIdStr,
                photo: photoUrl,
                caption: caption.trim(),
                parse_mode: 'HTML',
              };

              if (replyMarkupPlus.inline_keyboard.length > 0) {
                requestPayloadPlus.reply_markup = replyMarkupPlus;
              }
            }

            const plusResponse = await axios.post(`https://api.telegram.org/bot${plusBotToken}/sendPhoto`, requestPayloadPlus, axiosConfigPlus);

            console.log('[Telegram Notification] ✅ Successfully sent Plus notification for bot:', name);
          }
        }
      }
    } catch (plusErr: any) {
      console.error('[Telegram Notification] ❌ Error sending Plus notification:', plusErr.message);
    }

    return { success: true, messageId: response.data?.result?.message_id };
  } catch (err: any) {
    // If it failed and we were using a custom image, try with default image
    // This handles cases where the image URL is not accessible to Telegram (400 Bad Request)
    if (err.response?.status === 400 && photoUrl !== `${imageUrl}/assets/image.jpg` && !useMultipartUpload) {
      console.warn('[Telegram Notification] Failed with custom image, retrying with default image...');
      try {
        const defaultPayload = {
          chat_id: channelId,
          photo: `${imageUrl}/assets/image.jpg`,
          caption: caption.trim(),
          parse_mode: 'HTML',
        };

        if (replyMarkup.inline_keyboard.length > 0) {
          (defaultPayload as any).reply_markup = replyMarkup;
        }

        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, defaultPayload);
        console.log('[Telegram Notification] ✅ Successfully sent notification with default image');
        return { success: true, messageId: response.data?.result?.message_id };
      } catch (retryErr: any) {
        console.error('[Telegram Notification] Retry with default image failed:', retryErr.message);
      }
    }

    const errorDetails = {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      url: err.config?.url
    };

    console.error('[Telegram Notification] ❌ Error sending notification:', errorDetails);

    // Provide helpful error messages
    if (err.response?.status === 401) {
      console.error('[Telegram Notification] Bot token is invalid or expired');
    } else if (err.response?.status === 403) {
      console.error('[Telegram Notification] Bot does not have permission to post to channel');
      console.error('[Telegram Notification] Make sure the bot is added as an admin to the channel');
    } else if (err.response?.status === 400) {
      if (err.response?.data?.description?.includes('remote file identifier')) {
        console.error('[Telegram Notification] Image URL is not accessible to Telegram');
        console.error('[Telegram Notification] Make sure the image URL is publicly accessible via HTTPS');
        console.error('[Telegram Notification] Photo URL used:', photoUrl || 'N/A (multipart upload)');
      } else {
        console.error('[Telegram Notification] Invalid request - check channel ID format');
        console.error('[Telegram Notification] Channel ID should be @channelname or -1001234567890 (numeric)');
      }
    }

    return {
      success: false,
      error: err.message,
      details: errorDetails
    };
  }
}

async function sendPremiumGroupTelegramNotification(group: any = {}) {
  // Get environment variables at runtime to ensure they're available
  const plusBotToken = process.env.EROGRAM_PLUS_TOKEN;
  const plusChannelId = process.env.EROGRAM_PLUS_CHANNEL_ID;

  if (!plusBotToken || !plusChannelId) {
    console.error('[Premium Telegram Notification] Missing Plus channel configuration');
    return { success: false, error: 'Missing EROGRAM_PLUS_TOKEN or EROGRAM_PLUS_CHANNEL_ID' };
  }

  // Normalize plusChannelId
  let plusChannelIdStr = String(plusChannelId).trim();

  // Validate
  const isValidPlusChannelId = plusChannelIdStr.startsWith('@') || /^-?\d+$/.test(plusChannelIdStr);
  if (!isValidPlusChannelId) {
    console.error('[Premium Telegram Notification] Invalid Plus channel ID format:', plusChannelIdStr);
    return { success: false, error: 'Invalid Plus channel ID format' };
  }

  console.log('[Premium Telegram Notification] Attempting to send premium notification for group:', group.name || 'Unknown');

  const name = escapeHTML(group.name || 'Unnamed Group');
  const category = escapeHTML(group.category || 'Unknown');
  const country = escapeHTML(group.country || 'Unknown');
  const description = escapeHTML(group.description || 'No description provided');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
  const isDevelopment = siteUrl.includes('localhost') || siteUrl.startsWith('http://');

  // Use production URL for buttons since Telegram requires HTTPS
  const productionUrl = 'https://erogram.pro';
  const browseUrl = isDevelopment
    ? `${productionUrl}/?utm_source=telegram&utm_medium=button&utm_campaign=see_all_groups`
    : `${siteUrl}/?utm_source=telegram&utm_medium=button&utm_campaign=see_all_groups`;

  // Use production URL for image since Telegram needs publicly accessible HTTPS URLs
  const imageUrl = isDevelopment ? productionUrl : siteUrl;

  // Handle different image formats
  let photoUrl: string | null = null;
  let photoBuffer: Buffer | null = null;
  let useMultipartUpload = false;

  if (!group.image || group.image === '/assets/image.jpg') {
    photoUrl = `${imageUrl}/assets/image.jpg`;
  } else if (group.image.startsWith('data:image/')) {
    try {
      const base64Data = group.image.split(',')[1];
      photoBuffer = Buffer.from(base64Data, 'base64');
      useMultipartUpload = true;
    } catch {
      photoUrl = `${imageUrl}/assets/image.jpg`;
    }
  } else if (group.image.startsWith('http://') || group.image.startsWith('https://')) {
    photoUrl = group.image;
  } else {
    // Relative path
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const imagePath = group.image.startsWith('/') ? group.image.substring(1) : group.image;
      const filePath = path.join(publicDir, imagePath);

      if (fs.existsSync(filePath)) {
        photoBuffer = fs.readFileSync(filePath);
        useMultipartUpload = true;
        console.log('[Premium Telegram Notification] Read image from filesystem:', filePath);
      } else {
        const prefix = group.image.startsWith('/') ? '' : '/';
        photoUrl = `${imageUrl}${prefix}${group.image}`;
      }
    } catch (err) {
      console.warn('[Premium Telegram Notification] Failed to read file from filesystem:', err);
      const prefix = group.image.startsWith('/') ? '' : '/';
      photoUrl = `${imageUrl}${prefix}${group.image}`;
    }
  }

  // Ensure photoUrl is HTTPS
  if (photoUrl && !useMultipartUpload) {
    if (!photoUrl.startsWith('https://')) {
      if (photoUrl.startsWith('http://')) {
        photoUrl = photoUrl.replace('http://', 'https://');
      } else {
        photoUrl = `https://${photoUrl.replace(/^https?:\/\//, '')}`;
      }
    }
  }

  const getMessageStyle = () => {
    const styles = [
      `💎 <b>PREMIUM GROUP ALERT!</b> 💎`,
      `⭐ <b>EXCLUSIVE PREMIUM GROUP!</b> ⭐`,
      `🔒 <b>VIP PREMIUM GROUP!</b> 🔒`,
      `👑 <b>ROYAL PREMIUM GROUP!</b> 👑`,
      `✨ <b>LIMITED PREMIUM GROUP!</b> ✨`,
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const truncateDescription = (desc: string, maxLength: number = 200) => {
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength - 3) + '...';
  };

  const getCallToAction = () => {
    const actions = [
      `🔥 <i>This premium group is available exclusively for our VIP members!</i> 🔥`,
      `💎 <i>Premium quality content awaits in this exclusive group!</i> 💎`,
      `⭐ <i>Experience the best with this premium Telegram group!</i> ⭐`,
      `👑 <i>Royal treatment in this premium community!</i> 👑`,
      `✨ <i>Unlock premium experiences with this exclusive group!</i> ✨`,
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  };

  const getButtonStyle = () => {
    const styles = [
      { join: '🔥 Join Premium', browse: '🔍 Browse All Groups' },
      { join: '💎 Join VIP', browse: '🔍 Explore Groups' },
      { join: '⭐ Join Exclusive', browse: '📋 All Groups' },
      { join: '👑 Join Royal', browse: '🌐 Browse Groups' },
      { join: '✨ Join Premium', browse: '🗂️ View Groups' },
    ];
    return styles[Math.floor(Math.random() * styles.length)];
  };

  const caption = `${getMessageStyle()}

🔥 <b>${name}</b> 🔥

${getCategoryEmoji(category)} <b>Category:</b> ${category}
${getCountryEmoji(country)} <b>Location:</b> ${country}

📝 <b>About this premium group:</b>
${truncateDescription(description)}

${getCallToAction()}

#Premium #${category.toLowerCase().replace(/\s+/g, '')} #VIP #Exclusive #Erogram`;

  const buttonStyle = getButtonStyle();

  const validateUrl = (urlString: string): string | null => {
    try {
      const url = new URL(urlString);
      if (url.protocol === 'https:') {
        return urlString;
      }
      return null;
    } catch {
      return null;
    }
  };

  // For premium, use direct telegram link
  const directUrl = group.telegramLink;
  const validDirectUrl = validateUrl(directUrl);
  const validBrowseUrl = validateUrl(browseUrl);

  const replyMarkup: any = { inline_keyboard: [] };

  if (validDirectUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.join, url: validDirectUrl }]);
  }

  if (validBrowseUrl) {
    replyMarkup.inline_keyboard.push([{ text: buttonStyle.browse, url: validBrowseUrl }]);
  }

  let requestPayload: any;
  let axiosConfig: any = {};

  if (useMultipartUpload && photoBuffer) {
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('chat_id', plusChannelIdStr);
    formData.append('photo', photoBuffer, {
      filename: 'group-image.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('caption', caption.trim());
    formData.append('parse_mode', 'HTML');

    if (replyMarkup.inline_keyboard.length > 0) {
      formData.append('reply_markup', JSON.stringify(replyMarkup));
    }

    requestPayload = formData;
    axiosConfig = {
      headers: formData.getHeaders()
    };
  } else {
    requestPayload = {
      chat_id: plusChannelIdStr,
      photo: photoUrl,
      caption: caption.trim(),
      parse_mode: 'HTML',
    };

    if (replyMarkup.inline_keyboard.length > 0) {
      requestPayload.reply_markup = replyMarkup;
    }
  }

  try {

    const response = await axios.post(`https://api.telegram.org/bot${plusBotToken}/sendPhoto`, requestPayload, axiosConfig);

    console.log('[Premium Telegram Notification] ✅ Successfully sent premium notification for group:', name);

    return { success: true, messageId: response.data?.result?.message_id };
  } catch (err: any) {
    // If it failed and we were using a custom image, try with default image
    // This handles cases where the image URL is not accessible to Telegram (400 Bad Request)
    if (err.response?.status === 400 && photoUrl !== `${imageUrl}/assets/image.jpg`) {
      console.warn('[Premium Telegram Notification] Failed with custom image, retrying with default image...');
      try {
        const defaultPayload = {
          chat_id: plusChannelIdStr,
          photo: `${imageUrl}/assets/image.jpg`,
          caption: caption.trim(),
          parse_mode: 'HTML',
        };

        if (replyMarkup.inline_keyboard.length > 0) {
          (defaultPayload as any).reply_markup = replyMarkup;
        }

        const response = await axios.post(`https://api.telegram.org/bot${plusBotToken}/sendPhoto`, defaultPayload);
        console.log('[Premium Telegram Notification] ✅ Successfully sent premium notification with default image');
        return { success: true, messageId: response.data?.result?.message_id };
      } catch (retryErr: any) {
        console.error('[Premium Telegram Notification] Retry with default image failed:', retryErr.message);
      }
    }

    const errorDetails = {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      url: err.config?.url
    };

    console.error('[Premium Telegram Notification] ❌ Error sending premium notification:', errorDetails);

    return {
      success: false,
      error: err.message,
      details: errorDetails
    };
  }
}

export { sendNewGroupTelegramNotification, sendNewBotTelegramNotification, sendPremiumGroupTelegramNotification };

