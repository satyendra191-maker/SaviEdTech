/**
 * Password Reset Email Template
 * Sent when user requests password reset
 */

import { baseTemplate } from './base';

export interface PasswordResetData {
    userName: string;
    resetUrl: string;
    expiresIn: string;
}

export function passwordResetTemplate(data: PasswordResetData): { html: string; text: string } {
    const html = baseTemplate({
        title: 'Password Reset Request',
        preheader: 'Reset your password securely',
        content: `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">🔐</div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 10px;">
          Password Reset Request
        </h1>
        <p style="color: #64748b; font-size: 16px;">
          Hi ${data.userName}, we received a request to reset your password
        </p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
          You recently requested to reset your password for your SaviEduTech account. 
          Click the button below to reset it.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.resetUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); 
                    color: white; text-decoration: none; padding: 14px 32px; 
                    border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin: 0; text-align: center;">
          Or copy and paste this link into your browser:<br>
          <a href="${data.resetUrl}" style="color: #3b82f6; word-break: break-all;">${data.resetUrl}</a>
        </p>
      </div>
      
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⏰ This link expires in ${data.expiresIn}</strong><br>
          For security reasons, this password reset link will expire. 
          If you don't use it within ${data.expiresIn}, you'll need to request a new one.
        </p>
      </div>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          <strong>Didn't request this?</strong><br>
          If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged. If you're concerned about your account's security, 
          please contact our support team immediately.
        </p>
      </div>
    `,
    });

    const text = `
Hi ${data.userName},

PASSWORD RESET REQUEST

You recently requested to reset your password for your SaviEduTech account.

Reset your password: ${data.resetUrl}

This link expires in ${data.expiresIn}.

DIDN'T REQUEST THIS?
If you didn't request a password reset, you can safely ignore this email. 
Your password will remain unchanged. If you're concerned about your account's 
security, please contact our support team immediately.

Best regards,
The SaviEduTech Team
  `.trim();

    return { html, text };
}
