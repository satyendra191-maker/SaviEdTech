import { baseTemplate } from './base';

export interface CourseCompletionData {
    userName: string;
    courseName: string;
    completionDate: string;
    certificateUrl?: string;
    nextCourseUrl?: string;
}

export function courseCompletionTemplate(data: CourseCompletionData): { html: string; text: string } {
    const html = baseTemplate({
        title: `Congratulations on completing ${data.courseName}!`,
        preheader: `You've successfully completed ${data.courseName}. Great job!`,
        content: `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 60px; margin-bottom: 20px;">🎓</div>
        <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 10px;">
          Course Completed!
        </h1>
        <p style="color: #64748b; font-size: 16px;">
          Congratulations, ${data.userName}!
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <h2 style="color: #92400e; font-size: 20px; margin: 0 0 8px 0;">
          ${data.courseName}
        </h2>
        <p style="color: #78350f; margin: 0; font-size: 14px;">
          Completed on ${data.completionDate}
        </p>
      </div>
      
      <p style="color: #475569; margin-bottom: 24px; line-height: 1.6; text-align: center;">
        You've successfully completed the course and taken another step towards your goals. 
        Your dedication and hard work are truly commendable!
      </p>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #166534; font-size: 16px; margin: 0 0 12px 0; text-align: center;">
          🏆 What's Next?
        </h3>
        <ul style="color: #15803d; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Download your certificate of completion</li>
          <li>Share your achievement with friends and family</li>
          <li>Continue learning with advanced courses</li>
          <li>Practice with more tests to reinforce your knowledge</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        ${data.certificateUrl ? `
        <a href="${data.certificateUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); 
                  color: white; text-decoration: none; padding: 14px 32px; 
                  border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 8px 0;">
          📜 Download Certificate
        </a>
        ` : ''}
        ${data.nextCourseUrl ? `
        <a href="${data.nextCourseUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); 
                  color: white; text-decoration: none; padding: 14px 32px; 
                  border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 0 8px 8px;">
          Continue Learning →
        </a>
        ` : ''}
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
        <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
          "Success is the sum of small efforts, repeated day in and day out."<br>
          <strong style="color: #3b82f6;">Keep learning, keep growing! 🚀</strong>
        </p>
      </div>
    `,
    });

    const text = `
🎓 COURSE COMPLETED!

Congratulations, ${data.userName}!

You've successfully completed:
  ${data.courseName}
  Completed on: ${data.completionDate}

You've taken another step towards your goals. Your dedication and hard work are truly commendable!

WHAT'S NEXT?
- Download your certificate of completion
- Share your achievement with friends and family
- Continue learning with advanced courses
- Practice with more tests to reinforce your knowledge

${data.certificateUrl ? `Download Certificate: ${data.certificateUrl}\n` : ''}${data.nextCourseUrl ? `Continue Learning: ${data.nextCourseUrl}\n` : ''}
"Success is the sum of small efforts, repeated day in and day out."
Keep learning, keep growing! 🚀

Best regards,
The SaviEduTech Team
  `.trim();

    return { html, text };
}
