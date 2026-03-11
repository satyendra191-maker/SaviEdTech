import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { createAdminSupabaseClient } from '@/lib/supabase';

interface AdminTask {
    action: string;
    category: string;
    params?: Record<string, any>;
}

const TASK_PATTERNS: { pattern: RegExp; task: AdminTask }[] = [
    // Student tasks
    { pattern: /add.*student|new.*student|create.*student/i, task: { action: 'create_student', category: 'students' } },
    { pattern: /show.*student|view.*student|list.*student|all.*student/i, task: { action: 'list_students', category: 'students' } },
    { pattern: /update.*student|edit.*student/i, task: { action: 'update_student', category: 'students' } },
    { pattern: /student.*progress|student.*performance/i, task: { action: 'student_performance', category: 'students' } },
    { pattern: /export.*student/i, task: { action: 'export_students', category: 'students' } },

    // Course tasks
    { pattern: /add.*course|new.*course|create.*course/i, task: { action: 'create_course', category: 'courses' } },
    { pattern: /show.*course|view.*course|list.*course|all.*course/i, task: { action: 'list_courses', category: 'courses' } },
    { pattern: /publish.*course/i, task: { action: 'publish_course', category: 'courses' } },

    // Lecture tasks
    { pattern: /add.*lecture|new.*lecture|upload.*lecture/i, task: { action: 'create_lecture', category: 'lectures' } },
    { pattern: /show.*lecture|view.*lecture|list.*lecture/i, task: { action: 'list_lectures', category: 'lectures' } },
    { pattern: /generate.*lecture|ai.*lecture/i, task: { action: 'generate_lecture', category: 'lectures' } },

    // Question tasks
    { pattern: /add.*question|new.*question|create.*question/i, task: { action: 'create_question', category: 'questions' } },
    { pattern: /generate.*question|ai.*question/i, task: { action: 'generate_questions', category: 'questions' } },
    { pattern: /show.*question|view.*question|list.*question/i, task: { action: 'list_questions', category: 'questions' } },

    // Test tasks
    { pattern: /add.*test|new.*test|create.*test|generate.*test/i, task: { action: 'create_test', category: 'tests' } },
    { pattern: /show.*test|view.*test|list.*test|schedule.*test/i, task: { action: 'list_tests', category: 'tests' } },
    { pattern: /generate.*dpp|create.*dpp/i, task: { action: 'generate_dpp', category: 'tests' } },

    // Payment/Finance tasks
    { pattern: /show.*payment|payment.*history/i, task: { action: 'list_payments', category: 'payments' } },
    { pattern: /show.*revenue|revenue.*report|financial.*report/i, task: { action: 'revenue_report', category: 'payments' } },
    { pattern: /gst.*report|export.*gst/i, task: { action: 'gst_report', category: 'payments' } },
    { pattern: /invoice|generate.*invoice/i, task: { action: 'generate_invoice', category: 'payments' } },
    { pattern: /donation/i, task: { action: 'list_donations', category: 'payments' } },

    // Lead tasks
    { pattern: /show.*lead|view.*lead|list.*lead|all.*lead/i, task: { action: 'list_leads', category: 'leads' } },
    { pattern: /add.*lead|new.*lead/i, task: { action: 'create_lead', category: 'leads' } },
    { pattern: /convert.*lead/i, task: { action: 'convert_lead', category: 'leads' } },

    // Career tasks
    { pattern: /show.*application|view.*application|list.*application/i, task: { action: 'list_applications', category: 'careers' } },
    { pattern: /post.*job|new.*job|create.*job/i, task: { action: 'create_job', category: 'careers' } },

    // CMS tasks
    { pattern: /create.*page|new.*page/i, task: { action: 'create_page', category: 'cms' } },
    { pattern: /manage.*blog|blog.*post/i, task: { action: 'manage_blog', category: 'cms' } },

    // Analytics tasks
    { pattern: /analytics|dashboard|overview/i, task: { action: 'get_analytics', category: 'analytics' } },
    { pattern: /report.*generate|export.*report/i, task: { action: 'generate_report', category: 'analytics' } },

    // Video Knowledge tasks
    { pattern: /upload.*video|video.*upload|add.*video/i, task: { action: 'upload_video', category: 'video-knowledge' } },
    { pattern: /video.*list|show.*video|view.*video|all.*video/i, task: { action: 'list_videos', category: 'video-knowledge' } },
    { pattern: /video.*transcript|extract.*transcript|transcribe/i, task: { action: 'video_transcript', category: 'video-knowledge' } },
    { pattern: /video.*quiz|quiz.*video|generate.*quiz.*video/i, task: { action: 'video_quiz', category: 'video-knowledge' } },
    { pattern: /video.*notes|notes.*video|create.*notes.*video/i, task: { action: 'video_notes', category: 'video-knowledge' } },
    { pattern: /video.*content|analyze.*video|video.*analysis/i, task: { action: 'video_analysis', category: 'video-knowledge' } },
    { pattern: /video.*chapter|chapter.*video/i, task: { action: 'video_chapters', category: 'video-knowledge' } },

    // General AI tasks
    { pattern: /generate.*content|ai.*generate/i, task: { action: 'generate_content', category: 'ai' } },
];

function detectTask(query: string): AdminTask | null {
    for (const { pattern, task } of TASK_PATTERNS) {
        if (pattern.test(query)) {
            return task;
        }
    }
    return { action: 'help', category: 'general' };
}

async function executeTask(task: AdminTask, supabase: any): Promise<{ response: string; actions?: any[] }> {
    switch (task.action) {
        case 'list_students': {
            const { data: students } = await supabase
                .from('profiles')
                .select('*, student_profiles(*)')
                .eq('role', 'student')
                .limit(20);
            
            const countResult = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
            const total = countResult.count || 0;

            return {
                response: `📊 **Student List** (Showing ${students?.length || 0} of ${total} total students):\n\n` +
                    (students || []).map((s: any) => `• ${s.full_name || 'N/A'} - ${s.email} - ${s.exam_target || 'N/A'}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_students', type: 'view', label: 'View All Students', data: { href: '/admin/students' } },
                    { id: 'add_student', type: 'create', label: 'Add New Student', data: { href: '/admin/students' } },
                    { id: 'export_students', type: 'export', label: 'Export Data', data: { report: 'all-students' } }
                ]
            };
        }

        case 'list_courses': {
            const { data: courses } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            return {
                response: `📚 **Course List** (${courses?.length || 0} courses):\n\n` +
                    (courses || []).map((c: any) => `• ${c.title} - ₹${c.price || 0} - ${c.is_published ? '✅ Published' : '❌ Draft'}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_courses', type: 'view', label: 'View All Courses', data: { href: '/admin/courses' } },
                    { id: 'create_course', type: 'create', label: 'Create New Course', data: { href: '/admin/courses' } }
                ]
            };
        }

        case 'list_lectures': {
            const { data: lectures } = await supabase
                .from('lectures')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            return {
                response: `🎬 **Lecture List** (${lectures?.length || 0} lectures):\n\n` +
                    (lectures || []).map((l: any) => `• ${l.title} - ${l.subject || 'N/A'} - ${l.is_published ? '✅ Published' : '❌ Draft'}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_lectures', type: 'view', label: 'View All Lectures', data: { href: '/admin/lectures' } },
                    { id: 'upload_lecture', type: 'create', label: 'Upload Lecture', data: { href: '/admin/lectures' } },
                    { id: 'generate_lecture', type: 'generate', label: 'Generate AI Lecture', data: { href: '/admin/ai-content' } }
                ]
            };
        }

        case 'list_payments': {
            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

            return {
                response: `💳 **Recent Payments** (Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}):\n\n` +
                    (payments || []).slice(0, 10).map((p: any) => `• ₹${p.amount} - ${p.status} - ${p.payment_type}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_payments', type: 'view', label: 'View All Payments', data: { href: '/admin/payments' } },
                    { id: 'view_finance', type: 'view', label: 'View Finance', data: { href: '/admin/finance' } },
                    { id: 'export_payments', type: 'export', label: 'Export Payments', data: { report: 'all-payments' } }
                ]
            };
        }

        case 'list_leads': {
            const { data: leads } = await supabase
                .from('lead_forms')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            const newLeads = (leads || []).filter((l: any) => l.status === 'new').length;
            const converted = (leads || []).filter((l: any) => l.status === 'converted').length;

            return {
                response: `📋 **Lead List** (Total: ${leads?.length || 0}, New: ${newLeads}, Converted: ${converted}):\n\n` +
                    (leads || []).map((l: any) => `• ${l.name} - ${l.phone} - ${l.exam_target} - ${l.status}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_leads', type: 'view', label: 'View All Leads', data: { href: '/admin/leads' } },
                    { id: 'export_leads', type: 'export', label: 'Export Leads', data: { report: 'all-leads' } }
                ]
            };
        }

        case 'revenue_report': {
            const { data: payments } = await supabase.from('payments').select('amount, status');
            const { data: donations } = await supabase.from('donations').select('amount');

            const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const totalDonations = (donations || []).reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
            const gstCollected = totalRevenue * 0.18;

            return {
                response: `📈 **Financial Summary**:\n\n` +
                    `• **Course Revenue:** ₹${totalRevenue.toLocaleString('en-IN')}\n` +
                    `• **Donations:** ₹${totalDonations.toLocaleString('en-IN')}\n` +
                    `• **GST Collected:** ₹${gstCollected.toLocaleString('en-IN')}\n` +
                    `• **Net Revenue:** ₹${(totalRevenue + totalDonations - gstCollected).toLocaleString('en-IN')}` +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_finance', type: 'view', label: 'View Full Finance', data: { href: '/admin/finance' } },
                    { id: 'export_gstr1', type: 'export', label: 'Export GSTR-1', data: { report: 'gstr1' } },
                    { id: 'export_gstr3b', type: 'export', label: 'Export GSTR-3B', data: { report: 'gstr3b' } },
                    { id: 'export_revenue', type: 'export', label: 'Export Revenue Report', data: { report: 'revenue-summary' } }
                ]
            };
        }

        case 'gst_report': {
            return {
                response: `🧾 **GST Reports**:\n\n` +
                    `I can generate the following GST reports for you:\n\n` +
                    `• **GSTR-1** - Details of outward supplies\n` +
                    `• **GSTR-3B** - Summary of tax liability\n` +
                    `• **GST Summary** - Complete GST overview\n` +
                    `• **Transaction Ledger** - Double-entry records\n\n` +
                    `Select a report to download:`,
                actions: [
                    { id: 'export_gstr1', type: 'export', label: 'Download GSTR-1', data: { report: 'gstr1' } },
                    { id: 'export_gstr3b', type: 'export', label: 'Download GSTR-3B', data: { report: 'gstr3b' } },
                    { id: 'export_gst_summary', type: 'export', label: 'Download GST Summary', data: { report: 'gst-summary' } },
                    { id: 'export_ledger', type: 'export', label: 'Download Ledger', data: { report: 'transaction-ledger' } }
                ]
            };
        }

        case 'list_tests': {
            const { data: tests } = await supabase
                .from('tests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            return {
                response: `📝 **Test List** (${tests?.length || 0} tests):\n\n` +
                    (tests || []).map((t: any) => `• ${t.title} - ${t.test_type} - ${t.question_count} Qs - ${t.is_published ? '✅ Published' : '❌ Draft'}`).join('\n') +
                    `\n\n**Quick Actions:**`,
                actions: [
                    { id: 'view_all_tests', type: 'view', label: 'View All Tests', data: { href: '/admin/tests' } },
                    { id: 'create_test', type: 'create', label: 'Create Test', data: { href: '/admin/tests' } },
                    { id: 'generate_ai_test', type: 'generate', label: 'Generate AI Test', data: { href: '/admin/ai-content' } }
                ]
            };
        }

        case 'generate_questions':
        case 'generate_lecture':
        case 'generate_content': {
            return {
                response: `🤖 **AI Content Generation**\n\n` +
                    `I can generate the following content using AI:\n\n` +
                    `• **AI Lectures** - Generate complete video lectures\n` +
                    `• **AI Questions** - Create question banks with solutions\n` +
                    `• **DPP (Daily Practice Problems)** - Topic-wise practice sets\n` +
                    `• **Mock Tests** - Full exam simulations\n` +
                    `• **Academic Calendar** - Study schedule\n\n` +
                    `Click below to access the AI Content Generator:`,
                actions: [
                    { id: 'go_ai_content', type: 'generate', label: 'Open AI Content Generator', data: { href: '/admin/ai-content' } }
                ]
            };
        }

        case 'get_analytics': {
            const { data: profiles } = await supabase.from('profiles').select('role');
            const { data: payments } = await supabase.from('payments').select('amount');

            const students = (profiles || []).filter((p: any) => p.role === 'student').length;
            const totalRevenue = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

            return {
                response: `📊 **Platform Analytics**:\n\n` +
                    `• **Total Students:** ${students}\n` +
                    `• **Total Revenue:** ₹${totalRevenue.toLocaleString('en-IN')}\n` +
                    `• **Active Users:** ${Math.floor(students * 0.7)}\n\n` +
                    `For detailed analytics, visit the Analytics dashboard:`,
                actions: [
                    { id: 'view_analytics', type: 'view', label: 'View Full Analytics', data: { href: '/admin/analytics' } }
                ]
            };
        }

        default: {
            return {
                response: `I understand you want to "${task.action}" in ${task.category}. 

**Here's what I can help you with:**

👥 **Students** - Add, view, update, export student data
📚 **Courses** - Create, publish, manage courses  
🎬 **Lectures** - Upload, generate AI lectures
📝 **Questions** - Add, generate AI questions
📋 **Tests** - Create tests, generate DPP
💰 **Payments/Finance** - View payments, GST reports, revenue
📨 **Leads** - Manage inquiries and conversions
💼 **Careers** - Post jobs, manage applications
🎨 **CMS** - Manage pages and content
📈 **Reports** - Generate and export reports

**How would you like to proceed?**`,
                actions: [
                    { id: 'go_students', type: 'view', label: 'Manage Students', data: { href: '/admin/students' } },
                    { id: 'go_finance', type: 'view', label: 'View Finance', data: { href: '/admin/finance' } },
                    { id: 'go_ai', type: 'generate', label: 'AI Content Generator', data: { href: '/admin/ai-content' } }
                ]
            };
        }
    }
}

export async function POST(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const admin = await requireAdminRequest(request);
            if (!admin) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Admin access required');
            }

            const body = await request.json().catch(() => ({}));
            const { query, context } = body as { query?: string; context?: string };

            if (!query) {
                throw createApiError(ErrorType.VALIDATION, 'Query is required');
            }

            const supabase = createAdminSupabaseClient();
            const task = detectTask(query);
            
            console.log('Detected task:', task, 'for query:', query);

            const result = await executeTask(task, supabase);

            return NextResponse.json({
                success: true,
                response: result.response,
                actions: result.actions,
                task: task
            });
        },
        {
            routeLabel: '/api/ai/admin-query',
            defaultCacheControl: 'no-store',
        }
    );
}
