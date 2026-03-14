-- =============================================================================
-- FIX FUNCTION SEARCH PATH WARNINGS ONLY
-- =============================================================================

-- Fix function search_path
ALTER FUNCTION public.apply_referral_by_code SET search_path TO public;
ALTER FUNCTION public.process_signup_referral SET search_path TO public;
ALTER FUNCTION public.sync_premium_ads_removal SET search_path TO public;
ALTER FUNCTION public.sync_career_application_mirror SET search_path TO public;
ALTER FUNCTION public.generate_referral_code SET search_path TO public;
ALTER FUNCTION public.assign_referral_code_to_profile SET search_path TO public;
