/**
 * Weekly Digest Email Template
 * Sent weekly with progress summary
 */

import { baseTemplate } from './base';

export interface WeeklyDigestData {
    userName: string;
    weekRange: string;
    testsCompleted: number;
    averageScore: number;
    rank: number;
    streakDays: number;
    upcomingTests: Array<{
        name: string;
        date: string;
    }>;
}

export function weeklyDigestTemplate(data: WeeklyDigestData): { html: string; text: string } {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const upcomingTestsHtml = data.upcomingTests.length > 0
        ? data.upcomingTests.map(test => `
        <div style="display: flex; justify-content: space-between; align-items: center; 
                    padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
          <span style="color: #475569; font-weight: 500;">${test.name}</span>
          <span style="color: #64748b; font-size: 14px;">${test.date}</span>
        </div>
      `).join('')
        : '<p style="color: #64748b; text-align: center; margin: 0;">No upcoming tests scheduled</p>';

    const html = baseTemplate({
        title: 'Your Weekly Progress Report',
        preheader: `Week of ${data.weekRange} - ${data.testsCompleted} tests completed!`,
        content: `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">📊</div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 10px;">
          Weekly Digest
        </h1>
        <p style="color: #64748b; font-size: 16px;">
          ${data.weekRange}
        </p>
      </div>
      
      <p style="color: #475569; margin-bottom: 24px;">
        Hi ${data.userName}, here's how you performed this week:
      </p>
      
      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
            ${data.testsCompleted}
          </div>
          <div style="font-size: 14px; color: #3b82f6; font-weight: 500;">Tests Completed</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #166534; margin-bottom: 4px;">
            ${data.averageScore}%
          </div>
          <div style="font-size: 14px; color: #16a34a; font-weight: 500;">Average Score</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
            #${data.rank}
          </div>
          <div style="font-size: 14px; color: #d97706; font-weight: 500;">Current Rank</div>
        </div>
        
        <div style="background: linear-gradient(135deg, #fce7f3, #fbcfe8); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: #9d174d; margin-bottom: 4px;">
            ${data.streakDays}
          </div>
          <div style="font-size: 14px; color: #db2777; font-weight: 500;">Day Streak 🔥</div>
        </div>
      </div>
      
      <!-- Upcoming Tests -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 16px 0;">
          📅 Upcoming Tests
        </h3>
        ${upcomingTestsHtml}
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}/dashboard/analytics" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); 
                  color: white; text-decoration: none; padding: 14px 32px; 
                  border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Full Analytics
        </a>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
        <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
          Keep up the great work! Consistency is key to success. 🚀
        </p>
      </div>
    `,
    });

    const upcomingTestsText = data.upcomingTests.length > 0
        ? data.upcomingTests.map(t => `  • ${t.name} - ${t.date}`).join('\n')
        : '  No upcoming tests scheduled';

    const text = `
Hi ${data.userName},

WEEKLY DIGEST - ${data.weekRange}

YOUR STATS:
  Tests Completed: ${data.testsCompleted}
  Average Score: ${data.averageScore}%
  Current Rank: #${data.rank}
  Day Streak: ${data.streakDays} 🔥

UPCOMING TESTS:
${upcomingTestsText}

View full analytics: ${appUrl}/dashboard/analytics

Keep up the great work! Consistency is key to success. 🚀

Best regards,
The SaviEduTech Team
  `.trim();

    return { html, text };
}
