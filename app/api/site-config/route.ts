import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SiteConfig } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    let config = await SiteConfig.findOne().lean();
    if (!config) {
      config = {
        navbarButton1: {
          text: 'Casual dating',
          url: 'https://go.cm-trk6.com/aff_c?offer_id=11167&aff_id=93961&url_id=19191&source=erogram.pro&aff_sub=feed',
          enabled: true,
        },
        navbarButton2: {
          text: '',
          url: '',
          enabled: false,
        },
        navbarButton3: {
          text: '',
          url: '',
          enabled: false,
        },
        filterBanner1: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
        filterBanner2: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
        filterBanner3: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
      } as any;
    }

    // Backward compatibility: if navbarButton exists, migrate to navbarButton1
    if ((config as any).navbarButton && !(config as any).navbarButton1) {
      (config as any).navbarButton1 = (config as any).navbarButton;
      delete (config as any).navbarButton;
    }
    
    // Ensure navbarButton2 and navbarButton3 exist
    if (!(config as any).navbarButton2) {
      (config as any).navbarButton2 = {
        text: '',
        url: '',
        enabled: false,
      };
    }
    if (!(config as any).navbarButton3) {
      (config as any).navbarButton3 = {
        text: '',
        url: '',
        enabled: false,
      };
    }
    
    // Backward compatibility: migrate filterBanner to filterBanner1 if needed
    if ((config as any).filterBanner && !(config as any).filterBanner1) {
      (config as any).filterBanner1 = (config as any).filterBanner;
      delete (config as any).filterBanner;
    }
    
    // Ensure filterBanner1, filterBanner2, and filterBanner3 exist
    if (!(config as any).filterBanner1) {
      (config as any).filterBanner1 = {
        enabled: false,
        title: '',
        description: '',
        image: '',
        url: '',
        buttonText: 'Visit Site',
      };
    }
    if (!(config as any).filterBanner2) {
      (config as any).filterBanner2 = {
        enabled: false,
        title: '',
        description: '',
        image: '',
        url: '',
        buttonText: 'Visit Site',
      };
    }
    if (!(config as any).filterBanner3) {
      (config as any).filterBanner3 = {
        enabled: false,
        title: '',
        description: '',
        image: '',
        url: '',
        buttonText: 'Visit Site',
      };
    }
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Site config fetch error:', error);
    return NextResponse.json(
      {
        navbarButton1: {
          text: 'Casual dating',
          url: 'https://go.cm-trk6.com/aff_c?offer_id=11167&aff_id=93961&url_id=19191&source=erogram.pro&aff_sub=feed',
          enabled: true,
        },
        navbarButton2: {
          text: '',
          url: '',
          enabled: false,
        },
        navbarButton3: {
          text: '',
          url: '',
          enabled: false,
        },
        filterBanner1: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
        filterBanner2: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
        filterBanner3: {
          enabled: false,
          title: '',
          description: '',
          image: '',
          url: '',
          buttonText: 'Visit Site',
        },
      },
      { status: 500 }
    );
  }
}

