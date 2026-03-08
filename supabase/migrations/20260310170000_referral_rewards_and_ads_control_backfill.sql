-- =============================================================================
-- REFERRAL REWARDS + ADS CONTROL + PREMIUM ADS-FREE SYNC (BACKFILL)
-- =============================================================================
-- Replays the referral + ads-control migration in a timestamp slot that is
-- newer than the legacy remote checkpoint. All statements are idempotent.

BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS referral_code TEXT,
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ads_disabled_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ads_disabled_permanent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique
    ON public.profiles (referral_code)
    WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
    ON public.profiles (referred_by);

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
    reward_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id
    ON public.referrals (referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_created_at
    ON public.referrals (created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
    ON public.referrals
    FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

DROP POLICY IF EXISTS "Service role can manage referrals" ON public.referrals;
CREATE POLICY "Service role can manage referrals"
    ON public.referrals
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_attempts INTEGER := 0;
BEGIN
    LOOP
        v_code := UPPER(SUBSTRING(MD5(p_user_id::TEXT || '-' || CLOCK_TIMESTAMP()::TEXT || '-' || RANDOM()::TEXT), 1, 8));
        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE referral_code = v_code
        );

        v_attempts := v_attempts + 1;
        IF v_attempts > 10 THEN
            v_code := UPPER(SUBSTRING(REPLACE(p_user_id::TEXT, '-', ''), 1, 8));
            EXIT;
        END IF;
    END LOOP;

    RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_by_code(
    p_referee_id UUID,
    p_referral_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_code TEXT;
    v_referrer_id UUID;
    v_referral_id UUID;
    v_referral_count INTEGER;
BEGIN
    v_code := UPPER(REGEXP_REPLACE(COALESCE(TRIM(p_referral_code), ''), '[^A-Z0-9]', '', 'g'));
    IF v_code = '' THEN
        RETURN FALSE;
    END IF;

    SELECT id
    INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_code
    LIMIT 1;

    IF v_referrer_id IS NULL OR v_referrer_id = p_referee_id THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.referrals
        WHERE referee_id = p_referee_id
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.referrals (referrer_id, referee_id, referral_code)
    VALUES (v_referrer_id, p_referee_id, v_code)
    RETURNING id INTO v_referral_id;

    UPDATE public.profiles
    SET referred_by = v_referrer_id
    WHERE id = p_referee_id
      AND referred_by IS NULL;

    UPDATE public.profiles
    SET referral_count = COALESCE(referral_count, 0) + 1
    WHERE id = v_referrer_id
    RETURNING referral_count INTO v_referral_count;

    IF MOD(COALESCE(v_referral_count, 0), 4) = 0 THEN
        UPDATE public.profiles
        SET ads_disabled_until = GREATEST(COALESCE(ads_disabled_until, NOW()), NOW()) + INTERVAL '7 days'
        WHERE id = v_referrer_id
          AND COALESCE(ads_disabled_permanent, FALSE) = FALSE;

        UPDATE public.referrals
        SET reward_granted = TRUE,
            reward_type = 'ads_removed_7_days'
        WHERE id = v_referral_id;
    END IF;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_referral_code_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.referral_code IS NULL OR TRIM(NEW.referral_code) = '' THEN
        NEW.referral_code := public.generate_referral_code(NEW.id);
    ELSE
        NEW.referral_code := UPPER(NEW.referral_code);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code_to_profile ON public.profiles;
CREATE TRIGGER trg_assign_referral_code_to_profile
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_referral_code_to_profile();

CREATE OR REPLACE FUNCTION public.process_signup_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_referred_by_code TEXT;
BEGIN
    SELECT NULLIF(TRIM(au.raw_user_meta_data ->> 'referred_by_code'), '')
    INTO v_referred_by_code
    FROM auth.users au
    WHERE au.id = NEW.id;

    IF v_referred_by_code IS NOT NULL THEN
        PERFORM public.apply_referral_by_code(NEW.id, v_referred_by_code);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_signup_referral ON public.profiles;
CREATE TRIGGER trg_process_signup_referral
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.process_signup_referral();

CREATE OR REPLACE FUNCTION public.sync_premium_ads_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.subscription_status = 'premium' THEN
        UPDATE public.profiles
        SET ads_disabled_permanent = TRUE
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_premium_ads_removal ON public.student_profiles;
CREATE TRIGGER trg_sync_premium_ads_removal
    AFTER INSERT OR UPDATE OF subscription_status ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_premium_ads_removal();

UPDATE public.profiles p
SET referral_code = public.generate_referral_code(p.id)
WHERE p.referral_code IS NULL
   OR TRIM(p.referral_code) = '';

UPDATE public.profiles p
SET ads_disabled_permanent = TRUE
FROM public.student_profiles sp
WHERE sp.id = p.id
  AND sp.subscription_status = 'premium'
  AND COALESCE(p.ads_disabled_permanent, FALSE) = FALSE;

COMMIT;
