import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import logger, { logWithContext } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Log request received
  logWithContext('info', 'API request received', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  });
  
  if (req.method !== 'GET') {
    logWithContext('warn', 'Method not allowed', {
      requestId,
      method: req.method
    });
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    logWithContext('info', 'Fetching prizes from database', { requestId });
    
    // Fetch all prizes ordered by ID
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      logWithContext('error', 'Supabase error while fetching prizes', {
        requestId,
        error: error.message,
        code: error.code
      });
      throw error;
    }

    if (!data || data.length === 0) {
      logWithContext('warn', 'No prizes available', { requestId });
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(404).json({ 
        error: 'No prizes available',
        code: 'NO_PRIZES_AVAILABLE'
      });
    }

    logWithContext('info', 'Successfully fetched prizes', {
      requestId,
      count: data.length
    });
    
    // Return the prizes
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json(data);
  } catch (error: any) {
    logWithContext('error', 'Error in get-prizes API', {
      requestId,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code
    });
    
    console.error('Error in get-prizes:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ 
      error: 'Failed to fetch prizes',
      details: error?.message || 'Unknown error',
      code: error?.code
    });
  }
}
