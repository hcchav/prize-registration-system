import { supabase } from '../../src/lib/supabase';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prizeId } = req.body;

  if (!prizeId) {
    return res.status(400).json({ error: 'Prize ID is required' });
  }

  try {
    // First, get the current prize to check stock
    const { data: prize, error: prizeError } = await supabase
      .from('prizes')
      .select('id, stock, claimed')
      .eq('id', prizeId)
      .single();

    if (prizeError) {
      console.error('Error fetching prize:', prizeError);
      throw prizeError;
    }

    if (!prize) {
      return res.status(404).json({ error: 'Prize not found' });
    }

    if (prize.stock <= 0) {
      return res.status(400).json({ error: 'Prize is out of stock' });
    }

    // Update the prize to claim one
    const { data: updatedPrize, error: updateError } = await supabase
      .from('prizes')
      .update({
        stock: prize.stock - 1,
        claimed: (prize.claimed || 0) + 1
      })
      .eq('id', prizeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating prize:', updateError);
      throw updateError;
    }

    return res.status(200).json({ 
      success: true, 
      prize: updatedPrize,
      message: 'Prize claimed successfully' 
    });

  } catch (error) {
    console.error('Error in claim-prize endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to claim prize',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
