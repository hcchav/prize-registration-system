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
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attendeeId, eventId } = req.body;

  if (!attendeeId || !eventId) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Check if attendee already has a prize
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('id, prize_id')
      .eq('id', attendeeId)
      .single();

    if (attendeeError) throw attendeeError;
    if (attendee.prize_id) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(400).json({
        error: 'Prize already claimed',
        code: 'PRIZE_ALREADY_CLAIMED'
      });
    }

    // Use the new database function to select a random prize and update its stock atomically
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

    // 3. Update attendee with the prize
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ prize_id: selectedPrize.id, prize: selectedPrize.name })
      .eq('id', attendeeId);

    if (updateError) throw updateError;

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
