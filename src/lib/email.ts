import { Resend } from 'resend';

// Log at module load to check env
console.log('[Email] Module loaded, RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@storepilot.app';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  storeName: string;
  role: string;
  token: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  storeName,
  role,
  token,
}: SendInvitationEmailParams) {
  console.log('Sending invitation email to:', to);
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('FROM_EMAIL:', fromEmail);

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Email not sent.');
    return { success: false, error: 'Email service not configured - RESEND_API_KEY missing' };
  }

  const inviteUrl = `${siteUrl}/invite/${token}`;

  const roleDescription = {
    admin: 'Admin - Full access except ownership',
    manager: 'Manager - Can manage inventory and view reports',
    staff: 'Staff - Can perform daily operations',
  }[role] || role;

  try {
    console.log('Calling resend.emails.send with from:', `StorePilot <${fromEmail}>`);
    const { data, error } = await resend.emails.send({
      from: `StorePilot <${fromEmail}>`,
      to,
      subject: `${inviterName} invited you to join ${storeName} on StorePilot`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="margin: 0 0 20px; font-size: 24px; color: #111827;">You're Invited!</h1>

                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #374151;">
                          <strong>${inviterName}</strong> has invited you to join <strong>${storeName}</strong> as a <strong>${role}</strong> on StorePilot.
                        </p>

                        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Your role:</p>
                          <p style="margin: 0; font-size: 14px; color: #111827;">${roleDescription}</p>
                        </div>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center">
                              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                          This invitation will expire in 7 days. If you don't have a StorePilot account yet, you'll be able to create one when you accept.
                        </p>

                        <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
                          If the button doesn't work, copy and paste this link into your browser:<br>
                          <a href="${inviteUrl}" style="color: #6b7280; word-break: break-all;">${inviteUrl}</a>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table width="600" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 20px; font-size: 12px; color: #9ca3af;">
                        <p style="margin: 0;">© ${new Date().getFullYear()} StorePilot. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `You're Invited!\n\n${inviterName} has invited you to join ${storeName} as a ${role} on StorePilot.\n\nYour role: ${roleDescription}\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation will expire in 7 days. If you don't have a StorePilot account yet, you'll be able to create one when you accept.`,
    });

    console.log('Resend response - data:', data, 'error:', error);

    if (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully, ID:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Exception sending invitation email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `StorePilot <${fromEmail}>`,
      to,
      subject: 'Reset your StorePilot password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px;">
                        <h1 style="margin: 0 0 20px; font-size: 24px; color: #111827;">Reset Your Password</h1>

                        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #374151;">
                          We received a request to reset your StorePilot password. Click the button below to create a new password.
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                          This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table width="600" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 20px; font-size: 12px; color: #9ca3af;">
                        <p style="margin: 0;">© ${new Date().getFullYear()} StorePilot. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `Reset Your Password\n\nWe received a request to reset your StorePilot password. Click the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.`,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
