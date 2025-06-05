import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prizeId, attendeeIdentifier } = req.body;

  // Validate prizeId is a valid number
  const prizeIdNumber = Number(prizeId);
  if (isNaN(prizeIdNumber)) {
    return res.status(400).json({ 
      error: 'Invalid prize ID',
      details: 'Prize ID must be a number'
    });
  }

  try {
    // Start by finding the attendee using the provided attendeeIdentifier (should be attendee ID)
    let attendee = null;
    if (attendeeIdentifier) {
      console.log('Looking up attendee with ID:', attendeeIdentifier);
      
      // Directly query by ID
      const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('id', attendeeIdentifier)
        .single();

      if (error) {
        console.error('Error fetching attendee by ID:', error);
        return res.status(400).json({ error: 'Attendee not found' });
      }

      if (!data) {
        console.error('No attendee found with ID:', attendeeIdentifier);
        return res.status(400).json({ error: 'Attendee not found' });
      }

      attendee = data;
      console.log('Found attendee:', { id: attendee.id, email: attendee.email });
    } else {
      console.error('No attendee identifier provided');
      return res.status(400).json({ error: 'Attendee identifier is required' });
    }

    // Check if attendee already has a prize
    if (attendee.prize_id || attendee.prize) {
      console.log('Attendee already has a prize:', { 
        prize_id: attendee.prize_id, 
        prize: attendee.prize 
      });
      return res.status(400).json({
        error: 'Prize already claimed',
        details: 'You have already claimed a prize',
        code: 'PRIZE_ALREADY_CLAIMED'
      });
    }

    // Get the prize
    const { data: prizeData, error: prizeError } = await supabase
      .from('prizes')
      .select('*')
      .eq('id', prizeIdNumber)
      .single();

    if (prizeError) throw prizeError;
    if (!prizeData) {
      return res.status(404).json({ 
        error: 'Prize not found',
        details: 'The selected prize could not be found'
      });
    }

    // Check if prize is still available
    if (prizeData.stock <= 0) {
      return res.status(400).json({ 
        error: 'Prize is no longer available',
        code: 'PRIZE_OUT_OF_STOCK',
        details: 'This prize is out of stock. Please try another prize.'
      });
    }

    // Update prize stock and claimed count
    const { error: updatePrizeError } = await supabase
      .from('prizes')
      .update({
        stock: prizeData.stock - 1,
        claimed: (prizeData.claimed || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', prizeIdNumber);

    if (updatePrizeError) throw updatePrizeError;

    // If attendee is provided, update their record with the prize
    if (attendee) {
      console.log('Updating attendee with prize:', {
        attendeeId: attendee.id,
        prizeId: prizeIdNumber,
        prizeName: prizeData.name
      });

      const { data: updatedAttendee, error: updateAttendeeError } = await supabase
        .from('attendees')
        .update({
          prize_id: prizeIdNumber,
          prize: prizeData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendee.id)
        .select()
        .single();

      if (updateAttendeeError) {
        console.error('Error updating attendee:', updateAttendeeError);
        throw updateAttendeeError;
      }

      console.log('Successfully updated attendee:', updatedAttendee);
    } else {
      console.log('No attendee provided, skipping attendee update');
    }

    return res.status(200).json({
      success: true,
      prize: {
        id: prizeData.id,
        name: prizeData.name,
        stock: prizeData.stock - 1,
        displayText: prizeData.display_text || prizeData.name
      },
      attendee: attendee ? {
        id: attendee.id,
        email: attendee.email,
        prize_id: prizeIdNumber,
        prize: prizeData.name
      } : null
    });

  } catch (error) {
    console.error('Error in assign-prize:', error);
    return res.status(500).json({
      error: 'Failed to assign prize',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: error instanceof Error ? 'ASSIGNMENT_ERROR' : 'UNKNOWN_ERROR'
    });
  }
}
