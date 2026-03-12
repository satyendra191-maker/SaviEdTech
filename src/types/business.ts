export type SubscriptionTier = 'free' | 'pro' | 'elite';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthly_price: number;
  yearly_price: number;
  features: SubscriptionFeatures;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionFeatures {
  ad_free: boolean;
  premium_courses: boolean;
  priority_ai_tutor: boolean;
  advanced_analytics: boolean;
  live_classes_access: boolean;
  mock_tests: number;
  download_notes: boolean;
  certificate: boolean;
  mentor_sessions: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  billing_cycle: 'monthly' | 'yearly';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  cancelled_at?: string;
  payment_method?: string;
  razorpay_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  invoice_url?: string;
  paid_at?: string;
  created_at: string;
}

export interface ReferralProgram {
  id: string;
  name: string;
  description?: string;
  reward_type: 'discount' | 'credit' | 'free_course';
  reward_value: number;
  reward_credit_days?: number;
  max_rewards_per_user: number;
  min_purchase_amount: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  program_id?: string;
  used_count: number;
  total_rewards_given: number;
  is_active: boolean;
  created_at: string;
}

export interface ReferralRedemption {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code_id: string;
  program_id?: string;
  reward_type?: string;
  reward_value: number;
  reward_credit_days?: number;
  purchase_amount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  redeemed_at: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  user?: { name: string; email: string };
  status: 'pending' | 'approved' | 'rejected';
  commission_rate: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  payout_method?: 'bank_transfer' | 'upi' | 'paypal';
  payout_details?: {
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    upi_id?: string;
  };
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  course_id?: string;
  link_token: string;
  destination_url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  is_active: boolean;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  link_id?: string;
  user_id: string;
  course_id?: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  paid_at?: string;
  created_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = 'organic' | 'google_ads' | 'facebook' | 'instagram' | 'youtube' | 'referral' | 'newsletter' | 'mock_test' | 'free_lecture' | 'other';

export interface Lead {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  source: LeadSource;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_page?: string;
  interested_course_id?: string;
  interested_course?: { title: string };
  status: LeadStatus;
  assigned_to?: string;
  assignee?: { name: string; email: string };
  follow_up_date?: string;
  notes?: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'conversion';
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LeadScoring {
  id: string;
  lead_id: string;
  score: number;
  engagement_level: 'cold' | 'warm' | 'hot';
  last_calculated: string;
}

export interface CrmStage {
  id: string;
  name: string;
  stage_order: number;
  color: string;
  is_default: boolean;
  created_at: string;
}

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id?: string;
  target_segment?: string;
  target_users?: string[];
  schedule_type: 'immediate' | 'scheduled' | 'triggered';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  open_count: number;
  click_count: number;
  unsubscribes: number;
  status: EmailCampaignStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  trigger_event: string;
  emails: EmailSequenceStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSequenceStep {
  step: number;
  subject: string;
  body: string;
  delay_days: number;
}

export interface EmailSequenceEnrollment {
  id: string;
  user_id: string;
  sequence_id: string;
  current_step: number;
  completed_steps: number[];
  enrolled_at: string;
  completed_at?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
  browser?: string;
  is_active: boolean;
  created_at: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  target_segment?: string;
  target_users?: string[];
  scheduled_at?: string;
  sent_at?: string;
  total_sent: number;
  delivered_count: number;
  opened_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  created_by?: string;
  created_at: string;
}

export type SeoContentStatus = 'draft' | 'review' | 'published' | 'archived';

export interface SeoContent {
  id: string;
  title: string;
  slug: string;
  meta_description?: string;
  keywords?: string[];
  content?: string;
  content_type: 'blog' | 'guide' | 'faq' | 'topic_explanation';
  target_exam?: string;
  target_subject?: string;
  target_topic?: string;
  search_volume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  current_rank?: number;
  target_rank?: number;
  status: SeoContentStatus;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  content_id?: string;
  search_volume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cpc?: number;
  competition_level?: number;
  trending_score?: number;
  last_tracked?: string;
  created_at: string;
}

export interface SeoPerformance {
  id: string;
  content_id: string;
  page_views: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounce_rate: number;
  google_rank?: number;
  recorded_at: string;
}

export type GrowthMetricType = 
  | 'total_users' 
  | 'active_users' 
  | 'new_leads' 
  | 'converted_leads'
  | 'revenue'
  | 'course_enrollments'
  | 'subscription_upgrades'
  | 'test_series_sales'
  | 'referral_conversions'
  | 'affiliate_conversions';

export interface GrowthMetric {
  id: string;
  metric_date: string;
  metric_type: GrowthMetricType;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  created_at: string;
}

export interface CohortAnalytics {
  id: string;
  cohort_date: string;
  cohort_type: 'daily' | 'weekly' | 'monthly';
  total_users: number;
  active_users: number;
  retained_users: number;
  retention_rate: number;
  revenue: number;
  created_at: string;
}

export interface ConversionFunnel {
  id: string;
  funnel_name: string;
  stage: string;
  stage_order: number;
  users_count: number;
  conversion_rate: number;
  recorded_at: string;
}

export interface InstructorProfile {
  id: string;
  user_id: string;
  user?: { name: string; email: string; avatar_url?: string };
  bio?: string;
  expertise?: string[];
  qualifications?: string;
  years_experience?: number;
  students_taught: number;
  avg_rating: number;
  total_reviews: number;
  revenue_share_percentage: number;
  payout_threshold: number;
  total_earnings: number;
  pending_payout: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InstructorPayout {
  id: string;
  instructor_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method?: string;
  transaction_id?: string;
  processed_at?: string;
  created_at: string;
}

export interface CourseSale {
  id: string;
  course_id: string;
  course?: { title: string };
  instructor_id: string;
  instructor?: { name: string };
  buyer_id: string;
  amount: number;
  platform_fee: number;
  instructor_earnings: number;
  sale_date: string;
}

export type CareerProgramType = 'internship' | 'placement' | 'training' | 'apprenticeship';

export interface CareerProgram {
  id: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  salary_range?: string;
  requirements?: string[];
  skills_required?: string[];
  program_type: CareerProgramType;
  duration_weeks?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerApplication {
  id: string;
  user_id: string;
  program_id: string;
  program?: CareerProgram;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  resume_url?: string;
  cover_letter?: string;
  applied_at: string;
  updated_at: string;
}

export interface CareerEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  program?: CareerProgram;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress_percentage: number;
  enrolled_at: string;
  completed_at?: string;
}

export interface CareerProgress {
  id: string;
  enrollment_id: string;
  module: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id?: string;
  donor_name?: string;
  donor_email?: string;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  razorpay_payment_id?: string;
  is_anonymous: boolean;
  message?: string;
  receipt_url?: string;
  donated_at: string;
}

export interface TestSeries {
  id: string;
  title: string;
  description?: string;
  exam_type?: string;
  price: number;
  total_tests: number;
  is_active: boolean;
  created_at: string;
}

export interface TestSeriesEnrollment {
  id: string;
  user_id: string;
  test_series_id: string;
  test_series?: TestSeries;
  enrolled_at: string;
  expires_at?: string;
}
