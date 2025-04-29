import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, phone, method } = req.body;

  // Generate a new 5-digit code
  const otp = Math.floor(10000 + Math.random() * 90000).toString();

  // Try to find an existing, unverified record
  const { data: existing } = await supabase
    .from('attendees')
    .select('*')
    .eq('email', email)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    // Update existing OTP
    await supabase
      .from('attendees')
      .update({ otp, phone, method })
      .eq('id', existing[0].id);
  } else {
    // Create new entry
    await supabase.from('attendees').insert([
      { email, phone, method, otp, verified: false },
    ]);
  }

  // Send the OTP (you'll plug in actual logic)
  if (method === 'email') {
    console.log(`Send OTP ${otp} to ${email} via Postmark`);
  } else {
    console.log(`Send OTP ${otp} to ${phone} via Twilio`);
  }

  res.status(200).json({ success: true });
}
