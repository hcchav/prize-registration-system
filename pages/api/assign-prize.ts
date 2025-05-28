import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { getAvailablePrize } from '../../src/lib/prize-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attendeeId, method = 'email' } = req.body;

  console.log('Received request to assign prize:', { attendeeId, method });

  if (!attendeeId) {
    console.error('No attendee identifier provided');
    return res.status(400).json({ error: 'Attendee identifier is required' });
  }

  try {
    console.log('Looking up attendee with identifier:', attendeeId);
    
    // First, find the attendee by email or phone
    // Order by ID in descending order to get the most recent entry
    const { data: attendees, error: findError } = await supabase
      .from('attendees')
      .select('id, email, phone, verified, prize, prize_id')
      .or(`email.eq.${attendeeId},phone.eq.${attendeeId}`)
      .order('id', { ascending: false })
      .limit(1);
      
    const attendee = attendees?.[0];

    if (findError) {
      console.error('Error finding attendee in database:', {
        error: findError,
        message: findError.message,
        details: findError.details,
        hint: findError.hint
      });
      throw new Error(`Database error: ${findError.message}`);
    }

    console.log('Found attendee:', attendee);

    if (!attendee) {
      console.error('No attendee found with identifier:', attendeeId);
      return res.status(404).json({ 
        error: 'Attendee not found',
        details: 'No attendee found with the provided email/phone'
      });
    }

    if (!attendee.verified) {
      console.error('Attendee not verified:', attendee.id);
      return res.status(400).json({
        error: 'Attendee not verified',
        details: 'Please verify your email/phone before claiming a prize'
      });
    }

    if (attendee.prize_id || attendee.prize) {
      console.log('Attendee already has a prize assigned:', {
        id: attendee.id,
        prize_id: attendee.prize_id,
        prize: attendee.prize
      });
      return res.status(400).json({
        error: 'Prize already claimed',
        details: 'You have already claimed your prize'
      });
    }

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    console.log('Getting available prize...');
    
    try {
      // Get an available prize (this also handles stock decrement)
      const prize = await getAvailablePrize();
      
      if (!prize) {
        console.log('No prizes available');
        return res.status(200).json({ 
          success: false,
          error: 'No prizes available',
          details: 'All prizes have been claimed'
        });
      }

      console.log('Prize selected:', prize);
      
      // Update attendee with the prize
      console.log('Updating attendee with prize...');
      const updateData = { 
        prize_id: prize.id,
        prize: prize.name
      };
      
      console.log('Update data:', updateData);
      
      const { data, error: updateError } = await supabase
        .from('attendees')
        .update(updateData)
        .eq('id', attendee.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating attendee in database:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw new Error(`Failed to update attendee: ${updateError.message}`);
      }

      console.log('Successfully updated attendee with prize:', data);
      
      return res.status(200).json({ 
        success: true,
        prize,
        attendee: data
      });
      
    } catch (prizeError) {
      console.error('Error in prize assignment process:', {
        error: prizeError,
        message: prizeError instanceof Error ? prizeError.message : 'Unknown error',
        stack: prizeError instanceof Error ? prizeError.stack : undefined
      });
      throw prizeError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Unhandled error in prize assignment:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({ 
      success: false,
      error: 'Failed to assign prize',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }
}
