import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/database.types';
import { Twilio } from 'twilio';

// Extend the database type to include claim_id which might not be in the type definition yet
type Attendee = Database['public']['Tables']['attendees']['Row'] & {
  claim_id?: number | null;
};

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const client = new Twilio(accountSid, authToken);



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email, phone, method, code } = req.body;
  console.log('verify start');
  console.log(phone);
  const normalizedPhone = phone.startsWith('+') ? phone : `${'+'}${phone}`;
  console.log('verify normalize phone');
  console.log(normalizedPhone);

  let attendee: Attendee | null = null;

  // 📩 EMAIL VERIFICATION
  if (method === 'email') {
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching attendee:', error);
      return res.status(500).json({ error: 'Failed to fetch attendee' });
    }

    const attendeeData = data as unknown as Attendee[];
    if (!attendeeData.length || (attendeeData[0] as any).otp !== code) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    attendee = attendeeData[0];
  }

  // 📲 SMS VERIFICATION
  if (method === 'sms') {
    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          code: code,
          to: normalizedPhone
        });
      console.log(verification);
      console.log('verify - SMS');
      console.log(normalizedPhone);

      if (verification.status !== 'approved') {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      const { data: attendeeData, error } = await supabase
        .from('attendees')
        .select('*')
        .or(`email.eq.${email},phone.eq.${normalizedPhone}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching attendee:', error);
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(500).json({ error: 'Failed to fetch attendee' });
      }

      const attendees = attendeeData as unknown as Attendee[];
      if (!attendees || attendees.length === 0) {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(400).json({ error: 'Attendee not found' });
      }

      attendee = attendees[0];
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      console.error('Verification error:', errorMessage);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(400).json({ error: errorMessage });
    }
  }

  // Mark attendee as verified
  if (!attendee) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(404).json({ error: 'Attendee not found' });
  }

  try {
    // First, mark the attendee as verified
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ verified: true })
      .eq('id', attendee.id)
      .single();

    if (updateError) {
      console.error('Error updating attendee:', updateError);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(500).json({ error: 'Failed to update attendee' });
    }

    // Generate a claim ID if the attendee doesn't have one
    if (!attendee.claim_id) {
      // Generate a new claim ID using the database function
      const { data: claimIdResult, error: claimIdError } = await supabase
        .rpc('get_strict_next_claim_id');

      if (claimIdError) {
        console.error('Error generating claim ID:', claimIdError);
        // Continue even if claim ID generation fails - we'll still mark the user as verified
      } else {
        const newClaimId = claimIdResult;
        console.log('Generated new claim ID:', newClaimId);

        // Update the attendee record with the new claim ID
        const { error: claimUpdateError } = await supabase
          .from('attendees')
          .update({ claim_id: newClaimId })
          .eq('id', attendee.id);

        if (claimUpdateError) {
          console.error('Error updating claim ID:', claimUpdateError);
          // Continue even if claim ID update fails
        } else {
          // Update the attendee object with the new claim ID for the response
          attendee.claim_id = newClaimId;
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(200).json({ 
      success: true, 
      attendeeId: attendee.id,
      claimId: attendee.claim_id
    });
  } catch (error) {
    console.error('Error in verification process:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ error: 'An unexpected error occurred during verification' });
  }
}
