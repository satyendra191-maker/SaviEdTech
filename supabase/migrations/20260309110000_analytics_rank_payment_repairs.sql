-- Features 11-13 compatibility and stabilization
-- Analytics dashboard, rank prediction, and Razorpay payment system

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_type TEXT NOT NULL DEFAULT 'donation' CHECK (payment_type IN ('donation', 'course_purchase', 'subscription')),
    payment_method TEXT NOT NULL DEFAULT 'razorpay',
    transaction_id TEXT UNIQUE,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.payments
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'donation',
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'razorpay',
    ADD COLUMN IF NOT EXISTS transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.payments
SET
    currency = COALESCE(currency, 'INR'),
    payment_method = COALESCE(payment_method, 'razorpay'),
    payment_type = COALESCE(payment_type, 'donation'),
    "timestamp" = COALESCE("timestamp", processed_at, updated_at, created_at, NOW()),
    metadata = COALESCE(metadata, '{}'::jsonb)
WHERE TRUE;

INSERT INTO public.payments (
    user_id,
    amount,
    currency,
    status,
    payment_type,
    payment_method,
    transaction_id,
    razorpay_order_id,
    razorpay_payment_id,
    metadata,
    "timestamp",
    processed_at,
    created_at,
    updated_at
)
SELECT
    d.user_id,
    d.amount,
    COALESCE(d.currency, 'INR'),
    COALESCE(d.status, 'pending'),
    COALESCE(NULLIF(d.metadata ->> 'type', ''), 'donation'),
    'razorpay',
    COALESCE(NULLIF(d.payment_id, ''), NULLIF(d.order_id, ''), d.id::TEXT),
    d.order_id,
    d.payment_id,
    COALESCE(d.metadata, '{}'::jsonb)
        || jsonb_build_object(
            'source_table', 'donations',
            'donor_name', d.donor_name,
            'donor_email', d.donor_email,
            'donor_phone', d.donor_phone
        ),
    COALESCE(d.completed_at, d.updated_at, d.created_at, NOW()),
    d.completed_at,
    d.created_at,
    COALESCE(d.updated_at, d.created_at, NOW())
FROM public.donations d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE (d.order_id IS NOT NULL AND p.razorpay_order_id = d.order_id)
       OR (d.payment_id IS NOT NULL AND p.razorpay_payment_id = d.payment_id)
);

ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_self_select'
    ) THEN
        CREATE POLICY payments_self_select ON public.payments
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_self_insert'
    ) THEN
        CREATE POLICY payments_self_insert ON public.payments
        FOR INSERT TO authenticated
        WITH CHECK (
            user_id = auth.uid()
            OR user_id IS NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_self_update'
    ) THEN
        CREATE POLICY payments_self_update ON public.payments
        FOR UPDATE TO authenticated
        USING (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin')
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin')
            )
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'update_updated_at_column'
    ) THEN
        DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
        CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

ALTER TABLE IF EXISTS public.rank_predictions
    ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS percentile DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS exam_readiness TEXT;

UPDATE public.rank_predictions
SET
    student_id = COALESCE(student_id, user_id),
    percentile = COALESCE(percentile, predicted_percentile),
    exam_readiness = COALESCE(
        exam_readiness,
        CASE
            WHEN COALESCE(percentile, predicted_percentile, 0) >= 95 THEN 'Expert'
            WHEN COALESCE(percentile, predicted_percentile, 0) >= 85 THEN 'Advanced'
            WHEN COALESCE(percentile, predicted_percentile, 0) >= 70 THEN 'Intermediate'
            WHEN COALESCE(percentile, predicted_percentile, 0) >= 50 THEN 'Foundation'
            ELSE 'Beginner'
        END
    )
WHERE TRUE;

CREATE INDEX IF NOT EXISTS idx_payments_user_created_at
    ON public.payments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
    ON public.payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
    ON public.payments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payments_payment_type
    ON public.payments(payment_type);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
    ON public.payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id
    ON public.payments(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_rank_predictions_student_created_at
    ON public.rank_predictions(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_predictions_user_created_at
    ON public.rank_predictions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_predictions_prediction_date
    ON public.rank_predictions(prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_submitted_at
    ON public.test_attempts(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dpp_attempts_user_submitted_at
    ON public.dpp_attempts(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user_strength
    ON public.topic_mastery(user_id, strength_status);
