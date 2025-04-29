import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, phone, method } = req.body;
  const otp = Math.floor(10000 + Math.random() * 90000).toString();

  await supabase.from('attendees').insert([{ email, phone, method, otp, verified: false }]);

  if (method === 'email') {
    // send via Postmark or Resend
  } else {
    // send via Twilio
  }

  res.status(200).json({ success: true });
}
