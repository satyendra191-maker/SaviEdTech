-- Financial, accounting, and GST compliance system
-- Adds double-entry ledger, invoice/receipt registry, GST report snapshots, and finance audit trail.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'admin', 'content_manager', 'super_admin', 'parent', 'hr', 'finance_manager'));

CREATE OR REPLACE FUNCTION public.savi_finance_number(
    prefix_value TEXT,
    occurred_at_value TIMESTAMPTZ,
    seed_value TEXT,
    suffix_length INTEGER DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    formatted_date TEXT;
    digit_pool TEXT;
BEGIN
    formatted_date := TO_CHAR(COALESCE(occurred_at_value, NOW()), 'DDMMYY');
    digit_pool := REGEXP_REPLACE(
        ENCODE(DIGEST(COALESCE(seed_value, GEN_RANDOM_UUID()::TEXT), 'sha256'), 'hex'),
        '[^0-9]',
        '',
        'g'
    );

    digit_pool := digit_pool || REGEXP_REPLACE(EXTRACT(EPOCH FROM COALESCE(occurred_at_value, NOW()))::TEXT, '\D', '', 'g');

    RETURN prefix_value || formatted_date || SUBSTRING(LPAD(digit_pool, suffix_length, '0') FROM 1 FOR suffix_length);
END;
$$;

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    transaction_kind TEXT NOT NULL DEFAULT 'capture' CHECK (transaction_kind IN ('capture', 'refund', 'adjustment')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('course_purchase', 'donation', 'subscription')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
    transaction_reference TEXT,
    external_order_id TEXT,
    external_payment_id TEXT,
    source_document_number TEXT,
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT financial_transactions_payment_kind_unique UNIQUE (payment_id, transaction_kind)
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    entry_group_id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    ledger_account_code TEXT NOT NULL,
    ledger_account_name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    narration TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_type TEXT NOT NULL DEFAULT 'course_purchase' CHECK (invoice_type IN ('course_purchase', 'subscription')),
    student_name TEXT NOT NULL,
    student_email TEXT,
    course_id TEXT,
    course_title TEXT NOT NULL,
    taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    transaction_id TEXT,
    payment_reference TEXT,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled', 'refunded')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_invoices_payment_unique UNIQUE (payment_id)
);

CREATE TABLE IF NOT EXISTS public.donation_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    financial_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    donor_name TEXT NOT NULL,
    donor_email TEXT,
    donor_phone TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    transaction_id TEXT,
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gst_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('monthly_gst_sales', 'course_sales', 'donation_transactions', 'revenue_summary', 'gstr1', 'gstr3b')),
    report_month DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'pdf' CHECK (file_format IN ('pdf', 'csv', 'xlsx')),
    total_taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_invoice_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_donation_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    action_type TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'finance',
    reference_type TEXT,
    reference_id TEXT,
    message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_receipts_payment_unique
    ON public.donation_receipts(payment_id)
    WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_receipts_donation_unique
    ON public.donation_receipts(donation_id)
    WHERE donation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_occurred
    ON public.financial_transactions(transaction_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_status_occurred
    ON public.financial_transactions(status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_occurred
    ON public.financial_transactions(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_order_payment
    ON public.financial_transactions(external_order_id, external_payment_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_financial_transaction
    ON public.ledger_entries(financial_transaction_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_code_created
    ON public.ledger_entries(ledger_account_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_invoices_invoice_date
    ON public.course_invoices(invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_course_invoices_user_invoice_date
    ON public.course_invoices(user_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_course_invoices_course_title
    ON public.course_invoices(course_title);

CREATE INDEX IF NOT EXISTS idx_donation_receipts_receipt_date
    ON public.donation_receipts(receipt_date DESC);

CREATE INDEX IF NOT EXISTS idx_gst_reports_month_type
    ON public.gst_reports(report_month DESC, report_type);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_module_created
    ON public.financial_audit_logs(module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_actor_created
    ON public.financial_audit_logs(actor_user_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'update_updated_at_column'
    ) THEN
        DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON public.financial_transactions;
        CREATE TRIGGER update_financial_transactions_updated_at
        BEFORE UPDATE ON public.financial_transactions
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_course_invoices_updated_at ON public.course_invoices;
        CREATE TRIGGER update_course_invoices_updated_at
        BEFORE UPDATE ON public.course_invoices
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_donation_receipts_updated_at ON public.donation_receipts;
        CREATE TRIGGER update_donation_receipts_updated_at
        BEFORE UPDATE ON public.donation_receipts
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    finance_tables TEXT[] := ARRAY[
        'financial_transactions',
        'ledger_entries',
        'course_invoices',
        'donation_receipts',
        'gst_reports',
        'financial_audit_logs'
    ];
    finance_table TEXT;
BEGIN
    FOREACH finance_table IN ARRAY finance_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = finance_table
              AND policyname = finance_table || '_finance_select'
        ) THEN
            EXECUTE FORMAT(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
                    EXISTS (
                        SELECT 1
                        FROM public.profiles
                        WHERE id = auth.uid()
                          AND role IN (''admin'', ''super_admin'', ''finance_manager'')
                    )
                )',
                finance_table || '_finance_select',
                finance_table
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = finance_table
              AND policyname = finance_table || '_finance_write'
        ) THEN
            EXECUTE FORMAT(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (
                    EXISTS (
                        SELECT 1
                        FROM public.profiles
                        WHERE id = auth.uid()
                          AND role IN (''admin'', ''super_admin'', ''finance_manager'')
                    )
                ) WITH CHECK (
                    EXISTS (
                        SELECT 1
                        FROM public.profiles
                        WHERE id = auth.uid()
                          AND role IN (''admin'', ''super_admin'', ''finance_manager'')
                    )
                )',
                finance_table || '_finance_write',
                finance_table
            );
        END IF;
    END LOOP;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_finance_select'
    ) THEN
        CREATE POLICY payments_finance_select ON public.payments
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_finance_update'
    ) THEN
        CREATE POLICY payments_finance_update ON public.payments
        FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'donations_finance_select'
    ) THEN
        CREATE POLICY donations_finance_select ON public.donations
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'donations_finance_update'
    ) THEN
        CREATE POLICY donations_finance_update ON public.donations
        FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid()
                  AND role IN ('admin', 'super_admin', 'finance_manager')
            )
        );
    END IF;
END
$$;

WITH payment_base AS (
    SELECT
        p.id AS payment_id,
        p.user_id,
        p.payment_type,
        p.status,
        p.amount,
        p.currency,
        p.payment_method,
        p.transaction_id,
        p.razorpay_order_id,
        p.razorpay_payment_id,
        p.metadata,
        COALESCE(p.processed_at, p.timestamp, p.created_at, NOW()) AS occurred_at,
        CASE
            WHEN p.payment_type = 'donation' THEN 0
            WHEN COALESCE(p.metadata ->> 'gstRate', '') ~ '^[0-9]+(\.[0-9]+)?$'
                THEN (p.metadata ->> 'gstRate')::NUMERIC
            ELSE 18
        END AS gst_rate
    FROM public.payments p
    WHERE p.status IN ('completed', 'refunded')
)
INSERT INTO public.financial_transactions (
    payment_id,
    donation_id,
    user_id,
    transaction_kind,
    transaction_type,
    status,
    gross_amount,
    taxable_value,
    gst_rate,
    gst_amount,
    net_amount,
    currency,
    payment_gateway,
    transaction_reference,
    external_order_id,
    external_payment_id,
    source_document_number,
    description,
    occurred_at,
    metadata
)
SELECT
    pb.payment_id,
    d.id,
    pb.user_id,
    'capture',
    pb.payment_type,
    pb.status,
    pb.amount,
    CASE
        WHEN pb.gst_rate > 0 THEN ROUND(pb.amount / (1 + (pb.gst_rate / 100)), 2)
        ELSE pb.amount
    END,
    pb.gst_rate,
    CASE
        WHEN pb.gst_rate > 0 THEN ROUND(pb.amount - ROUND(pb.amount / (1 + (pb.gst_rate / 100)), 2), 2)
        ELSE 0
    END,
    CASE
        WHEN pb.gst_rate > 0 THEN ROUND(pb.amount / (1 + (pb.gst_rate / 100)), 2)
        ELSE pb.amount
    END,
    pb.currency,
    pb.payment_method,
    COALESCE(pb.transaction_id, pb.razorpay_payment_id, pb.razorpay_order_id, pb.payment_id::TEXT),
    pb.razorpay_order_id,
    pb.razorpay_payment_id,
    NULL,
    COALESCE(pb.metadata ->> 'description', INITCAP(REPLACE(pb.payment_type, '_', ' '))),
    pb.occurred_at,
    COALESCE(pb.metadata, '{}'::jsonb)
FROM payment_base pb
LEFT JOIN public.donations d
    ON pb.payment_type = 'donation'
   AND (
        (pb.razorpay_order_id IS NOT NULL AND d.order_id = pb.razorpay_order_id)
        OR (pb.razorpay_payment_id IS NOT NULL AND d.payment_id = pb.razorpay_payment_id)
   )
WHERE NOT EXISTS (
    SELECT 1
    FROM public.financial_transactions ft
    WHERE ft.payment_id = pb.payment_id
      AND ft.transaction_kind = 'capture'
);

INSERT INTO public.course_invoices (
    payment_id,
    financial_transaction_id,
    user_id,
    invoice_number,
    invoice_type,
    student_name,
    student_email,
    course_id,
    course_title,
    taxable_value,
    gst_rate,
    gst_amount,
    total_amount,
    currency,
    transaction_id,
    payment_reference,
    invoice_date,
    status,
    metadata
)
SELECT
    p.id,
    ft.id,
    p.user_id,
    COALESCE(
        NULLIF(p.metadata ->> 'invoice_number', ''),
        public.savi_finance_number('SGICOURSE', ft.occurred_at, COALESCE(p.razorpay_payment_id, p.razorpay_order_id, p.id::TEXT), 10)
    ),
    p.payment_type,
    COALESCE(pr.full_name, NULLIF(p.metadata ->> 'studentName', ''), NULLIF(p.metadata ->> 'donor_name', ''), 'Student'),
    COALESCE(pr.email, NULLIF(p.metadata ->> 'studentEmail', ''), NULLIF(p.metadata ->> 'donor_email', '')),
    NULLIF(p.metadata ->> 'courseId', ''),
    COALESCE(NULLIF(p.metadata ->> 'courseTitle', ''), NULLIF(p.metadata ->> 'planId', ''), 'SaviEduTech Learning Product'),
    ft.taxable_value,
    ft.gst_rate,
    ft.gst_amount,
    ft.gross_amount,
    p.currency,
    COALESCE(p.transaction_id, p.razorpay_payment_id, p.razorpay_order_id),
    COALESCE(p.razorpay_payment_id, p.razorpay_order_id),
    ft.occurred_at,
    CASE WHEN p.status = 'refunded' THEN 'refunded' ELSE 'issued' END,
    COALESCE(p.metadata, '{}'::jsonb)
FROM public.payments p
INNER JOIN public.financial_transactions ft
    ON ft.payment_id = p.id
   AND ft.transaction_kind = 'capture'
LEFT JOIN public.profiles pr
    ON pr.id = p.user_id
WHERE p.payment_type IN ('course_purchase', 'subscription')
  AND p.status IN ('completed', 'refunded')
  AND NOT EXISTS (
      SELECT 1
      FROM public.course_invoices ci
      WHERE ci.payment_id = p.id
  );

INSERT INTO public.donation_receipts (
    donation_id,
    payment_id,
    financial_transaction_id,
    user_id,
    receipt_number,
    donor_name,
    donor_email,
    donor_phone,
    amount,
    currency,
    transaction_id,
    receipt_date,
    metadata
)
SELECT
    d.id,
    p.id,
    ft.id,
    COALESCE(p.user_id, d.user_id),
    COALESCE(
        NULLIF(d.receipt_number, ''),
        NULLIF(d.metadata ->> 'receipt_number', ''),
        NULLIF(p.metadata ->> 'receipt_number', ''),
        public.savi_finance_number('SGIDONATE', ft.occurred_at, COALESCE(p.razorpay_payment_id, p.razorpay_order_id, d.id::TEXT), 10)
    ),
    COALESCE(d.donor_name, NULLIF(p.metadata ->> 'donor_name', ''), 'Anonymous Donor'),
    COALESCE(d.donor_email, NULLIF(p.metadata ->> 'donor_email', '')),
    COALESCE(d.donor_phone, NULLIF(p.metadata ->> 'donor_phone', '')),
    COALESCE(d.amount, p.amount),
    COALESCE(d.currency, p.currency, 'INR'),
    COALESCE(d.payment_id, p.razorpay_payment_id, p.transaction_id, d.order_id),
    COALESCE(d.completed_at, ft.occurred_at),
    COALESCE(d.metadata, '{}'::jsonb) || COALESCE(p.metadata, '{}'::jsonb)
FROM public.donations d
LEFT JOIN public.payments p
    ON (
        (d.order_id IS NOT NULL AND p.razorpay_order_id = d.order_id)
        OR (d.payment_id IS NOT NULL AND p.razorpay_payment_id = d.payment_id)
    )
LEFT JOIN public.financial_transactions ft
    ON ft.payment_id = p.id
   AND ft.transaction_kind = 'capture'
WHERE d.status = 'completed'
  AND NOT EXISTS (
      SELECT 1
      FROM public.donation_receipts dr
      WHERE (dr.donation_id IS NOT NULL AND dr.donation_id = d.id)
         OR (dr.payment_id IS NOT NULL AND p.id IS NOT NULL AND dr.payment_id = p.id)
  );

UPDATE public.donations d
SET receipt_number = dr.receipt_number
FROM public.donation_receipts dr
WHERE dr.donation_id = d.id
  AND COALESCE(d.receipt_number, '') = '';

UPDATE public.payments p
SET metadata = jsonb_strip_nulls(
    COALESCE(p.metadata, '{}'::jsonb)
        || CASE
            WHEN p.payment_type IN ('course_purchase', 'subscription')
                THEN jsonb_build_object(
                    'invoice_number',
                    (SELECT ci.invoice_number FROM public.course_invoices ci WHERE ci.payment_id = p.id LIMIT 1)
                )
            WHEN p.payment_type = 'donation'
                THEN jsonb_build_object(
                    'receipt_number',
                    (SELECT dr.receipt_number FROM public.donation_receipts dr WHERE dr.payment_id = p.id LIMIT 1)
                )
            ELSE '{}'::jsonb
        END
)
WHERE p.status IN ('completed', 'refunded');

INSERT INTO public.ledger_entries (
    financial_transaction_id,
    entry_group_id,
    entry_type,
    ledger_account_code,
    ledger_account_name,
    amount,
    currency,
    narration
)
SELECT
    ft.id,
    COALESCE(ft.transaction_reference, ft.id::TEXT),
    entry.entry_type,
    entry.ledger_account_code,
    entry.ledger_account_name,
    entry.amount,
    ft.currency,
    entry.narration
FROM public.financial_transactions ft
CROSS JOIN LATERAL (
    SELECT *
    FROM (
        VALUES
            ('debit', 'BANK_RAZORPAY', 'Bank / Payment Gateway Account', ft.gross_amount, 'Payment captured through Razorpay'),
            (
                'credit',
                CASE WHEN ft.transaction_type = 'donation' THEN 'DONATION_INCOME' ELSE 'COURSE_REVENUE' END,
                CASE WHEN ft.transaction_type = 'donation' THEN 'Donation Income Account' ELSE 'Course Revenue Account' END,
                CASE WHEN ft.transaction_type = 'donation' THEN ft.gross_amount ELSE ft.taxable_value END,
                CASE WHEN ft.transaction_type = 'donation' THEN 'Donation income recognised' ELSE 'Course or subscription revenue recognised' END
            ),
            (
                'credit',
                'GST_OUTPUT',
                'GST Output Tax Account',
                CASE WHEN ft.transaction_type = 'donation' THEN 0 ELSE ft.gst_amount END,
                'GST liability recognised on taxable course revenue'
            )
    ) AS entry(entry_type, ledger_account_code, ledger_account_name, amount, narration)
    WHERE entry.amount > 0
) AS entry
WHERE ft.transaction_kind = 'capture'
  AND NOT EXISTS (
      SELECT 1
      FROM public.ledger_entries le
      WHERE le.financial_transaction_id = ft.id
  );

INSERT INTO public.financial_audit_logs (
    actor_user_id,
    actor_role,
    action_type,
    module,
    reference_type,
    reference_id,
    message,
    metadata
)
SELECT
    NULL,
    'system',
    'finance_backfill_completed',
    'finance',
    'migration',
    '20260310163000_financial_accounting_gst_system',
    'Financial records, invoices, receipts, and ledger entries were backfilled from completed payments.',
    jsonb_build_object(
        'backfilled_transactions', (SELECT COUNT(*) FROM public.financial_transactions),
        'backfilled_invoices', (SELECT COUNT(*) FROM public.course_invoices),
        'backfilled_receipts', (SELECT COUNT(*) FROM public.donation_receipts)
    )
WHERE NOT EXISTS (
    SELECT 1
    FROM public.financial_audit_logs
    WHERE action_type = 'finance_backfill_completed'
      AND reference_id = '20260310163000_financial_accounting_gst_system'
);
