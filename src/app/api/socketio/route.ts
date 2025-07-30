import { NextResponse } from 'next/server';

// Make this route dynamic to ensure it's not statically optimized
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * This endpoint serves as a health check for the Socket.io server.
 * The actual Socket.io server is initialized in the custom server.js file.
 */
export async function GET(req: Request) {
  return new NextResponse(JSON.stringify({
    status: 'ok',
    message: 'Socket.io is handled by the custom server',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
