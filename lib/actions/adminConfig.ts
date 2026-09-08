'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, SiteConfig, ButtonConfig } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getSiteConfig(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  let config = await SiteConfig.findOne();
  if (!config) {
    config = await SiteConfig.create({
      navbarButton1: { text: 'Casual dating', url: 'https://go.cm-trk6.com/aff_c?offer_id=11167&aff_id=93961&url_id=19191&source=erogram.pro&aff_sub=feed', enabled: true },
      navbarButton2: { text: '', url: '', enabled: false },
      navbarButton3: { text: '', url: '', enabled: false },
      filterBanner1: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
      filterBanner2: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
      filterBanner3: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
      filterButton: { text: '', url: '' },
      topBanner: { imageUrl: '', url: '' },
    });
  }

  // Backward compatibility migrations
  if ((config as any).navbarButton && !(config as any).navbarButton1) {
    (config as any).navbarButton1 = (config as any).navbarButton;
    delete (config as any).navbarButton;
    await config.save();
  }
  if ((config as any).filterBanner && !(config as any).filterBanner1) {
    (config as any).filterBanner1 = (config as any).filterBanner;
    delete (config as any).filterBanner;
    await config.save();
  }
  if (!(config as any).filterButton) (config as any).filterButton = { text: '', url: '' };
  if (!(config as any).topBanner) (config as any).topBanner = { imageUrl: '', url: '' };
  if (!(config as any).generalSettings || typeof (config as any).generalSettings !== 'object') {
    (config as any).generalSettings = {};
  }

  return JSON.parse(JSON.stringify(config));
}

export async function updateSiteConfig(token: string, body: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  let config = await SiteConfig.findOne();
  if (!config) {
    const newData: any = {
      navbarButton1: { text: body.navbarButton1?.text || 'Casual dating', url: body.navbarButton1?.url || '', enabled: body.navbarButton1?.enabled ?? true },
      navbarButton2: { text: body.navbarButton2?.text || '', url: body.navbarButton2?.url || '', enabled: body.navbarButton2?.enabled ?? false },
      navbarButton3: { text: body.navbarButton3?.text || '', url: body.navbarButton3?.url || '', enabled: body.navbarButton3?.enabled ?? false },
      filterBanner1: { enabled: body.filterBanner1?.enabled ?? false, title: body.filterBanner1?.title || '', description: body.filterBanner1?.description || '', image: body.filterBanner1?.image || '', url: body.filterBanner1?.url || '', buttonText: body.filterBanner1?.buttonText || 'Visit Site' },
      filterBanner2: { enabled: body.filterBanner2?.enabled ?? false, title: body.filterBanner2?.title || '', description: body.filterBanner2?.description || '', image: body.filterBanner2?.image || '', url: body.filterBanner2?.url || '', buttonText: body.filterBanner2?.buttonText || 'Visit Site' },
      filterBanner3: { enabled: body.filterBanner3?.enabled ?? false, title: body.filterBanner3?.title || '', description: body.filterBanner3?.description || '', image: body.filterBanner3?.image || '', url: body.filterBanner3?.url || '', buttonText: body.filterBanner3?.buttonText || 'Visit Site' },
      filterButton: { text: body.filterButton?.text ?? '', url: body.filterButton?.url ?? '' },
      topBanner: { imageUrl: body.topBanner?.imageUrl ?? '', url: body.topBanner?.url ?? '' },
      generalSettings: body.generalSettings && typeof body.generalSettings === 'object' ? body.generalSettings : {},
    };
    config = await SiteConfig.create(newData);
  } else {
    const buttonFields = ['navbarButton1', 'navbarButton2', 'navbarButton3'] as const;
    for (const bf of buttonFields) {
      if (body[bf]) {
        (config as any)[bf] = {
          text: body[bf].text !== undefined ? body[bf].text : ((config as any)[bf]?.text || ''),
          url: body[bf].url !== undefined ? body[bf].url : ((config as any)[bf]?.url || ''),
          enabled: body[bf].enabled !== undefined ? body[bf].enabled : ((config as any)[bf]?.enabled ?? false),
        };
      }
    }
    if (body.navbarButton) {
      (config as any).navbarButton1 = {
        text: body.navbarButton.text ?? (config as any).navbarButton1?.text ?? '',
        url: body.navbarButton.url ?? (config as any).navbarButton1?.url ?? '',
        enabled: body.navbarButton.enabled ?? (config as any).navbarButton1?.enabled ?? true,
      };
    }
    const bannerFields = ['filterBanner1', 'filterBanner2', 'filterBanner3'] as const;
    for (const fb of bannerFields) {
      if (body[fb]) {
        (config as any)[fb] = {
          enabled: body[fb].enabled ?? (config as any)[fb]?.enabled ?? false,
          title: body[fb].title ?? (config as any)[fb]?.title ?? '',
          description: body[fb].description ?? (config as any)[fb]?.description ?? '',
          image: body[fb].image ?? (config as any)[fb]?.image ?? '',
          url: body[fb].url ?? (config as any)[fb]?.url ?? '',
          buttonText: body[fb].buttonText ?? (config as any)[fb]?.buttonText ?? 'Visit Site',
        };
      }
    }
    if (body.filterBanner) {
      (config as any).filterBanner1 = {
        enabled: body.filterBanner.enabled ?? (config as any).filterBanner1?.enabled ?? false,
        title: body.filterBanner.title ?? (config as any).filterBanner1?.title ?? '',
        description: body.filterBanner.description ?? (config as any).filterBanner1?.description ?? '',
        image: body.filterBanner.image ?? (config as any).filterBanner1?.image ?? '',
        url: body.filterBanner.url ?? (config as any).filterBanner1?.url ?? '',
        buttonText: body.filterBanner.buttonText ?? (config as any).filterBanner1?.buttonText ?? 'Visit Site',
      };
    }
    if (body.filterButton) {
      (config as any).filterButton = {
        text: body.filterButton.text !== undefined ? String(body.filterButton.text) : ((config as any).filterButton?.text || ''),
        url: body.filterButton.url !== undefined ? String(body.filterButton.url) : ((config as any).filterButton?.url || ''),
      };
    }
    if (body.topBanner) {
      (config as any).topBanner = {
        imageUrl: body.topBanner.imageUrl !== undefined ? String(body.topBanner.imageUrl) : ((config as any).topBanner?.imageUrl || ''),
        url: body.topBanner.url !== undefined ? String(body.topBanner.url) : ((config as any).topBanner?.url || ''),
      };
    }
    if (body.generalSettings && typeof body.generalSettings === 'object') {
      const gs = (config as any).generalSettings || {};
      const next = { ...gs, ...body.generalSettings };
      if (Array.isArray(body.generalSettings.storyCategories)) {
        next.storyCategories = body.generalSettings.storyCategories;
      }
      (config as any).generalSettings = next;
      config.markModified('generalSettings');
    }
    if (body.vaultTeaserCategories) {
      (config as any).vaultTeaserCategories = body.vaultTeaserCategories;
    }
    await config.save();
  }

  return JSON.parse(JSON.stringify(config));
}

export async function getButtonConfig(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  let config = await ButtonConfig.findOne();
  if (!config) config = await ButtonConfig.create({});
  return JSON.parse(JSON.stringify(config));
}

export async function updateButtonConfig(token: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  let config = await ButtonConfig.findOne();
  if (!config) {
    config = await ButtonConfig.create(data);
  } else {
    config.button1 = data.button1 || config.button1;
    config.button2 = data.button2 || config.button2;
    config.button3 = data.button3 || config.button3;
    await config.save();
  }
  return JSON.parse(JSON.stringify(config));
}
