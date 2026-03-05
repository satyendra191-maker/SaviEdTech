import { baseTemplate } from './base';

export interface WelcomeEmailData {
    userName: string;
    dashboardUrl: string;
}

export function welcomeTemplate(data: WelcomeEmailData): { html: string; text: string } {
    const html = baseTemplate({
        title: 'Welcome to SaviEduTech!',
        content: `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
        <h1 style="color: #0f172a; font-size: 28px; margin-bottom: 10px;">
          Welcome aboard, ${data.userName}!
        </h1>
        <p style="color: #64748b; font-size: 16px;">
          Your journey to success starts here
        </p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">
          What's next?
        </h2>
        <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Explore your personalized dashboard</li>
          <li>Take a diagnostic test to assess your level</li>
          <li>Set your learning goals and preferences</li>
          <li>Join our community of achievers</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); 
                  color: white; text-decoration: none; padding: 14px 32px; 
                  border-radius: 8px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
          Need help getting started? Reply to this email or contact our support team.<br>
          We're here to help you succeed!
        </p>
      </div>
    `,
    });

    const text = `
Welcome to SaviEduTech, ${data.userName}!

Your journey to success starts here.

What's next?
- Explore your personalized dashboard
- Take a diagnostic test to assess your level
- Set your learning goals and preferences
- Join our community of achievers

Get started: ${data.dashboardUrl}

Need help? Reply to this email or contact our support team.

Best regards,
The SaviEduTech Team
  `.trim();

    return { html, text };
}
