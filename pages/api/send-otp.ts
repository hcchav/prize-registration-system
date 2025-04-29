export default async function handler(req, res) {
    const { email, phone, method } = req.body;
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
  
    await supabase.from('attendees').insert([{ email, phone, method, otp, verified: false }]);
  
    if (method === 'email') {
      // send via Postmark or Resend API (you plug in)
    } else {
      // send via Twilio (you plug in)
    }
  
    res.status(200).json({ success: true });
  }