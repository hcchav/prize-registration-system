import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY);
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID!;
const client = new Twilio(accountSid, authToken);

function htmlTemplateWithOTP(otp: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
      <h2 style="color: #0072CE;">🛡️ Biome Brigade Verification</h2>
      <p>Greetings, Hero!</p>
      <p>You're one step away from joining the Biome Brigade prize squad.</p>
      <p style="font-size: 24px; font-weight: bold; text-align: center;">Your OTP Code:</p>
      <p style="font-size: 32px; font-weight: bold; color: #0072CE; text-align: center;">${otp}</p>
      <p>Enter this code on the registration screen to complete your mission. 🦸‍♀️</p>
      <p style="font-size: 12px; color: #888;">Code expires in 10 minutes.</p>
    </div>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    firstName,
    lastName,
    company,
    address,
    function: companyFunction,
    subcategory,
    email,
    phone,
    method,
  } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const normalizedPhone = phone.startsWith('+') ? phone : `${'+'}${phone}`;

  console.log('send-otp start');
  console.log(normalizedPhone);


  const { data: existing } = await supabase
    .from('attendees')
    .select('*')
    .eq('email', email)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1);

  const payload = {
    first_name: firstName,
    last_name: lastName,
    company,
    address,
    function: companyFunction,
    subcategory,
    email,
    phone: normalizedPhone,
    method,
    otp,
    verified: false,
  };

  if (existing && existing.length > 0) {
    await supabase.from('attendees').update(payload).eq('id', existing[0].id);
  } else {
    await supabase.from('attendees').insert([payload]);
  }

  if (method === 'email') {
    await resend.emails.send({
      from: 'noreply@syncworkflow.com',
      to: email,
      subject: 'Your Biome Brigade OTP Code',
      html: htmlTemplateWithOTP(otp),
    });
  } else if (method === 'sms') {

    await client.verify.v2.services(verifyServiceSid).verifications.create({
      to: normalizedPhone,
      channel: 'sms',
      templateSid: twilioTemplateSid,
    });
  }

  res.status(200).json({ success: true });
}
