import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This forces the route to be dynamically rendered for every request
// Prevents Vercel from caching the response
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DbAttendee {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  prize: string | null;
}

interface DbPrize {
  name: string;
  color: string;
  display_text: string;
}

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not found');
      return NextResponse.json(
        { success: false, error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Get all attendees
    const { data: attendees, error } = await supabase
      .from('attendees')
      .select('id, first_name, last_name, company, prize')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error.message, error.details);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!attendees) {
      console.error('No data returned from Supabase');
      return NextResponse.json(
        { success: false, error: 'No data received from database' },
        { status: 500 }
      );
    }

    // Get all prizes with their colors
    const { data: prizes, error: prizesError } = await supabase
      .from('prizes')
      .select('name, color, display_text');

    if (prizesError) {
      console.error('Supabase error fetching prizes:', prizesError.message, prizesError.details);
      return NextResponse.json(
        { success: false, error: `Database error: ${prizesError.message}` },
        { status: 500 }
      );
    }

    // Create a map of prize names to their colors
    const prizeColorMap = new Map();
    prizes?.forEach((prize: DbPrize) => {
      prizeColorMap.set(prize.name, {
        color: prize.color,
        displayText: prize.display_text
      });
    });

    return NextResponse.json(
      {
        success: true,
        attendees: (attendees as DbAttendee[]).map(a => {
          let prizeColor = null;
          let prizeDisplayText = null;
    
          if (a.prize) {
            for (const [prizeName, prizeInfo] of prizeColorMap.entries()) {
              if (a.prize.includes(prizeName)) {
                prizeColor = prizeInfo.color;
                prizeDisplayText = prizeInfo.displayText;
                break;
              }
            }
          }
    
          return {
            id: a.id,
            firstName: a.first_name,
            lastName: a.last_name,
            company: a.company,
            prize: a.prize,
            prizeColor: prizeColor,
            prizeDisplayText: prizeDisplayText
          };
        })
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}