/**
 * Email Module
 * Export all email-related functionality
 */

// Main email service
export {
  sendEmail,
  sendBatchEmails,
  sendWelcomeEmail,
  sendTestReminderEmail,
  sendPasswordResetEmail,
  sendWeeklyDigestEmail,
  sendCourseCompletionEmail,
  validateEmail,
  getEmailStats,
  type EmailType,
  type EmailOptions,
  type EmailData,
  type EmailResult,
  type BatchEmailResult,
  type WelcomeEmailData,
  type TestReminderData,
  type PasswordResetData,
  type WeeklyDigestData,
  type CourseCompletionData,
  type CustomEmailData,
} from './email-service';

// Templates
export {
  baseTemplate,
  welcomeTemplate,
  testReminderTemplate,
  passwordResetTemplate,
  weeklyDigestTemplate,
  courseCompletionTemplate,
} from './templates';
