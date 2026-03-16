import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple response for metrics endpoint
  // This prevents 404 errors from monitoring tools
  return NextResponse.json({
    message: 'Metrics endpoint not available. Use /api/admin/metrics for admin metrics.',
    status: 'not_available'
  }, { status: 404 });
}