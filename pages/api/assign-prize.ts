import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { getAvailablePrize } from '../../src/lib/prize-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attendeeId } = req.body;

  if (!attendeeId) {
    return res.status(400).json({ error: 'Attendee ID is required' });
  }

  try {
    // Get an available prize (this also handles stock decrement)
    const prize = await getAvailablePrize();
    if (!prize) {
      return res.status(200).json({ error: 'No prizes available' });
    }

    // Update attendee with the prize
    const { data, error } = await supabase
      .from('attendees')
      .update({ 
        prize_id: prize.id, 
        prize_assigned: true,
        prize_name: prize.name,
        prize_description: prize.name
      })
      .eq('id', attendeeId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ prize });
  } catch (error) {
    console.error('Prize assignment error:', error);
    return res.status(500).json({ error: 'Failed to assign prize' });
  }
}
