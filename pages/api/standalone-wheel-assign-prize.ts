import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);



/**
 * API handler to assign a prize for the standalone wheel
 * This version doesn't check or update the attendees table,
 * it only selects a random prize and updates the prizes table
 * 
 * @param req - Next.js API request
 * @param res - Next.js API response
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // For standalone wheel, we don't need to check for attendee or claim verification
    // We just need to select a random prize and update the prizes table

    // Select and assign a random prize using the same RPC function
    const { data: prizeResult, error: prizeError } = await supabase.rpc('select_and_assign_random_prize');

    console.log('Prize result:', prizeResult);
    console.log('Prize error:', prizeError);
    
    if (prizeError) {
      console.error('Error selecting random prize:', prizeError);
      return res.status(500).json({ 
        error: 'Failed to select a random prize', 
        code: 'DATABASE_ERROR',
        details: prizeError
      });
    }

    if (!prizeResult.success) {
      return res.status(404).json({ 
        error: 'No prizes available',
        code: 'NO_PRIZES_AVAILABLE',
        details: prizeResult.error
      });
    }

    const selectedPrize = prizeResult.data;

    // No need to update attendees table in the standalone version
    // We only need to return the selected prize

    // 5. Calculate wheel position
    const totalPrizes = 8; // Total number of prize segments on the wheel
    const prizeIndex = selectedPrize.id % totalPrizes;
    const wheelPosition = (prizeIndex * (2 * Math.PI / totalPrizes)) + (Math.PI / totalPrizes);

    // 6. Return the prize details with wheel position
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json({ 
        id: selectedPrize.id,
        name: selectedPrize.name,
        displayText: selectedPrize.display_text || selectedPrize.name,
        wheelPosition,
        prizeIndex,
        color: selectedPrize.color || '#000000',
        textColor: selectedPrize.text_color || '#FFFFFF'
    });
    } catch (error: any) {
        console.error('Error in assign-and-spin:', error);
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(500).json({ 
            error: 'Failed to assign prize',
            details: error?.message || 'Unknown error',
            code: error?.code
        });
    }
}
