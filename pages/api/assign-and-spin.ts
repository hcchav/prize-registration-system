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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attendeeId, eventId } = req.body;

  if (!attendeeId || !eventId) {
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
      return res.status(400).json({
        error: 'Prize already claimed',
        code: 'PRIZE_ALREADY_CLAIMED'
      });
    }

    // 2. Find an available prize with stock > 0
    console.log('Fetching available prizes...');
    const { data: availablePrizes, error: prizeError, count } = await supabase
      .from('prizes')
      .select('*', { count: 'exact' })
      .gt('stock', 0);

    console.log('Available prizes query result:', { availablePrizes, count, prizeError });

    if (prizeError) {
      console.error('Error fetching prizes:', prizeError);
      throw prizeError;
    }

    if (!availablePrizes || availablePrizes.length === 0) {
      const errorMessage = 'No prizes available in stock';
      console.error(errorMessage);
      return res.status(404).json({ 
        error: 'No prizes available',
        code: 'NO_PRIZES_AVAILABLE',
        details: errorMessage
      });
    }

    // Calculate total weight and create weighted array
    const totalWeight = availablePrizes.reduce((sum, prize) => sum + (prize.weight || 1), 0);
    const randomWeight = Math.random() * totalWeight;
    
    // Find the prize based on weighted random selection
    let accumulatedWeight = 0;
    let selectedPrize = null;
    
    for (const prize of availablePrizes) {
      accumulatedWeight += prize.weight || 1;
      if (randomWeight <= accumulatedWeight) {
        selectedPrize = prize;
        break;
      }
    }
    
    // Fallback in case of floating point precision issues
    if (!selectedPrize) {
      selectedPrize = availablePrizes[availablePrizes.length - 1];
    }

    console.log('Selected prize (weighted random):', selectedPrize);

    // 2. Decrement prize stock
    try {
      // Try using the decrement_prize_stock function
      const { error: stockError } = await supabase.rpc('decrement_prize_stock', {
        prize_id: selectedPrize.id
      });

      if (stockError) {
        console.warn('decrement_prize_stock function failed, updating stock directly', stockError);
        // Fallback to direct update if function fails
        const { data: currentPrize, error: fetchError } = await supabase
          .from('prizes')
          .select('stock')
          .eq('id', selectedPrize.id)
          .single();
          
        if (!fetchError && currentPrize) {
          const newStock = Math.max(0, currentPrize.stock - 1);
          const { error: updateError } = await supabase
            .from('prizes')
            .update({ stock: newStock })
            .eq('id', selectedPrize.id);
            
          if (updateError) {
            console.error('Error updating prize stock:', updateError);
            // Continue anyway since we'll handle the stock check in the next step
          }
        }
      }
    } catch (stockUpdateError) {
      console.error('Error in stock update:', stockUpdateError);
      // Continue with the prize assignment even if stock update fails
    }

    // 3. Update attendee with the prize
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ prize_id: selectedPrize.id })
      .eq('id', attendeeId);

    if (updateError) throw updateError;

    // 5. Calculate wheel position
    const totalPrizes = 8; // Total number of prize segments on the wheel
    const prizeIndex = selectedPrize.id % totalPrizes;
    const wheelPosition = (prizeIndex * (2 * Math.PI / totalPrizes)) + (Math.PI / totalPrizes);

    // 6. Return the prize details with wheel position
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
    return res.status(500).json({ 
      error: 'Failed to assign prize',
      details: error?.message || 'Unknown error',
      code: error?.code
    });
  }
}
