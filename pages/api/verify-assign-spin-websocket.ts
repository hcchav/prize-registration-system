import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { claimNumber, eventId } = req.body;

  if (!claimNumber || !eventId) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: Verify the claim number and get attendee ID
    const { data: attendeeData, error: fetchError } = await supabase
      .from('attendees')
      .select('id, claim_id, prize_id, verified')
      .eq('claim_id', claimNumber)
      .single();

    if (fetchError) {
      console.error('Error fetching attendee:', fetchError);
      
      // If no match found, return specific error
      if (fetchError.code === 'PGRST116') {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(404).json({ error: 'Invalid claim number' });
      }
      
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(500).json({ error: 'Failed to verify claim number' });
    }

    if (!attendeeData) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(404).json({ error: 'Invalid claim number' });
    }

    // Check if the attendee is verified
    if (!attendeeData.verified) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(403).json({ error: 'Attendee not verified' });
    }

    // Step 2: Check if attendee already has a prize
    if (attendeeData.prize_id) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(400).json({
        error: 'Prize already claimed',
        code: 'PRIZE_ALREADY_CLAIMED'
      });
    }

    // Step 3: Use the database function to select a random prize and update its stock atomically
    console.log('Calling select_and_assign_random_prize function...');
    const { data: prizeResult, error: prizeError } = await supabase.rpc('select_and_assign_random_prize');
    
    console.log('Prize selection result:', prizeResult);
    
    if (prizeError) {
      console.error('Error selecting prize:', prizeError);
      throw prizeError;
    }
    
    if (!prizeResult.success) {
      const errorMessage = prizeResult.error || 'No prizes available in stock';
      console.error(errorMessage);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(404).json({ 
        error: 'No prizes available',
        code: 'NO_PRIZES_AVAILABLE',
        details: errorMessage
      });
    }
    
    // Extract the selected prize from the result
    const selectedPrize = prizeResult.data;
    
    console.log('Selected prize:', selectedPrize);

    // Step 4: Update attendee with the prize
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ prize_id: selectedPrize.id, prize: selectedPrize.name })
      .eq('id', attendeeData.id);

    if (updateError) throw updateError;

    // Step 5: Calculate wheel position
    const totalPrizes = 8; // Total number of prize segments on the wheel
    const prizeIndex = selectedPrize.id % totalPrizes;
    const wheelPosition = (prizeIndex * (2 * Math.PI / totalPrizes)) + (Math.PI / totalPrizes);

    // Step 6: Return the prize details with wheel position
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json({
      id: selectedPrize.id,
      name: selectedPrize.name,
      displayText: selectedPrize.display_text || selectedPrize.name,
      wheelPosition,
      prizeIndex,
      color: selectedPrize.color || '#000000',
      textColor: selectedPrize.text_color || '#FFFFFF',
      attendeeId: attendeeData.id // Include the attendee ID in the response
    });
  } catch (error: any) {
    console.error('Error in verify-assign-spin-websocket:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error?.message || 'Unknown error',
      code: error?.code
    });
  }
}
