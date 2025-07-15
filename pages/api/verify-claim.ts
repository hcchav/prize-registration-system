import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/database.types';

type Attendee = Database['public']['Tables']['attendees']['Row'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: 'Claim ID is required' });
    }

    // Check if the claim ID exists in the database
    const { data: attendeeData, error: fetchError } = await supabase
      .from('attendees')
      .select('id, claim_id, prize_id, verified')
      .eq('claim_id', claimId)
      .single();

    if (fetchError) {
      console.error('Error fetching attendee:', fetchError);
      
      // If no match found, return specific error
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Invalid claim number' });
      }
      
      return res.status(500).json({ error: 'Failed to verify claim number' });
    }

    if (!attendeeData) {
      return res.status(404).json({ error: 'Invalid claim number' });
    }

    // Check if the attendee is verified
    if (!attendeeData.verified) {
      return res.status(403).json({ error: 'Attendee not verified' });
    }

    // Check if the prize has already been claimed
    if (attendeeData.prize_id) {
      return res.status(400).json({ 
        error: 'Prize already claimed',
        code: 'PRIZE_ALREADY_CLAIMED'
      });
    }

    // Return success with the attendee ID
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json({
      success: true,
      attendeeId: attendeeData.id,
      message: 'Claim number verified successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
