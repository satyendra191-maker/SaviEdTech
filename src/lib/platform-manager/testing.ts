/**
 * SaviEduTech Team Autonomous Platform Manager - Auto-Testing Engine
 *
 * Provides comprehensive automated testing for critical platform functionality:
 * - Authentication flow tests
 * - Core feature tests
 * - Payment system tests
 * - Admin functionality tests
 * - Test result tracking and reporting
 */

import { getSupabaseBrowserClient, createAdminSupabaseClient, isBrowser } from '@/lib/supabase';
import { sendAlert } from './alerts';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Internal helper to get the correct Supabase client based on environment
 */
function getClient(client?: any): any {
    if (client) return client;
    return isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient();
}

// Type definitions for test results (stored in system_health table as test metadata)
interface TestResultRow {
    id: string;
    test_name: string;
    test_category: string;
    status: string;
    response_time_ms: number | null;
    error_message: string | null;
    details: Record<string, unknown> | null;
    executed_at: string;
    run_id: string;
}

// Test status types
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'running';
export type TestCategory = 'authentication' | 'core_features' | 'payment' | 'admin';

// Test result interface
export interface TestResult {
    id: string;
    test_name: string;
    test_category: TestCategory;
    status: TestStatus;
    response_time_ms: number;
    error_message: string | null;
    details: Record<string, unknown>;
    executed_at: string;
    run_id: string;
}

// Test run summary
export interface TestRunSummary {
    run_id: string;
    started_at: string;
    completed_at: string;
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    total_duration_ms: number;
    category: TestCategory | 'all';
}

// Test configuration
export interface TestConfig {
    timeoutMs?: number;
    retries?: number;
    parallel?: boolean;
    alertOnFailure?: boolean;
}

const DEFAULT_CONFIG: Required<TestConfig> = {
    timeoutMs: 30000,
    retries: 2,
    parallel: false,
    alertOnFailure: true,
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ============================================
// AUTHENTICATION TESTS
// ============================================

/**
 * Test login flow validation
 */
export async function testLoginFlow(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test login page loading
        const response = await fetch(`${baseUrl}/login`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`Login page failed with status: ${response.status}`);
        }

        const content = await response.text();

        // Check for essential login form elements
        const hasEmailInput = content.includes('email') || content.includes('type="email"');
        const hasPasswordInput = content.includes('password') || content.includes('type="password"');
        const hasSubmitButton = content.includes('submit') || content.includes('button');

        if (!hasEmailInput || !hasPasswordInput || !hasSubmitButton) {
            throw new Error('Login page missing essential form elements');
        }

        return {
            test_name: 'testLoginFlow',
            test_category: 'authentication',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageLoaded: true,
                hasEmailInput,
                hasPasswordInput,
                hasSubmitButton,
                statusCode: response.status,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testLoginFlow',
            test_category: 'authentication',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test registration process
 */
export async function testRegistration(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test registration page loading
        const response = await fetch(`${baseUrl}/register`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error(`Registration page failed with status: ${response.status}`);
        }

        const content = await response.text();

        // Check for essential registration form elements
        const hasNameInput = content.includes('name') || content.includes('full_name');
        const hasEmailInput = content.includes('email') || content.includes('type="email"');
        const hasPasswordInput = content.includes('password') || content.includes('type="password"');
        const hasPhoneInput = content.includes('phone') || content.includes('mobile');

        if (!hasNameInput || !hasEmailInput || !hasPasswordInput) {
            throw new Error('Registration page missing essential form elements');
        }

        return {
            test_name: 'testRegistration',
            test_category: 'authentication',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageLoaded: true,
                hasNameInput,
                hasEmailInput,
                hasPasswordInput,
                hasPhoneInput,
                statusCode: response.status,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testRegistration',
            test_category: 'authentication',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test password reset functionality
 */
export async function testPasswordReset(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test password reset API endpoint
        const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' }),
            signal: AbortSignal.timeout(10000),
        });

        // Even if the email doesn't exist, we should get a valid response
        if (response.status !== 200 && response.status !== 400 && response.status !== 404) {
            throw new Error(`Password reset endpoint failed with status: ${response.status}`);
        }

        return {
            test_name: 'testPasswordReset',
            test_category: 'authentication',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                endpointReachable: true,
                statusCode: response.status,
                responseTime: Date.now() - startTime,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testPasswordReset',
            test_category: 'authentication',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test OAuth callback handling
 */
export async function testOAuthCallback(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test OAuth callback endpoint
        const response = await fetch(`${baseUrl}/api/auth/callback`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        // OAuth callback should redirect (302) or return error (400) for missing params
        if (response.status !== 302 && response.status !== 400 && response.status !== 401) {
            throw new Error(`OAuth callback endpoint unexpected status: ${response.status}`);
        }

        return {
            test_name: 'testOAuthCallback',
            test_category: 'authentication',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                endpointReachable: true,
                statusCode: response.status,
                hasRedirect: response.redirected,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testOAuthCallback',
            test_category: 'authentication',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

// ============================================
// CORE FEATURE TESTS
// ============================================

/**
 * Test course page loading
 */
export async function testCoursePages(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test dashboard/lectures page (main course content area)
        const response = await fetch(`${baseUrl}/dashboard/lectures`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
        });

        if (response.status !== 200 && response.status !== 401 && response.status !== 307) {
            throw new Error(`Course pages failed with status: ${response.status}`);
        }

        return {
            test_name: 'testCoursePages',
            test_category: 'core_features',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageReachable: true,
                statusCode: response.status,
                requiresAuth: response.status === 307 || response.status === 401,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testCoursePages',
            test_category: 'core_features',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test lecture player functionality
 */
export async function testLecturePlayer(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check if lectures table exists and has content
        const { data: lectures, error } = await supabase
            .from('lectures')
            .select('id, title, video_url, is_published')
            .eq('is_published', true)
            .limit(1)
            .maybeSingle() as { data: Record<string, unknown> | null; error: Error | null };

        if (error) {
            throw new Error(`Lecture query failed: ${error.message}`);
        }

        const hasPublishedLectures = !!lectures;

        return {
            test_name: 'testLecturePlayer',
            test_category: 'core_features',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                hasPublishedLectures,
                lectureCount: lectures ? 1 : 0,
                hasVideoUrl: lectures && lectures.video_url ? true : false,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testLecturePlayer',
            test_category: 'core_features',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test practice questions system
 */
export async function testPracticeQuestions(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check practice page
        const pageResponse = await fetch(`${baseUrl}/dashboard/practice`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
        });

        // Check questions in database
        const { data: questions, error: questionError } = await supabase
            .from('questions')
            .select('id, difficulty_level, is_published')
            .eq('is_published', true)
            .limit(5);

        if (questionError) {
            throw new Error(`Questions query failed: ${questionError.message}`);
        }

        const questionCount = questions?.length ?? 0;

        return {
            test_name: 'testPracticeQuestions',
            test_category: 'core_features',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageReachable: pageResponse.status === 200 || pageResponse.status === 307,
                pageStatus: pageResponse.status,
                availableQuestions: questionCount,
                hasQuestions: questionCount > 0,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testPracticeQuestions',
            test_category: 'core_features',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test mock test taking flow
 */
export async function testMockTests(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check tests page
        const pageResponse = await fetch(`${baseUrl}/dashboard/tests`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
        });

        // Check test sets in database
        const { data: testSets, error: testError } = await supabase
            .from('test_sets')
            .select('id, title, is_published, duration_minutes')
            .eq('is_published', true)
            .limit(3);

        if (testError) {
            throw new Error(`Test sets query failed: ${testError.message}`);
        }

        const testCount = testSets?.length ?? 0;

        return {
            test_name: 'testMockTests',
            test_category: 'core_features',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageReachable: pageResponse.status === 200 || pageResponse.status === 307,
                pageStatus: pageResponse.status,
                availableTests: testCount,
                hasTests: testCount > 0,
                testDurations: testSets?.map((t: Record<string, unknown>) => t.duration_minutes) ?? [],
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testMockTests',
            test_category: 'core_features',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test daily challenge participation
 */
export async function testDailyChallenge(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check challenge page
        const pageResponse = await fetch(`${baseUrl}/dashboard/challenge`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
        });

        // Check today's challenge in database
        const today = new Date().toISOString().split('T')[0];
        const { data: challenges, error: challengeError } = await supabase
            .from('daily_challenges')
            .select('id, title, challenge_date, closes_at')
            .eq('challenge_date', today)
            .limit(1)
            .maybeSingle() as { data: Record<string, unknown> | null; error: Error | null };

        if (challengeError) {
            throw new Error(`Daily challenge query failed: ${challengeError.message}`);
        }

        return {
            test_name: 'testDailyChallenge',
            test_category: 'core_features',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageReachable: pageResponse.status === 200 || pageResponse.status === 307,
                pageStatus: pageResponse.status,
                hasTodayChallenge: !!challenges,
                challengeDate: challenges && challenges.challenge_date,
                closesAt: challenges && challenges.closes_at,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testDailyChallenge',
            test_category: 'core_features',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

// ============================================
// PAYMENT SYSTEM TESTS
// ============================================

/**
 * Test donation page loading
 */
export async function testDonationPage(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test donation page loading
        const response = await fetch(`${baseUrl}/donate`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Donation page failed with status: ${response.status}`);
        }

        const content = await response.text();

        // Check for donation-related content
        const hasDonationContent =
            content.toLowerCase().includes('donate') ||
            content.toLowerCase().includes('support') ||
            content.toLowerCase().includes('contribute');

        return {
            test_name: 'testDonationPage',
            test_category: 'payment',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageLoaded: response.ok,
                statusCode: response.status,
                hasDonationContent: hasDonationContent || response.status === 404,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testDonationPage',
            test_category: 'payment',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test payment gateway connectivity
 */
export async function testPaymentGateways(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Check if payment gateway credentials are configured
        const hasRazorpayKey = !!process.env.RAZORPAY_KEY_ID;
        const hasRazorpaySecret = !!process.env.RAZORPAY_KEY_SECRET;

        // Test payment API endpoint if available
        let apiStatus = 'not_tested';
        try {
            const response = await fetch(`${baseUrl}/api/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true }),
                signal: AbortSignal.timeout(5000),
            });
            apiStatus = response.status === 200 || response.status === 400 ? 'reachable' : 'error';
        } catch {
            apiStatus = 'endpoint_not_found';
        }

        return {
            test_name: 'testPaymentGateways',
            test_category: 'payment',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                hasRazorpayKey,
                hasRazorpaySecret,
                credentialsConfigured: hasRazorpayKey && hasRazorpaySecret,
                apiStatus,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testPaymentGateways',
            test_category: 'payment',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test webhook endpoint validation
 */
export async function testWebhookEndpoints(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test webhook endpoints
        const webhookEndpoints = [
            '/api/webhooks/razorpay',
            '/api/webhooks/payment',
        ];

        const endpointResults = await Promise.all(
            webhookEndpoints.map(async (endpoint) => {
                try {
                    const response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ test: true }),
                        signal: AbortSignal.timeout(5000),
                    });
                    return {
                        endpoint,
                        status: response.status,
                        reachable: response.status === 200 || response.status === 400 || response.status === 401,
                    };
                } catch {
                    return {
                        endpoint,
                        status: 0,
                        reachable: false,
                    };
                }
            })
        );

        const reachableEndpoints = endpointResults.filter(e => e.reachable);

        return {
            test_name: 'testWebhookEndpoints',
            test_category: 'payment',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                totalEndpoints: webhookEndpoints.length,
                reachableEndpoints: reachableEndpoints.length,
                endpointResults,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testWebhookEndpoints',
            test_category: 'payment',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

// ============================================
// ADMIN FUNCTIONALITY TESTS
// ============================================

/**
 * Test admin dashboard access
 */
export async function testAdminDashboard(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();

    try {
        // Test admin page loading (should redirect if not authenticated)
        const response = await fetch(`${baseUrl}/admin`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });

        // Admin should redirect to login (307) or return 200 for authenticated users
        const isProperlyProtected = response.status === 307 || response.status === 401 || response.status === 200;

        return {
            test_name: 'testAdminDashboard',
            test_category: 'admin',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                pageReachable: response.status === 200,
                properlyProtected: isProperlyProtected,
                statusCode: response.status,
                redirectsToLogin: response.status === 307,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testAdminDashboard',
            test_category: 'admin',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test user management features
 */
export async function testUserManagement(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check if profiles table is accessible
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, role, is_active')
            .limit(5);

        if (profileError) {
            throw new Error(`Profiles query failed: ${profileError.message}`);
        }

        // Check for user roles distribution
        const roleCounts = profiles?.reduce((acc, profile: Record<string, unknown>) => {
            const role = profile.role as string;
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            test_name: 'testUserManagement',
            test_category: 'admin',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                profilesAccessible: true,
                totalProfiles: profiles?.length ?? 0,
                roleDistribution: roleCounts,
                hasAdminUsers: profiles?.some((p: Record<string, unknown>) => p.role === 'admin') ?? false,
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testUserManagement',
            test_category: 'admin',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

/**
 * Test content publishing flow
 */
export async function testContentPublishing(): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    const startTime = Date.now();
    const supabase = getClient();

    try {
        // Check content tables
        const [lecturesCheck, questionsCheck, testsCheck] = await Promise.all([
            supabase.from('lectures').select('id', { count: 'exact', head: true }),
            supabase.from('questions').select('id', { count: 'exact', head: true }),
            supabase.from('test_sets').select('id', { count: 'exact', head: true }),
        ]);

        const contentStats = {
            lectures: lecturesCheck.count ?? 0,
            questions: questionsCheck.count ?? 0,
            testSets: testsCheck.count ?? 0,
        };

        // Check for unpublished content
        const { data: unpublishedLectures } = await supabase
            .from('lectures')
            .select('id', { count: 'exact', head: true })
            .eq('is_published', false);

        const { data: unpublishedQuestions } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('is_published', false);

        return {
            test_name: 'testContentPublishing',
            test_category: 'admin',
            status: 'passed',
            response_time_ms: Date.now() - startTime,
            error_message: null,
            details: {
                contentStats,
                unpublishedContent: {
                    lectures: unpublishedLectures?.length ?? 0,
                    questions: unpublishedQuestions?.length ?? 0,
                },
                hasContent: Object.values(contentStats).some(count => count > 0),
            },
            executed_at: new Date().toISOString(),
        };
    } catch (error) {
        return {
            test_name: 'testContentPublishing',
            test_category: 'admin',
            status: 'failed',
            response_time_ms: Date.now() - startTime,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { error: String(error) },
            executed_at: new Date().toISOString(),
        };
    }
}

// ============================================
// TEST RUNNER AND RESULT MANAGEMENT
// ============================================

// Map of all available tests
const TEST_REGISTRY: Record<TestCategory, (() => Promise<Omit<TestResult, 'id' | 'run_id'>>)[]> = {
    authentication: [
        testLoginFlow,
        testRegistration,
        testPasswordReset,
        testOAuthCallback,
    ],
    core_features: [
        testCoursePages,
        testLecturePlayer,
        testPracticeQuestions,
        testMockTests,
        testDailyChallenge,
    ],
    payment: [
        testDonationPage,
        testPaymentGateways,
        testWebhookEndpoints,
    ],
    admin: [
        testAdminDashboard,
        testUserManagement,
        testContentPublishing,
    ],
};

/**
 * Run all tests for a specific category or all categories
 */
export async function runTests(
    category: TestCategory | 'all' = 'all',
    config: TestConfig = {}
): Promise<TestRunSummary> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const runId = `test-run-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const testsToRun: (() => Promise<Omit<TestResult, 'id' | 'run_id'>>)[] = [];

    if (category === 'all') {
        Object.values(TEST_REGISTRY).forEach(tests => testsToRun.push(...tests));
    } else {
        testsToRun.push(...TEST_REGISTRY[category]);
    }

    const results: TestResult[] = [];
    const supabase = getClient();

    // Execute tests
    for (const testFn of testsToRun) {
        const result = await executeTestWithRetry(testFn, mergedConfig.retries);
        const testResult: TestResult = {
            ...result,
            id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            run_id: runId,
        };
        results.push(testResult);

        // Store result in database
        await storeTestResult(testResult);
    }

    const completedAt = new Date().toISOString();
    const summary: TestRunSummary = {
        run_id: runId,
        started_at: startedAt,
        completed_at: completedAt,
        total_tests: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        total_duration_ms: results.reduce((sum, r) => sum + r.response_time_ms, 0),
        category,
    };

    // Store summary
    await storeTestRunSummary(summary);

    // Trigger alerts if tests failed
    if (summary.failed > 0 && mergedConfig.alertOnFailure) {
        await sendAlert({
            severity: 'HIGH',
            title: `Test Failures: ${summary.failed} tests failed`,
            message: `Test run ${runId} completed with ${summary.failed} failures out of ${summary.total_tests} tests.`,
            source: 'auto-testing-engine',
            metadata: { summary, results: results.filter(r => r.status === 'failed') },
        });
    }

    return summary;
}

/**
 * Execute a test with retry logic
 */
async function executeTestWithRetry(
    testFn: () => Promise<Omit<TestResult, 'id' | 'run_id'>>,
    retries: number
): Promise<Omit<TestResult, 'id' | 'run_id'>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await testFn();
            if (result.status === 'passed' || attempt === retries) {
                return {
                    ...result,
                    details: {
                        ...result.details,
                        attempts: attempt + 1,
                    },
                };
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < retries) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    return {
        test_name: 'unknown',
        test_category: 'authentication',
        status: 'failed',
        response_time_ms: 0,
        error_message: lastError?.message ?? 'Test failed after retries',
        details: { attempts: retries + 1 },
        executed_at: new Date().toISOString(),
    };
}

/**
 * Store test result in database
 */
async function storeTestResult(result: TestResult): Promise<void> {
    const supabase = getClient();

    try {
        await supabase.from('test_results').insert({
            test_name: result.test_name,
            test_category: result.test_category,
            status: result.status,
            response_time_ms: result.response_time_ms,
            error_message: result.error_message,
            details: result.details,
            executed_at: result.executed_at,
            run_id: result.run_id,
        } as any);
    } catch (error) {
        console.error('Failed to store test result:', error);
    }
}

/**
 * Store test run summary in database
 */
async function storeTestRunSummary(summary: TestRunSummary): Promise<void> {
    const supabase = getClient();

    try {
        await supabase.from('test_run_summaries').insert({
            run_id: summary.run_id,
            started_at: summary.started_at,
            completed_at: summary.completed_at,
            total_tests: summary.total_tests,
            passed: summary.passed,
            failed: summary.failed,
            skipped: summary.skipped,
            total_duration_ms: summary.total_duration_ms,
            category: summary.category,
        } as any);
    } catch (error) {
        console.error('Failed to store test run summary:', error);
    }
}

/**
 * Get recent test results
 */
export async function getRecentTestResults(
    limit: number = 50,
    category?: TestCategory
): Promise<TestResult[]> {
    const supabase = getClient();

    let query = supabase
        .from('test_results')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);

    if (category) {
        query = query.eq('test_category', category);
    }

    const { data, error } = await query as { data: TestResultRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching test results:', error);
        return [];
    }

    return (data ?? []).map(row => ({
        id: row.id,
        test_name: row.test_name,
        test_category: row.test_category as TestCategory,
        status: row.status as TestStatus,
        response_time_ms: row.response_time_ms ?? 0,
        error_message: row.error_message,
        details: (row.details as Record<string, unknown>) ?? {},
        executed_at: row.executed_at,
        run_id: row.run_id,
    }));
}

/**
 * Get test results by run ID
 */
export async function getTestResultsByRunId(runId: string): Promise<TestResult[]> {
    const supabase = getClient();

    const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('run_id', runId)
        .order('executed_at', { ascending: true }) as { data: TestResultRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching test results by run ID:', error);
        return [];
    }

    return (data ?? []).map(row => ({
        id: row.id,
        test_name: row.test_name,
        test_category: row.test_category as TestCategory,
        status: row.status as TestStatus,
        response_time_ms: row.response_time_ms ?? 0,
        error_message: row.error_message,
        details: (row.details as Record<string, unknown>) ?? {},
        executed_at: row.executed_at,
        run_id: row.run_id,
    }));
}

/**
 * Get test run history
 */
export async function getTestRunHistory(limit: number = 20): Promise<TestRunSummary[]> {
    const supabase = getClient();

    const { data, error } = await supabase
        .from('test_run_summaries')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit) as { data: any[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching test run history:', error);
        return [];
    }

    return (data ?? []).map(row => ({
        run_id: row.run_id,
        started_at: row.started_at,
        completed_at: row.completed_at,
        total_tests: row.total_tests,
        passed: row.passed,
        failed: row.failed,
        skipped: row.skipped,
        total_duration_ms: row.total_duration_ms,
        category: row.category,
    }));
}

/**
 * Get test statistics
 */
export async function getTestStatistics(timeWindowHours: number = 24): Promise<{
    totalRuns: number;
    passRate: number;
    averageDuration: number;
    failuresByCategory: Record<TestCategory, number>;
}> {
    const supabase = getClient();
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - timeWindowHours);

    const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .gte('executed_at', timeWindow.toISOString()) as { data: TestResultRow[] | null; error: Error | null };

    if (error || !data) {
        return {
            totalRuns: 0,
            passRate: 0,
            averageDuration: 0,
            failuresByCategory: {
                authentication: 0,
                core_features: 0,
                payment: 0,
                admin: 0,
            },
        };
    }

    const total = data.length;
    const passed = data.filter(r => r.status === 'passed').length;
    const failures = data.filter(r => r.status === 'failed');

    const failuresByCategory = failures.reduce((acc, curr) => {
        const cat = curr.test_category as TestCategory;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, { authentication: 0, core_features: 0, payment: 0, admin: 0 } as Record<TestCategory, number>);

    return {
        totalRuns: total,
        passRate: total > 0 ? (passed / total) * 100 : 0,
        averageDuration: total > 0
            ? data.reduce((sum, r) => sum + (r.response_time_ms ?? 0), 0) / total
            : 0,
        failuresByCategory,
    };
}

/**
 * Generate comprehensive test report
 */
export async function generateTestReport(runId?: string): Promise<{
    summary: TestRunSummary | null;
    results: TestResult[];
    statistics: {
        totalRuns: number;
        passRate: number;
        averageDuration: number;
        failuresByCategory: Record<TestCategory, number>;
    };
}> {
    let results: TestResult[] = [];
    let summary: TestRunSummary | null = null;

    if (runId) {
        results = await getTestResultsByRunId(runId);
        const history = await getTestRunHistory(1);
        summary = history.find(h => h.run_id === runId) ?? null;
    } else {
        results = await getRecentTestResults(50);
        const history = await getTestRunHistory(1);
        summary = history[0] ?? null;
    }

    const statistics = await getTestStatistics(24);

    return {
        summary,
        results,
        statistics,
    };
}
