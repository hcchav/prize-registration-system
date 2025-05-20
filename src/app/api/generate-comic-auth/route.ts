import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { prizeId, userName, timestamp } = await request.json();

    if (!prizeId || !userName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique authentication code
    const baseString = `${prizeId}-${userName}-${timestamp}`;
    const hash = crypto.createHash('sha256').update(baseString).digest('hex');
    
    // Take first 8 characters and make them uppercase for better readability
    const authCode = hash.slice(0, 8).toUpperCase();

    // TODO: Store the auth code in your database
    // await db.comicAuth.create({ ... })

    return NextResponse.json({
      success: true,
      authCode,
    });
  } catch (error) {
    console.error('Error generating comic auth code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate authentication code' },
      { status: 500 }
    );
  }
} 