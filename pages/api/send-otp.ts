import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, phone, method } = req.body;
  const otp = Math.floor(10000 + Math.random() * 90000).toString();

  const { data: existing } = await supabase
    .from('attendees')
    .select('*')
    .eq('email', email)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase
      .from('attendees')
      .update({ otp, phone, method })
      .eq('id', existing[0].id);
  } else {
    await supabase
      .from('attendees')
      .insert([{ email, phone, method, otp, verified: false }]);
  }

  await resend.emails.send({
    from: 'noreply@syncworkflow.com',
    to: email,
    subject: 'Your Verification Code',
    text: `Your OTP code is: ${otp}`,
  });
  

  res.status(200).json({ success: true });
}
