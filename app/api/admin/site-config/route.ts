import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, SiteConfig } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) {
      return user;
    }
  } catch (error) {
    return null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    let config = await SiteConfig.findOne();
    if (!config) {
      config = await SiteConfig.create({
        navbarButton1: {
          text: 'Casual dating',
          url: 'https://go.cm-trk3.com/aff_f?h=meFeSO',
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
      });
    }

    // Backward compatibility: migrate navbarButton to navbarButton1 if needed
    if ((config as any).navbarButton && !(config as any).navbarButton1) {
      (config as any).navbarButton1 = (config as any).navbarButton;
      delete (config as any).navbarButton;
      await config.save();
    }

    // Backward compatibility: migrate filterBanner to filterBanner1 if needed
    if ((config as any).filterBanner && !(config as any).filterBanner1) {
      (config as any).filterBanner1 = (config as any).filterBanner;
      delete (config as any).filterBanner;
      await config.save();
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Site config fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch site config' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await req.json();

    let config = await SiteConfig.findOne();
    if (!config) {
      // Create new config with defaults for required fields
      const newConfigData: any = {
        navbarButton1: {
          text: body.navbarButton1?.text || 'Casual dating',
          url: body.navbarButton1?.url || 'https://go.cm-trk3.com/aff_f?h=meFeSO',
          enabled: body.navbarButton1?.enabled ?? true,
        },
        navbarButton2: {
          text: body.navbarButton2?.text || '',
          url: body.navbarButton2?.url || '',
          enabled: body.navbarButton2?.enabled ?? false,
        },
        navbarButton3: {
          text: body.navbarButton3?.text || '',
          url: body.navbarButton3?.url || '',
          enabled: body.navbarButton3?.enabled ?? false,
        },
        filterBanner1: {
          enabled: body.filterBanner1?.enabled ?? false,
          title: body.filterBanner1?.title || '',
          description: body.filterBanner1?.description || '',
          image: body.filterBanner1?.image || '',
          url: body.filterBanner1?.url || '',
          buttonText: body.filterBanner1?.buttonText || 'Visit Site',
        },
        filterBanner2: {
          enabled: body.filterBanner2?.enabled ?? false,
          title: body.filterBanner2?.title || '',
          description: body.filterBanner2?.description || '',
          image: body.filterBanner2?.image || '',
          url: body.filterBanner2?.url || '',
          buttonText: body.filterBanner2?.buttonText || 'Visit Site',
        },
        filterBanner3: {
          enabled: body.filterBanner3?.enabled ?? false,
          title: body.filterBanner3?.title || '',
          description: body.filterBanner3?.description || '',
          image: body.filterBanner3?.image || '',
          url: body.filterBanner3?.url || '',
          buttonText: body.filterBanner3?.buttonText || 'Visit Site',
        },
      };
      config = await SiteConfig.create(newConfigData);
    } else {
      // Update existing config
      if (body.navbarButton1) {
        config.navbarButton1 = {
          text: body.navbarButton1.text !== undefined ? body.navbarButton1.text : (config.navbarButton1?.text || 'Casual dating'),
          url: body.navbarButton1.url !== undefined ? body.navbarButton1.url : (config.navbarButton1?.url || 'https://go.cm-trk3.com/aff_f?h=meFeSO'),
          enabled: body.navbarButton1.enabled !== undefined ? body.navbarButton1.enabled : (config.navbarButton1?.enabled ?? true),
        };
      }
      if (body.navbarButton2) {
        config.navbarButton2 = {
          text: body.navbarButton2.text !== undefined ? body.navbarButton2.text : (config.navbarButton2?.text || ''),
          url: body.navbarButton2.url !== undefined ? body.navbarButton2.url : (config.navbarButton2?.url || ''),
          enabled: body.navbarButton2.enabled !== undefined ? body.navbarButton2.enabled : (config.navbarButton2?.enabled ?? false),
        };
      }
      if (body.navbarButton3) {
        config.navbarButton3 = {
          text: body.navbarButton3.text !== undefined ? body.navbarButton3.text : (config.navbarButton3?.text || ''),
          url: body.navbarButton3.url !== undefined ? body.navbarButton3.url : (config.navbarButton3?.url || ''),
          enabled: body.navbarButton3.enabled !== undefined ? body.navbarButton3.enabled : (config.navbarButton3?.enabled ?? false),
        };
      }
      // Backward compatibility
      if (body.navbarButton) {
        config.navbarButton1 = {
          text: body.navbarButton.text !== undefined ? body.navbarButton.text : (config.navbarButton1?.text || 'Casual dating'),
          url: body.navbarButton.url !== undefined ? body.navbarButton.url : (config.navbarButton1?.url || 'https://go.cm-trk3.com/aff_f?h=meFeSO'),
          enabled: body.navbarButton.enabled !== undefined ? body.navbarButton.enabled : (config.navbarButton1?.enabled ?? true),
        };
      }
      
      // Handle filterBanner1, filterBanner2, filterBanner3
      if (body.filterBanner1) {
        config.filterBanner1 = {
          enabled: body.filterBanner1.enabled !== undefined ? body.filterBanner1.enabled : (config.filterBanner1?.enabled ?? false),
          title: body.filterBanner1.title !== undefined ? body.filterBanner1.title : (config.filterBanner1?.title || ''),
          description: body.filterBanner1.description !== undefined ? body.filterBanner1.description : (config.filterBanner1?.description || ''),
          image: body.filterBanner1.image !== undefined ? body.filterBanner1.image : (config.filterBanner1?.image || ''),
          url: body.filterBanner1.url !== undefined ? body.filterBanner1.url : (config.filterBanner1?.url || ''),
          buttonText: body.filterBanner1.buttonText !== undefined ? body.filterBanner1.buttonText : (config.filterBanner1?.buttonText || 'Visit Site'),
        };
      }
      if (body.filterBanner2) {
        config.filterBanner2 = {
          enabled: body.filterBanner2.enabled !== undefined ? body.filterBanner2.enabled : (config.filterBanner2?.enabled ?? false),
          title: body.filterBanner2.title !== undefined ? body.filterBanner2.title : (config.filterBanner2?.title || ''),
          description: body.filterBanner2.description !== undefined ? body.filterBanner2.description : (config.filterBanner2?.description || ''),
          image: body.filterBanner2.image !== undefined ? body.filterBanner2.image : (config.filterBanner2?.image || ''),
          url: body.filterBanner2.url !== undefined ? body.filterBanner2.url : (config.filterBanner2?.url || ''),
          buttonText: body.filterBanner2.buttonText !== undefined ? body.filterBanner2.buttonText : (config.filterBanner2?.buttonText || 'Visit Site'),
        };
      }
      if (body.filterBanner3) {
        config.filterBanner3 = {
          enabled: body.filterBanner3.enabled !== undefined ? body.filterBanner3.enabled : (config.filterBanner3?.enabled ?? false),
          title: body.filterBanner3.title !== undefined ? body.filterBanner3.title : (config.filterBanner3?.title || ''),
          description: body.filterBanner3.description !== undefined ? body.filterBanner3.description : (config.filterBanner3?.description || ''),
          image: body.filterBanner3.image !== undefined ? body.filterBanner3.image : (config.filterBanner3?.image || ''),
          url: body.filterBanner3.url !== undefined ? body.filterBanner3.url : (config.filterBanner3?.url || ''),
          buttonText: body.filterBanner3.buttonText !== undefined ? body.filterBanner3.buttonText : (config.filterBanner3?.buttonText || 'Visit Site'),
        };
      }
      
      // Backward compatibility: migrate old filterBanner to filterBanner1
      if (body.filterBanner) {
        config.filterBanner1 = {
          enabled: body.filterBanner.enabled !== undefined ? body.filterBanner.enabled : (config.filterBanner1?.enabled ?? false),
          title: body.filterBanner.title !== undefined ? body.filterBanner.title : (config.filterBanner1?.title || ''),
          description: body.filterBanner.description !== undefined ? body.filterBanner.description : (config.filterBanner1?.description || ''),
          image: body.filterBanner.image !== undefined ? body.filterBanner.image : (config.filterBanner1?.image || ''),
          url: body.filterBanner.url !== undefined ? body.filterBanner.url : (config.filterBanner1?.url || ''),
          buttonText: body.filterBanner.buttonText !== undefined ? body.filterBanner.buttonText : (config.filterBanner1?.buttonText || 'Visit Site'),
        };
      }
      await config.save();
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Site config update error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorDetails = error?.errors ? JSON.stringify(error.errors) : '';
    console.error('Error details:', errorMessage, errorDetails);
    return NextResponse.json(
      { 
        message: 'Failed to update site config',
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

