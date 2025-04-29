import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { assignPrize } from '../../lib/prize-logic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, code } = req.body;

  const { data: attendee } = await supabase
    .from('attendees')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!attendee || attendee.length === 0 || attendee[0].otp !== code)
    return res.status(400).json({ error: 'Invalid OTP' });

  const prize = await assignPrize();
  if (!prize) return res.status(200).json({ message: 'All prizes claimed' });

  await supabase
    .from('attendees')
    .update({ verified: true, prize_id: prize.id })
    .eq('id', attendee[0].id);

  res.status(200).json({ prize: prize.name });
}
