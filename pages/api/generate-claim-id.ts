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
    const { attendeeId } = req.body;

    if (!attendeeId) {
      return res.status(400).json({ error: 'Attendee ID is required' });
    }

    // First, check if the attendee exists and if they already have a claim ID
    const { data: attendeeData, error: fetchError } = await supabase
      .from('attendees')
      .select('id, claim_id')
      .eq('id', attendeeId)
      .single();

    if (fetchError) {
      console.error('Error fetching attendee:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch attendee' });
    }

    if (!attendeeData) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // If the attendee already has a claim ID, return it
    if (attendeeData.claim_id) {
      return res.status(200).json({ 
        success: true, 
        claimId: attendeeData.claim_id,
        message: 'Existing claim ID retrieved'
      });
    }

    // Generate a new claim ID using the database function
    const { data: claimIdResult, error: claimIdError } = await supabase
      .rpc('get_strict_next_claim_id');

    if (claimIdError) {
      console.error('Error generating claim ID:', claimIdError);
      return res.status(500).json({ error: 'Failed to generate claim ID' });
    }

    const newClaimId = claimIdResult;
    console.log('Generated new claim ID:', newClaimId);

    // Update the attendee record with the new claim ID
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ claim_id: newClaimId })
      .eq('id', attendeeId);

    if (updateError) {
      console.error('Error updating claim ID:', updateError);
      return res.status(500).json({ error: 'Failed to assign claim ID' });
    }

    // Return success with the new claim ID
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json({
      success: true,
      claimId: newClaimId,
      message: 'New claim ID generated and assigned'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
