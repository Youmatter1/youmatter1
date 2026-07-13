import sendgrid from '@sendgrid/mail';

/**
 * SendGrid Web API Configuration
 * Configure via environment variables in .env.local
 */

// Initialize SendGrid with API key (lazy initialization)
function initializeSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (apiKey) {
    sendgrid.setApiKey(apiKey);
  }
  return !!apiKey;
}

// Get default from address (lazy evaluation)
function getDefaultFrom() {
  return {
    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@youmatter.com',
    name: process.env.SENDGRID_FROM_NAME || 'You Matter',
  };
}

// Email templates (for when not using SendGrid dynamic templates)
export const emailTemplates = {
  confirmation: (data: {
    patientName: string;
    mentorName: string;
    date: string;
    time: string;
    meetingLink: string;
  }) => ({
    subject: 'Session confirmed - youmatter',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 2px; background: #f8f9fa; }
          .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
          .icon { width: 48px; height: 48px; margin: 0 auto 15px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
          .button:hover { background: #606060; }
          .details { background: #f0f0f0; padding: 25px; border-left: 4px solid #404040; margin: 25px 0; border-radius: 8px; }
          .details h3 { margin: 0 0 15px 0; color: #404040; font-size: 18px; display: flex; align-items: center; gap: 8px; }
          .details p { margin: 8px 0; color: #1a1a1a; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
          .note { background: #fafafa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h1>Study Session Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            <p>Your study session has been successfully booked.</p>
            
            <div class="details">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#404040" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Session Details
              </h3>
              <p><strong>Mentor:</strong> ${data.mentorName}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Duration:</strong> 45 minutes</p>
            </div>
            
            <p>Join your session at the scheduled time using the link below:</p>
            <center>
              <a href="${data.meetingLink}" class="button">Join Study Session</a>
            </center>
            
            <div class="note">
              <strong>Note:</strong> You will receive reminder emails 24 hours and 1 hour before your session.
            </div>
          </div>
          <div class="footer">
            <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  reminder24h: (data: {
    patientName: string;
    mentorName: string;
    date: string;
    time: string;
    meetingLink: string;
  }) => ({
    subject: 'Reminder: Study Session Tomorrow - youmatter',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 2px; background: #f8f9fa; }
          .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #a0a0a0; }
          .icon { width: 48px; height: 48px; margin: 0 auto 15px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
          .button:hover { background: #606060; }
          .details { background: #f0f0f0; padding: 25px; border-left: 4px solid #a0a0a0; margin: 25px 0; border-radius: 8px; }
          .details h3 { margin: 0 0 15px 0; color: #404040; font-size: 18px; display: flex; align-items: center; gap: 8px; }
          .details p { margin: 8px 0; color: #1a1a1a; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#a0a0a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h1>Study Session Tomorrow</h1>
          </div>
          <div class="content">
            <p>Hello ${data.patientName},</p>
            <p>This is a friendly reminder that you have a study session scheduled tomorrow.</p>
            
            <div class="details">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#404040" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Session Details
              </h3>
              <p><strong>Mentor:</strong> ${data.mentorName}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
            </div>
            
            <center>
              <a href="${data.meetingLink}" class="button">Join Study Session</a>
            </center>
            
            <p style="margin-top: 25px; color: #666; font-size: 14px;">Please make sure you're available at the scheduled time. If you need to cancel, please do so at least 6 hours in advance.</p>
          </div>
          <div class="footer">
            <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  reminder1h: (data: {
    patientName: string;
    mentorName: string;
    time: string;
    meetingLink: string;
  }) => ({
    subject: 'Study Session Starting Soon - youmatter',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 2px; background: #f8f9fa; }
          .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #c0c0c0; }
          .icon { width: 48px; height: 48px; margin: 0 auto 15px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #404040; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 700; font-size: 16px; }
          .button:hover { background: #606060; }
          .urgent { background: #e0e0e0; color: #1a1a1a; padding: 20px; border-radius: 8px; text-align: center; font-weight: 600; margin: 25px 0; border: 2px solid #c0c0c0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
          .tip { background: #fafafa; padding: 15px; border-radius: 8px; margin-top: 25px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#c0c0c0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 6V12L16 14" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h1>Starting in 1 Hour</h1>
          </div>
          <div class="content">
            <div class="urgent">
              Your study session with ${data.mentorName} starts at ${data.time}
            </div>
            
            <p>Hello ${data.patientName},</p>
            <p>Your study session is starting in 1 hour. Please make sure you're ready to join.</p>
            
            <center>
              <a href="${data.meetingLink}" class="button">JOIN NOW</a>
            </center>
            
            <div class="tip">
              <strong>Tip:</strong> We recommend joining a few minutes early to test your camera and microphone.
            </div>
          </div>
          <div class="footer">
            <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  organizationInvite: (data: {
    recipientName: string;
    organizationName: string;
    orgRole: 'therapist' | 'member';
    acceptLink: string;
  }) => {
    const roleLabel = data.orgRole === 'therapist' ? 'Therapist' : 'Member';
    return {
      subject: `${data.organizationName} has invited you to You Matter`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 2px; background: #f8f9fa; }
          .header { background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 26px; font-weight: 600; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .role-badge { background: #ecfdf5; color: #16a34a; padding: 6px 14px; border-radius: 20px; display: inline-block; margin: 16px 0; font-weight: 600; font-size: 13px; }
          .button { display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
          .button:hover { background: #15803d; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
          .note { background: #fafafa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 13px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've Been Invited</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p><strong>${data.organizationName}</strong> has invited you to join their wellness program on You Matter.</p>
            <div class="role-badge">Joining as: ${roleLabel}</div>
            <p>Click the button below to set up your account and get started:</p>
            <center>
              <a href="${data.acceptLink}" class="button">Accept Invitation</a>
            </center>
            <div class="note">This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore this email.</div>
          </div>
          <div class="footer">
            <p>© 2026 You Matter. You don't have to heal alone.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
  },

  invite: (data: {
    recipientName: string;
    senderName: string;
    mentorName: string;
    message?: string;
    acceptLink: string;
  }) => ({
    subject: `${data.senderName} invited you to a study session - youmatter`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 2px; background: #f8f9fa; }
          .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
          .icon { width: 48px; height: 48px; margin: 0 auto 15px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
          .button:hover { background: #606060; }
          .message { background: #f0f0f0; padding: 20px; border-left: 4px solid #404040; margin: 25px 0; font-style: italic; border-radius: 8px; color: #1a1a1a; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8L10.89 13.26C11.5308 13.6728 12.4692 13.6728 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="#404040" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h1>You've Been Invited</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipientName},</p>
            <p>${data.senderName} has invited you to join a study session with <strong>${data.mentorName}</strong>.</p>
            
            ${data.message ? `<div class="message">"${data.message}"</div>` : ''}
            
            <p>Accept this invitation to book your study session automatically:</p>
            
            <center>
              <a href="${data.acceptLink}" class="button">Accept Invitation</a>
            </center>
            
            <p style="color: #666; font-size: 13px; margin-top: 30px;">
              This invitation was sent by ${data.senderName} through youmatter.Academy.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

/**
 * Send email using SendGrid Web API
 * @param to - Recipient email address
 * @param template - Email template with subject and html
 * @returns Promise with success status
 */
export async function sendEmail(
  to: string,
  template: { subject: string; html: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Initialize SendGrid with API key
    if (!initializeSendGrid()) {
      console.log('SendGrid not configured. Email would be sent to:', to);
      console.log(' Subject:', template.subject);
      console.log(' Set SENDGRID_API_KEY in .env.local to enable emails');
      return { success: true, message: 'SendGrid not configured (development mode)' };
    }

    const msg = {
      to,
      from: getDefaultFrom(),
      subject: template.subject,
      html: template.html,
    };

    await sendgrid.send(msg);

    console.log('Email sent successfully to:', to);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('Email sending failed:', error);

    // SendGrid specific error handling
    if (error.response) {
      console.error('SendGrid Error Response:', error.response.body);
      return {
        success: false,
        error: error.response.body.errors?.[0]?.message || error.message
      };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send email using SendGrid Dynamic Template
 * @param to - Recipient email address
 * @param templateId - SendGrid dynamic template ID (e.g., 'd-xxxxx')
 * @param dynamicData - Template variables
 * @returns Promise with success status
 */
export async function sendTemplateEmail(
  to: string,
  templateId: string,
  dynamicData: Record<string, any>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Initialize SendGrid with API key
    if (!initializeSendGrid()) {
      console.log('Warning: SendGrid not configured. Template email would be sent to:', to);
      console.log('   Template ID:', templateId);
      console.log('   Data:', dynamicData);
      return { success: true, message: 'SendGrid not configured (development mode)' };
    }

    const msg = {
      to,
      from: getDefaultFrom(),
      templateId,
      dynamicTemplateData: dynamicData,
    };

    await sendgrid.send(msg);

    console.log('Template email sent successfully to:', to);
    console.log('  Template ID:', templateId);
    return { success: true, message: 'Template email sent successfully' };
  } catch (error: any) {
    console.error('Template email sending failed:', error);

    // SendGrid specific error handling
    if (error.response) {
      console.error('SendGrid Error Response:', error.response.body);
      return {
        success: false,
        error: error.response.body.errors?.[0]?.message || error.message
      };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send institution approval email
 */
export async function sendInstitutionApprovalEmail(data: {
  to: string;
  institutionName: string;
  adminName: string;
}) {
  if (!initializeSendGrid()) {
    console.warn('SendGrid not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const from = getDefaultFrom();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 20px 0; font-weight: 600; }
        .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
        .next-steps { background: #f0f0f0; padding: 25px; border-left: 4px solid #404040; margin: 25px 0; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Partnership Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.adminName},</p>
          
          <div class="success-badge">Verification Complete</div>
          
          <p>We are thrilled to inform you that <strong>${data.institutionName}</strong> has been successfully verified and approved as an youmatter partner institution!</p>
          
          <p>Your commitment to supporting African youth education aligns perfectly with our mission, and we look forward to making a meaningful impact together.</p>
          
          <div class="next-steps">
            <h3 style="margin: 0 0 15px 0; color: #404040;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li style="margin: 8px 0;">Log in to your institutional dashboard</li>
              <li style="margin: 8px 0;">Complete your institution profile</li>
              <li style="margin: 8px 0;">Onboard your education mentors</li>
              <li style="margin: 8px 0;">Start creating educational content</li>
            </ol>
          </div>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="button">
              Access Your Dashboard →
            </a>
          </center>
          
          <p>If you have any questions or need assistance getting started, our support team is here to help.</p>
          
          <p>Welcome to the youmatter family!</p>
          
          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>The youmatter Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to: data.to,
      from,
      subject: `Partnership Approved - Welcome to youmatter!`,
      html: htmlContent,
    });

    return { success: true, message: 'Approval email sent successfully' };
  } catch (error: any) {
    console.error('Failed to send approval email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send institution rejection email
 */
export async function sendInstitutionRejectionEmail(data: {
  to: string;
  institutionName: string;
  adminName: string;
  reason: string;
}) {
  if (!initializeSendGrid()) {
    console.warn('SendGrid not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const from = getDefaultFrom();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .reason-box { background: #fef3f2; padding: 20px; border-left: 4px solid #dc2626; margin: 25px 0; border-radius: 8px; }
        .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Partnership Application Update</h1>
        </div>
        <div class="content">
          <p>Dear ${data.adminName},</p>
          
          <p>Thank you for your interest in partnering with youmatter.Academy and your commitment to supporting youth education.</p>
          
          <p>After careful review, we regret to inform you that we are unable to approve <strong>${data.institutionName}</strong>'s partnership application at this time.</p>
          
          <div class="reason-box">
            <h3 style="margin: 0 0 10px 0; color: #dc2626;">Reason</h3>
            <p style="margin: 0;">${data.reason}</p>
          </div>
          
          <p>We encourage you to address the concerns outlined above and resubmit your application when ready. Our team is committed to building a network of high-quality partners who can best serve African youth.</p>
          
          <p>If you have questions about this decision or need clarification on the requirements, please don't hesitate to reach out to our support team.</p>
          
          <center>
            <a href="mailto:support@youmatter.com" class="button">
              Contact Support
            </a>
          </center>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The youmatter Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to: data.to,
      from,
      subject: `Partnership Application Update - youmatter`,
      html: htmlContent,
    });

    return { success: true, message: 'Rejection email sent successfully' };
  } catch (error: any) {
    console.error('Failed to send rejection email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  if (!initializeSendGrid()) {
    console.log('SendGrid not configured. Password reset link would be sent to:', email);
    console.log('   Token:', token);
    console.log('   Link:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`);
    return { success: true, message: 'SendGrid not configured (development mode)' };
  }
  //we have updated the reset link
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const from = getDefaultFrom();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #404040; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password for your youmatter.Academy account.</p>
          <p>Click the button below to set a new password:</p>
          
          <center>
            <a href="${resetLink}" class="button">Reset Password</a>
          </center>
          
          <p>If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
        </div>
        <div class="footer">
          <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to: email,
      from,
      subject: 'Reset your password - youmatter',
      html: htmlContent,
    });

    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify SendGrid API connection
 * Note: SendGrid Web API doesn't have a direct "verify" endpoint,
 * so we'll check if the API key is set
 */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  console.log('SendGrid API key is configured');
  return true;
}

/**
 * Send therapist approval email
 */
export async function sendtherapistApprovalEmail(data: {
  to: string;
  therapistName: string;
}) {
  if (!initializeSendGrid()) {
    console.warn('SendGrid not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const from = getDefaultFrom();
  const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?redirect=/clinician`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 20px 0; font-weight: 600; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Approved — Welcome to You Matter!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.therapistName},</p>

          <div class="success-badge">✓ Application Approved</div>

          <p>Congratulations! Your application to join <strong>You Matter</strong> as a licensed therapist has been reviewed and approved.</p>

          <p>You can now log in to your dashboard to set your availability, complete your profile, and start accepting patients.</p>

          <center>
            <a href="${dashboardLink}" class="button">
              Go to My Dashboard
            </a>
          </center>

          <p>If you have any questions as you get started, please don't hesitate to reach out to our support team.</p>

          <p style="margin-top: 30px;">
            Warm regards,<br>
            <strong>The You Matter Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 You Matter. You don't have to heal alone.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to: data.to,
      from,
      subject: `Welcome to youmatter! Application Approved`,
      html: htmlContent,
    });

    return { success: true, message: 'Approval email sent successfully' };
  } catch (error: any) {
    console.error('Failed to send approval email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send therapist rejection email
 */
export async function sendtherapistRejectionEmail(data: {
  to: string;
  therapistName: string;
  reason: string;
}) {
  if (!initializeSendGrid()) {
    console.warn('SendGrid not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const from = getDefaultFrom();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
        .header { background: linear-gradient(to right, #fafafa, #f0f0f0, #fafafa); color: #1a1a1a; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 3px solid #404040; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .reason-box { background: #fef3f2; padding: 20px; border-left: 4px solid #dc2626; margin: 25px 0; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 13px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <p>Dear ${data.therapistName},</p>
          
          <p>Thank you for your interest in joining You Matter as a licensed therapist.</p>

          <p>After reviewing your application, we regret to inform you that we are unable to move forward with your registration at this time.</p>
          
          <div class="reason-box">
            <h3 style="margin: 0 0 10px 0; color: #dc2626;">Reason</h3>
            <p style="margin: 0;">${data.reason}</p>
          </div>
          
          <p>We appreciate the time you took to apply and wish you the best in your future endeavors.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>The youmatter Team</strong>
          </p>
        </div>
        <div class="footer">
          <p>© 2025 youmatter. Level up your academic journey, one session at a time.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to: data.to,
      from,
      subject: `youmatter Application Update`,
      html: htmlContent,
    });

    return { success: true, message: 'Rejection email sent successfully' };
  } catch (error: any) {
    console.error('Failed to send rejection email:', error);
    return { success: false, error: error.message };
  }
}