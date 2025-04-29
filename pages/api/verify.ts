export default async function handler(req, res) {
    const { email, code } = req.body;
    const { data: attendee } = await supabase.from('attendees')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);
  
    if (!attendee || attendee[0].otp !== code) return res.status(400).json({ error: 'Invalid OTP' });
  
    const prize = await assignPrize();
    if (!prize) return res.status(200).json({ message: 'All prizes claimed' });
  
    await supabase.from('attendees')
      .update({ verified: true, prize_id: prize.id })
      .eq('id', attendee[0].id);
  
    res.status(200).json({ prize: prize.name });
  }