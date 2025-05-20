import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DbAttendee {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  prize: string | null;
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

    return NextResponse.json({
      success: true,
      attendees: (attendees as DbAttendee[]).map(a => ({
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        company: a.company,
        prize: a.prize
      }))
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 