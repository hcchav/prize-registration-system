import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getAvailablePrize } from '../../lib/prize-logic';
import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const client = new Twilio(accountSid, authToken);



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, phone, countryCode, method, code } = req.body;
  console.log('verify start');
  console.log(phone);
  const normalizedPhone = phone.startsWith('+') ? phone : `${'+'}${phone}`;
  console.log('verify normalize phone');
  console.log(normalizedPhone);

  let attendee;
  console.log(phone);

  // 📩 EMAIL VERIFICATION
  if (method === 'email') {
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0 || data[0].otp !== code) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    attendee = data[0];
  }

  // 📲 SMS VERIFICATION
  if (method === 'sms') {
    try {

      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          code: code,
          to:  normalizedPhone
        });
      console.log(verification);
      console.log('verify - SMS');
      console.log(normalizedPhone);
    

      if (verification.status !== 'approved') {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      const { data } = await supabase
        .from('attendees')
        .select('*')
        .eq('phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return res.status(400).json({ error: 'Attendee not found' });
      }

      attendee = data[0];
    } catch (err) {
      console.log(err);
      return res.status(400).json({ error: 'Verification failed' });
    }
  }

  // 🏆 PRIZE LOGIC
  const prize = await getAvailablePrize();
  if (!prize) return res.status(200).json({ message: 'All prizes claimed' });

  await supabase
    .from('attendees')
    .update({ verified: true, prize })
    .eq('id', attendee.id);

  return res.status(200).json({ prize });
}
