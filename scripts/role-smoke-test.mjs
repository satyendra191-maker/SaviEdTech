import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
    const env = { ...process.env };
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const [key, ...rest] = trimmed.split('=');
            if (!key || rest.length === 0) return;
            env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
        });
    }
    return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = env.SMOKE_BASE_URL || env.NEXT_PUBLIC_APP_URL || '';
const EMAIL_DOMAIN = env.SMOKE_EMAIL_DOMAIN || 'saviedutech.test';
const TEST_PASSWORD = env.SMOKE_TEST_PASSWORD || 'SmokeTest@123';
const CLEANUP = String(env.SMOKE_CLEANUP || '').toLowerCase() === 'true';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
});

const roleUsers = [
    { label: 'support', role: 'support' },
    { label: 'marketing', role: 'marketing_manager' },
    { label: 'finance', role: 'finance_manager' },
    { label: 'teacher', role: 'teacher' },
];

const userRecords = new Map();

function toEmail(label) {
    return `smoke+${label}@${EMAIL_DOMAIN}`.toLowerCase();
}

async function ensureUser({ label, role }) {
    const email = toEmail(label);
    let userId = null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: `Smoke ${label}` },
    });

    if (createError || !created?.user) {
        if (createError) {
            console.warn(`[Smoke] Create user warning for ${label}: ${createError.message}`);
        }

        const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (profile?.id) {
            userId = profile.id;
        } else if (typeof admin.auth.admin.listUsers === 'function') {
            try {
                const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
                const match = listData?.users?.find((user) => user.email === email);
                if (match) {
                    userId = match.id;
                }
            } catch (error) {
                console.warn(`[Smoke] listUsers failed for ${label}: ${error?.message || error}`);
            }
        }
    } else {
        userId = created.user.id;
    }

    if (userId && typeof admin.auth.admin.updateUserById === 'function') {
        const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
            password: TEST_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: `Smoke ${label}` },
        });
        if (updateError) {
            console.warn(`[Smoke] Failed to update ${label} user password: ${updateError.message}`);
        }
    }

    if (!userId) {
        throw new Error(`Unable to resolve user id for ${label}`);
    }

    const profilePayload = {
        id: userId,
        email,
        full_name: `Smoke ${label}`,
        role,
        status: 'active',
        is_verified: true,
        updated_at: new Date().toISOString(),
    };

    let profileError = null;
    {
        const { error } = await admin
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });
        profileError = error;
    }

    if (profileError) {
        const { error } = await admin
            .from('profiles')
            .upsert(
                {
                    id: userId,
                    email,
                    full_name: `Smoke ${label}`,
                    role,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' }
            );
        if (error) {
            throw new Error(`Failed to upsert profile for ${label}: ${error.message}`);
        }
    }

    if (role === 'teacher') {
        const { error } = await admin
            .from('faculty')
            .upsert(
                {
                    user_id: userId,
                    subject: 'Physics',
                    experience_years: 5,
                    qualification: 'M.Sc.',
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );
        if (error) {
            console.warn(`[Smoke] Failed to upsert faculty row (non-fatal): ${error.message}`);
        }
    }

    userRecords.set(label, { email, userId, role });
    return { email, userId, role };
}

async function signIn(email) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password: TEST_PASSWORD,
    });
    if (error || !data.session) {
        throw new Error(`Sign-in failed for ${email}: ${error?.message || 'no session returned'}`);
    }
    return client;
}

async function ensureBaselineData() {
    const marketingUser = userRecords.get('marketing');
    const today = new Date().toISOString().slice(0, 10);

    if (marketingUser?.userId) {
        const { error } = await admin.from('marketing_campaigns').insert({
            campaign_name: `Smoke Campaign ${today}`,
            platform: 'internal',
            budget: 1,
            status: 'active',
            created_by: marketingUser.userId,
        });
        if (error) {
            console.warn(`[Smoke] Failed to seed marketing_campaigns: ${error.message}`);
        }
    }

    {
        const { error } = await admin.from('financial_reports').upsert({
            report_date: today,
            total_revenue: 1,
            total_donations: 0,
            total_refunds: 0,
            updated_at: new Date().toISOString(),
        });
        if (error) {
            console.warn(`[Smoke] Failed to seed financial_reports: ${error.message}`);
        }
    }
}

async function countRows(client, table) {
    const { count, error } = await client
        .from(table)
        .select('id', { count: 'exact', head: true });
    if (error) {
        throw new Error(`Count failed for ${table}: ${error.message}`);
    }
    return count ?? 0;
}

async function canReadOwnProfile(client, userId) {
    const { data, error } = await client
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();
    if (error) {
        throw new Error(`Profile query failed: ${error.message}`);
    }
    return Boolean(data?.id);
}

async function smokeTestRole(label, client, userId) {
    const results = [];
    const adminMarketingCount = await countRows(admin, 'marketing_campaigns');
    const adminFinanceCount = await countRows(admin, 'financial_reports');

    const ownsProfile = await canReadOwnProfile(client, userId);
    results.push({ check: 'read_own_profile', ok: ownsProfile });

    if (label === 'marketing') {
        const marketingCount = await countRows(client, 'marketing_campaigns');
        results.push({
            check: 'marketing_campaigns_read',
            ok: marketingCount >= 1 && marketingCount <= adminMarketingCount,
            details: { marketingCount, adminMarketingCount },
        });
        const financeCount = await countRows(client, 'financial_reports');
        results.push({
            check: 'financial_reports_denied',
            ok: adminFinanceCount > 0 ? financeCount === 0 : true,
            details: { financeCount, adminFinanceCount },
        });
    }

    if (label === 'finance') {
        const financeCount = await countRows(client, 'financial_reports');
        results.push({
            check: 'financial_reports_read',
            ok: financeCount >= 1 && financeCount <= adminFinanceCount,
            details: { financeCount, adminFinanceCount },
        });
    }

    if (label === 'teacher') {
        const { data, error } = await client
            .from('faculty')
            .select('id, user_id')
            .eq('user_id', userId);
        if (error) {
            results.push({ check: 'faculty_read', ok: false, details: { error: error.message } });
        } else {
            results.push({ check: 'faculty_read', ok: (data?.length ?? 0) >= 1 });
        }
        const financeCount = await countRows(client, 'financial_reports');
        results.push({
            check: 'financial_reports_denied',
            ok: adminFinanceCount > 0 ? financeCount === 0 : true,
            details: { financeCount, adminFinanceCount },
        });
    }

    if (label === 'support') {
        const financeCount = await countRows(client, 'financial_reports');
        const marketingCount = await countRows(client, 'marketing_campaigns');
        results.push({
            check: 'financial_reports_denied',
            ok: adminFinanceCount > 0 ? financeCount === 0 : true,
            details: { financeCount, adminFinanceCount },
        });
        results.push({
            check: 'marketing_campaigns_denied',
            ok: adminMarketingCount > 0 ? marketingCount === 0 : true,
            details: { marketingCount, adminMarketingCount },
        });
    }

    return results;
}

async function cleanupUsers() {
    for (const record of userRecords.values()) {
        try {
            await admin.auth.admin.deleteUser(record.userId);
            await admin.from('profiles').delete().eq('id', record.userId);
        } catch (error) {
            console.warn(`[Smoke] Cleanup failed for ${record.email}: ${error?.message || error}`);
        }
    }
}

async function main() {
    console.log('[Smoke] Preparing role accounts...');
    const setupFailures = [];
    for (const role of roleUsers) {
        try {
            await ensureUser(role);
        } catch (error) {
            setupFailures.push({ role: role.label, error: error?.message || String(error) });
        }
    }

    if (setupFailures.length > 0) {
        console.warn('[Smoke] Role setup failures:');
        for (const failure of setupFailures) {
            console.warn(`- ${failure.role}: ${failure.error}`);
        }
    }

    console.log('[Smoke] Seeding baseline data...');
    await ensureBaselineData();

    const summary = [];
    for (const role of roleUsers) {
        const record = userRecords.get(role.label);
        if (!record) {
            summary.push({
                role: role.label,
                checks: [{ check: 'setup', ok: false, details: { error: 'Role setup failed' } }],
            });
            continue;
        }
        console.log(`[Smoke] Testing ${role.label} (${record.role}) access...`);
        const client = await signIn(record.email);
        const checks = await smokeTestRole(role.label, client, record.userId);
        summary.push({ role: role.label, checks });
    }

    console.log('\n[Smoke] Results');
    let failures = 0;
    for (const item of summary) {
        console.log(`- ${item.role}`);
        for (const check of item.checks) {
            const status = check.ok ? 'PASS' : 'FAIL';
            if (!check.ok) failures += 1;
            console.log(`  - ${status} ${check.check}${check.details ? ` ${JSON.stringify(check.details)}` : ''}`);
        }
    }

    if (CLEANUP) {
        console.log('\n[Smoke] Cleanup enabled, removing test users...');
        await cleanupUsers();
    }

    if (failures > 0) {
        console.error(`\n[Smoke] Completed with ${failures} failing checks.`);
        process.exit(1);
    }

    console.log('\n[Smoke] All checks passed.');
}

main().catch((error) => {
    console.error(`[Smoke] Fatal error: ${error.message || error}`);
    process.exit(1);
});
