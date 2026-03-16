BEGIN;

DO $$
BEGIN
    IF to_regclass('public.payments') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_finance_select_v2'
        ) THEN
            CREATE POLICY payments_finance_select_v2 ON public.payments
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_finance_update_v2'
        ) THEN
            CREATE POLICY payments_finance_update_v2 ON public.payments
            FOR UPDATE TO authenticated
            USING (public.is_finance_user(auth.uid()))
            WITH CHECK (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.donations') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'donations_finance_select_v2'
        ) THEN
            CREATE POLICY donations_finance_select_v2 ON public.donations
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'donations' AND policyname = 'donations_finance_update_v2'
        ) THEN
            CREATE POLICY donations_finance_update_v2 ON public.donations
            FOR UPDATE TO authenticated
            USING (public.is_finance_user(auth.uid()))
            WITH CHECK (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.financial_transactions') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'financial_transactions' AND policyname = 'financial_transactions_finance_select_v2'
        ) THEN
            CREATE POLICY financial_transactions_finance_select_v2 ON public.financial_transactions
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.ledger_entries') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'ledger_entries' AND policyname = 'ledger_entries_finance_select_v2'
        ) THEN
            CREATE POLICY ledger_entries_finance_select_v2 ON public.ledger_entries
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.course_invoices') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'course_invoices' AND policyname = 'course_invoices_finance_select_v2'
        ) THEN
            CREATE POLICY course_invoices_finance_select_v2 ON public.course_invoices
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.donation_receipts') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'donation_receipts' AND policyname = 'donation_receipts_finance_select_v2'
        ) THEN
            CREATE POLICY donation_receipts_finance_select_v2 ON public.donation_receipts
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.gst_reports') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'gst_reports' AND policyname = 'gst_reports_finance_select_v2'
        ) THEN
            CREATE POLICY gst_reports_finance_select_v2 ON public.gst_reports
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.financial_audit_logs') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'financial_audit_logs' AND policyname = 'financial_audit_logs_finance_select_v2'
        ) THEN
            CREATE POLICY financial_audit_logs_finance_select_v2 ON public.financial_audit_logs
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.invoices') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'invoices_finance_select_v2'
        ) THEN
            CREATE POLICY invoices_finance_select_v2 ON public.invoices
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;

    IF to_regclass('public.financial_analytics') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'financial_analytics' AND policyname = 'financial_analytics_finance_select_v2'
        ) THEN
            CREATE POLICY financial_analytics_finance_select_v2 ON public.financial_analytics
            FOR SELECT TO authenticated
            USING (public.is_finance_user(auth.uid()));
        END IF;
    END IF;
END
$$;

COMMIT;
