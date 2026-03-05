import { baseTemplate } from './base';

export interface TestReminderData {
    userName: string;
    testName: string;
    testDate: string;
    testTime: string;
    testUrl: string;
    timeRemaining: string;
}

export function testReminderTemplate(data: TestReminderData): { html: string; text: string } {
    const html = baseTemplate({
        title: `Reminder: ${data.testName}`,
        preheader: `Your test is ${data.timeRemaining}. Get ready!`,
        content: `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">⏰</div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 10px;">
          Test Reminder
        </h1>
        <p style="color: #64748b; font-size: 16px;">
          Hi ${data.userName}, your test is coming up soon!
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; font-size: 20px; margin: 0 0 16px 0;">
          ${data.testName}
        </h2>
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px;">
            <p style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">Date</p>
            <p style="margin: 0; color: #78350f; font-size: 16px; font-weight: 600;">${data.testDate}</p>
          </div>
          <div style="flex: 1; min-width: 120px;">
            <p style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">Time</p>
            <p style="margin: 0; color: #78350f; font-size: 16px; font-weight: 600;">${data.testTime}</p>
          </div>
          <div style="flex: 1; min-width: 120px;">
            <p style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">Starting In</p>
            <p style="margin: 0; color: #dc2626; font-size: 16px; font-weight: 700;">${data.timeRemaining}</p>
          </div>
        </div>
      </div>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #166534; font-size: 16px; margin: 0 0 12px 0;">
          📋 Pre-Test Checklist
        </h3>
        <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Ensure stable internet connection</li>
          <li>Keep your ID proof ready</li>
          <li>Find a quiet place with good lighting</li>
          <li>Have a pen and paper for rough work</li>
          <li>Join 10 minutes before the start time</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.testUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); 
                  color: white; text-decoration: none; padding: 14px 32px; 
                  border-radius: 8px; font-weight: 600; font-size: 16px;">
          Join Test Now
        </a>
      </div>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-top: 24px; border-left: 4px solid #ef4444;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          <strong>Note:</strong> Once the test starts, you won't be able to join. Please be on time!
        </p>
      </div>
    `,
    });

    const text = `
Hi ${data.userName},

TEST REMINDER: ${data.testName}

Date: ${data.testDate}
Time: ${data.testTime}
Starting In: ${data.timeRemaining}

PRE-TEST CHECKLIST:
- Ensure stable internet connection
- Keep your ID proof ready
- Find a quiet place with good lighting
- Have a pen and paper for rough work
- Join 10 minutes before the start time

Join the test: ${data.testUrl}

IMPORTANT: Once the test starts, you won't be able to join. Please be on time!

Best of luck!
The SaviEduTech Team
  `.trim();

    return { html, text };
}
