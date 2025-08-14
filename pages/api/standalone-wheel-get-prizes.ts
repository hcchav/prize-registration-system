import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

type Prize = {
  id: number;
  name: string;
  description: string;
  stock: number;
  wheel_position: number;
  image_url: string;
  created_at: string;
};

type Data = {
  prizes?: Prize[];
  error?: string;
  code?: string;
};

/**
 * API handler to get all available prizes for the standalone wheel
 * 
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Fetch prizes from the database
    const { data: prizes, error } = await supabase
      .from('prizes')
      .select('*')
      .order('id');

    // Handle database error
    if (error) {
      console.error('Error fetching prizes:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch prizes', 
        code: 'DATABASE_ERROR' 
      });
    }

    // Return prizes
    return res.status(200).json({ prizes });
  } catch (error) {
    console.error('Unexpected error in standalone-wheel-get-prizes:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred', 
      code: 'INTERNAL_SERVER_ERROR' 
    });
  }
}
