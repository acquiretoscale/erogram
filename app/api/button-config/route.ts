import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ButtonConfig } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get or create button config
    let config = await ButtonConfig.findOne().lean();
    if (!config) {
      config = {
        button1: {
          text: 'Join Telegram',
          link: '',
          color: 'from-blue-500 to-purple-600'
        },
        button2: {
          text: 'Browse Groups',
          link: '/groups',
          color: 'from-green-500 to-emerald-600'
        },
        button3: {
          text: 'Learn More',
          link: '/',
          color: 'from-orange-500 to-red-600'
        }
      } as any;
    }
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Button config fetch error:', error);
    return NextResponse.json(
      { 
        button1: { text: 'Join Telegram', link: '', color: 'from-blue-500 to-purple-600' },
        button2: { text: 'Browse Groups', link: '/groups', color: 'from-green-500 to-emerald-600' },
        button3: { text: 'Learn More', link: '/', color: 'from-orange-500 to-red-600' }
      },
      { status: 500 }
    );
  }
}

