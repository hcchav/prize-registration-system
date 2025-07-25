import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function htmlTemplateWithPrizeDetails(prizeName: string, claimNumber: string, recipientEmail: string, firstName: string) {
  const logoUrl = 'https://prize-registration-system.vercel.app/images/prizes/Mockup.png';
  const confirmationBannerUrl = 'https://prize-registration-system.vercel.app/images/prizes/confirmation-banner-1920x1080.png';
  
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
          font-weight: 700;
          color: #418fde;
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
                <div class="fallback-bg">
                  <img src="${confirmationBannerUrl}" alt="Prize Confirmation" style="width: 100%; height: auto; display: block;" />
                </div>
                <div style="padding: 30px 20px 0 20px;">
                  <p style="font-size: 20px; font-weight: 700; color: #00263a; text-align: center; line-height: 1.6; margin: 0 0 10px 0;">
                    Congratulations, ${firstName || 'Friend'}!
                  </p>
                  <p style="font-size: 16px; color: #00263a; text-align: center; line-height: 1.6; margin: 0 0 20px 0;">
                  You have won a:
                  </p>                 
                  <div class="prize-name">
                    ${prizeName}
                  </div>
                 
                                
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0 0;">
              <div style="border-radius: 10px; overflow: hidden; max-width: 340px; margin: 0 auto;">
                <div style="padding: 2px; text-align: center;">
                  <h2 style="font-size: 24px; font-weight: 700; color: #00263a; margin: 0 0 10px 0;">Interested in Biome Brigade products?</h2>
                  <p style="font-size: 18px; line-height: 1.6; margin: 0 0 25px 0;">
                    <span style="color: #418fde; font-weight: 700;">Let's talk!</span> Schedule a quick call to learn more about our products!
                  </p>
                  <a href="https://calendly.com/reggie-biomebrigade/30min-1" style="display: inline-block; background-color: #418fde; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 18px; font-weight: 700; margin: 0 0 25px 0; width: 200px">Schedule a Call</a>
                  <p style="font-size: 18px; color: #00263a; margin: 0;">We're excited to connect!</p>
                </div>
              </div>
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

// Helper function to send the email
async function sendEmail(attendeeId: string, prizeName: string) {
  try {
    // Get attendee email from database
    const { data: attendee, error: attendeeError } = await supabase
      .from('attendees')
      .select('email, claim_id, first_name')
      .eq('id', attendeeId)
      .single();

    if (attendeeError) {
      console.error('Error fetching attendee:', attendeeError);
      return { success: false, error: 'Failed to fetch attendee information' };
    }

    if (!attendee || !attendee.email) {
      return { success: false, error: 'Attendee not found or email missing' };
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
        return { success: false, error: 'Failed to send email' };
      }
      
      console.log('Prize confirmation email sent successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Error in email sending:', error);
      return { success: false, error: 'Error sending email' };
    }
  } catch (error) {
    console.error('Unexpected error in email sending:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
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
    console.log('Received prize confirmation request for:', { 
      attendeeId, 
      prizeName 
    });

    // Send email immediately
    const result = await sendEmail(attendeeId, prizeName);
    
    // Return response to client
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to send email' 
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
  }
}
