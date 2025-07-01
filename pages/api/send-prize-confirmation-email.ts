import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function htmlTemplateWithPrizeDetails(prizeName: string, claimNumber: string, recipientEmail: string, firstName: string) {
  const logoUrl = 'https://prize-registration-system.vercel.app/images/prizes/Mockup.png';
  
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
        .prize-name {
          font-size: 24px;
          font-weight: 700;
          color: #418fde;
          text-align: center;
          margin: 15px 0;
        }
        .claim-number {
          font-size: 20px;
          font-weight: 700;
          color: #00263a;
          text-align: center;
          margin: 15px 0;
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
            background-color: #abcae9 !important; 
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
                <div class="fallback-bg" style="padding: 15px 0; text-align: center; height:30px;">
                  <h1 style="font-size: 24px; font-weight: 700; color: #052740; margin: 0;">
                    Prize Confirmation
                  </h1>
                </div>
                <div style="padding: 20px;">
                  <p style="font-size: 16px; color: #00263a; text-align: center; line-height: 1.6; margin: 0 0 20px 0;">
                    Congratulations, ${firstName || 'Friend'}!<br /><br />
                    You have won a prize in the Biome Brigade giveaway!
                  </p>
                  <p style="font-size: 20px; font-weight: 700; color: #00263a; text-align: center; margin: 0 0 10px 0;">Your Prize:</p>
                  <div class="prize-name">
                    ${prizeName}
                  </div>
                  <p style="font-size: 16px; font-weight: 700; color: #00263a; text-align: center; margin: 20px 0 10px 0;">Your Claim Number:</p>
                  <div class="claim-number">
                    ${claimNumber}
                  </div>
                  <p style="font-size: 16px; color: #00263a; text-align: center; line-height: 1.6; margin: 20px 0 0 0;">
                    Visit the Biome Brigade Booth (#8737) to claim your prize!
                  </p>
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

// Function to format the claim number (same as in the frontend)
function formatRegNumber(id: string | number | null): string {
  if (!id) return 'N/A';
  // Convert id to string if it's not already
  const idStr = String(id);
  // Take the last 6 characters of the ID and format as REG-XXXXXX
  const lastFour = idStr.slice(-4).padStart(4, '0');
  return `${lastFour}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { attendeeId, prizeName } = req.body;

  if (!attendeeId || !prizeName) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Get attendee email from database
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('email, claim_id, first_name')
      .eq('id', attendeeId)
      .single();

    if (attendeeError) {
      console.error('Error fetching attendee:', attendeeError);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(500).json({ success: false, error: 'Failed to fetch attendee information' });
    }

    if (!attendee || !attendee.email) {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(404).json({ success: false, error: 'Attendee not found or email missing' });
    }
    
    // Use claim_id from the database if available, otherwise fall back to attendeeId
    const claimIdToFormat = attendee.claim_id
    const formattedClaimNumber = formatRegNumber(claimIdToFormat);

    // Send email with prize confirmation
    try {
      console.log('Sending prize confirmation email to:', attendee.email);
      const { data, error } = await resend.emails.send({
        from: 'noreply@biomebrigade.com',
        to: attendee.email,
        subject: 'Your Biome Brigade Prize Confirmation',
        html: htmlTemplateWithPrizeDetails(prizeName, formattedClaimNumber, attendee.email, attendee.first_name),
      });
      
      if (error) {
        console.error('Email sending error:', error);
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        return res.status(500).json({ success: false, error: 'Failed to send email' });
      }
      
      console.log('Prize confirmation email sent successfully:', data);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in email sending:', error);
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return res.status(500).json({ success: false, error: 'Error sending email' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
  }
}
