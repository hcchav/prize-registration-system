import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all prizes ordered by ID
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(404).json({ 
        error: 'No prizes available',
        code: 'NO_PRIZES_AVAILABLE'
      });
    }

    // Return the prizes
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in get-prizes:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ 
      error: 'Failed to fetch prizes',
      details: error?.message || 'Unknown error',
      code: error?.code
    });
  }
}
