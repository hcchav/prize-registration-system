import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY);
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID!;
const client = new Twilio(accountSid, authToken);

function htmlTemplateWithOTP(otp: string) {
  const logoUrl = 'https://prize-registration-system.vercel.app/images/prizes/Mockup.png';
  // const bannerUrl = 'https://drive.google.com/uc?export=view&id=1A3ORLqe09fmiWphlIr6H3VxKPYrn7zGW';
  const bannerUrl = 'https://prize-registration-system.vercel.app/images/prizes/verification-banner-mobile-828x420.png';
  

  
  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html lang="en" dir="auto" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <style type="text/css">
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;700");
        body {
          font-family: Poppins, Tahoma, sans-serif;
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        .bg-fffffe { background-color: #fffffe !important; }
        .color-00263a { color: #00263a !important; }
        .color-418fde { color: #418fde !important; }
        .header-logo { 
          max-width: 244px; 
          width: 100%; 
          height: auto; 
          border: 0; 
          outline: none;
          margin: 0 auto;
          display: block; 
          text-decoration: none; 
          display: block;
        }
        .content-box {
          border-radius: 10px;
          border: 2px solid #abcae9;
          overflow: hidden;
          max-width: 320px;
          margin: 0 auto;
        }
        .otp-code {
          font-size: 24px;
          font-weight: 700;
          color: #418fde;
          text-align: center;
          margin: 15px 0;
          letter-spacing: 3px;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          color: #00263a;
          font-size: 14px;
          line-height: 1.5;
        }
        .footer a {
          color: #418fde;
          text-decoration: none;
        }
        /* For email clients that don't support background images */
        .fallback-bg {
          background-color: #f0f7ff;
          background-size: 100% auto;
          background-position: center center;
          background-repeat: no-repeat;
          width: 100%;
          max-width: 600px;
          height: 0;
          padding-bottom: 50.7%; /* 162/319.37 = 0.507 (maintains aspect ratio) */
          margin: 0 auto;
        }
        @media screen and (min-width: 1px) {
          .fallback-bg {
            background-image: url('${bannerUrl}') !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: Poppins, Tahoma, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <center style="width: 100%;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <img src="${logoUrl}" alt="Biome Brigade" class="header-logo" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px;">
              <div class="content-box">
                <div class="fallback-bg">
                  <!-- Fallback content for email clients that don't support background images -->
                  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
                    Welcome to Biome Brigade
                  </div>
                </div>
                <div style="padding: 20px;">
                  <p style="font-size: 16px; color: #00263a; text-align: center; line-height: 1.6; margin: 0 0 20px 0;">
                    Greetings, Hero!<br /><br />
                    You are one step away from joining the Biome Brigade prize squad!
                  </p>
                  <p style="font-size: 20px; font-weight: 700; color: #00263a; text-align: center; margin: 0 0 10px 0;">Your OTP Code:</p>
                  <div class="otp-code">
                    ${otp.match(/\d/g)?.join(' ')}
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 16px; line-height: 1.5;">Please do not reply to this email.</p>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">If you have any questions, contact <a href="mailto:info@biomebrigade.com" style="color: #418fde; text-decoration: none;">info@biomebrigade.com</a>.</p>
            </td>
          </tr>
        </table>
      </center>
    </body>
  </html>
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
    // i want confirmation that the update was successful
    const { data: updated } = await supabase.from('attendees').select('*').eq('id', existing[0].id).order('created_at', { ascending: false }).limit(1);
    console.log('updated attendee', updated);
  } else {
    await supabase.from('attendees').insert([payload]);
    // i want confirmation that the insert was successful
    console.log(payload);
    const { data: inserted } = await supabase.from('attendees').select('*').order('created_at', { ascending: false }).limit(1);
    console.log('inserted attendee', inserted);
  }

  if (method === 'email') {
    try {
      console.log('Sending email to:', email);
      const { data, error } = await resend.emails.send({
        from: 'noreply@syncworkflow.com',
        to: email,
        subject: 'Your Biome Brigade OTP Code',
        html: htmlTemplateWithOTP(otp),
      });
      
      if (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({ success: false, error: 'Failed to send email' });
      }
      
      console.log('Email sent successfully:', data);
    } catch (error) {
      console.error('Error in email sending:', error);
      return res.status(500).json({ success: false, error: 'Error sending email' });
    }
  } else if (method === 'sms') {
    try {
      console.log('Sending SMS to:', normalizedPhone);
      const verification = await client.verify.v2.services(verifyServiceSid).verifications.create({
        to: normalizedPhone,
        channel: 'sms',
        templateSid: twilioTemplateSid,
      });
      console.log('SMS verification response:', verification);
    } catch (error) {
      console.error('SMS sending error:', error);
      return res.status(500).json({ success: false, error: 'Failed to send SMS' });
    }
  }

  res.status(200).json({ success: true });
}
