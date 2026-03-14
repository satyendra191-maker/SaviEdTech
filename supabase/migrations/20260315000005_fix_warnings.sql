-- =============================================================================
-- FIX FUNCTION SEARCH PATH & RLS POLICY WARNINGS
-- =============================================================================

-- Fix function search_path for all functions
ALTER FUNCTION public.apply_referral_by_code SET search_path TO public;
ALTER FUNCTION public.process_signup_referral SET search_path TO public;
ALTER FUNCTION public.sync_premium_ads_removal SET search_path TO public;
ALTER FUNCTION public.sync_career_application_mirror SET search_path TO public;
ALTER FUNCTION public.generate_referral_code SET search_path TO public;
ALTER FUNCTION public.assign_referral_code_to_profile SET search_path TO public;

-- Fix RLS policy on lead_forms - restrict to authenticated users only for INSERT
DROP POLICY IF EXISTS lead_forms_public_insert ON public.lead_forms;
CREATE POLICY lead_forms_authenticated_insert ON public.lead_forms 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow public read for lead_forms (needed for lead submission)
CREATE POLICY lead_forms_public_read ON public.lead_forms 
FOR SELECT USING (true);

-- Note: Enable leaked password protection in Supabase Dashboard
-- Go to: Authentication → Providers → Email → Enable "Prevent username enumeration"
-- Or enable in Supabase Dashboard → Settings → Auth → Email
