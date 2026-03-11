import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { createAdminSupabaseClient } from '@/lib/supabase';

const EXPORT_FORMATS = ['pdf', 'csv', 'xlsx', 'json', 'docx'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                const stringValue = value === null || value === undefined ? '' : String(value);
                return stringValue.includes(',') || stringValue.includes('"')
                    ? `"${stringValue.replace(/"/g, '""')}"`
                    : stringValue;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
}

function convertToJSON(data: Record<string, unknown>[]): string {
    return JSON.stringify(data, null, 2);
}

function arrayToXLSX(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    let xlsx = headers.join('\t') + '\n';
    data.forEach(row => {
        xlsx += headers.map(h => {
            const val = row[h];
            return val === null || val === undefined ? '' : String(val);
        }).join('\t') + '\n';
    });
    return xlsx;
}

export async function GET(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const admin = await requireAdminRequest(request);
            if (!admin) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Admin access required');
            }

            const { searchParams } = new URL(request.url);
            const report = searchParams.get('report');
            const format = (searchParams.get('format') || 'csv').toLowerCase() as ExportFormat;
            const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

            if (!report) {
                throw createApiError(ErrorType.VALIDATION, 'Report type is required');
            }

            if (!EXPORT_FORMATS.includes(format)) {
                throw createApiError(ErrorType.VALIDATION, `Invalid format. Supported: ${EXPORT_FORMATS.join(', ')}`);
            }

            const supabase = createAdminSupabaseClient();
            let data: Record<string, unknown>[] = [];
            let filename = `${report}_${month}`;

            switch (report) {
                // Lead Reports
                case 'all-leads':
                    const { data: leads } = await supabase.from('lead_forms').select('*').order('created_at', { ascending: false });
                    data = ((leads || []) as any[]).map((l: any) => ({
                        Name: l.name,
                        Phone: l.phone,
                        Email: l.email,
                        'Exam Target': l.exam_target,
                        'Class Level': l.class_level,
                        City: l.city,
                        State: l.state,
                        Source: l.source,
                        Status: l.status,
                        'Created At': l.created_at
                    }));
                    filename = `Leads_${month}`;
                    break;

                case 'leads-by-status':
                    const { data: statusLeads } = await supabase.from('lead_forms').select('*').order('created_at', { ascending: false });
                    data = ((statusLeads || []) as any[]).reduce((acc: Record<string, unknown>[], l: any) => {
                        const existing = acc.find(a => a.Status === l.status);
                        if (existing) {
                            (existing as Record<string, number>).Count = ((existing as Record<string, number>).Count || 0) + 1;
                        } else {
                            acc.push({ Status: l.status, Count: 1 });
                        }
                        return acc;
                    }, []);
                    filename = `Leads_by_Status_${month}`;
                    break;

                case 'leads-conversion':
                    const { data: convLeads } = await supabase.from('lead_forms').select('*');
                    const converted = ((convLeads || []) as any[]).filter((l: any) => l.status === 'converted').length;
                    const total = (convLeads || []).length;
                    data = [{ 'Total Leads': total, 'Converted': converted, 'Conversion Rate': total > 0 ? ((converted / total) * 100).toFixed(2) + '%' : '0%' }];
                    filename = `Lead_Conversion_${month}`;
                    break;

                // Student Reports
                case 'all-students':
                    const { data: students } = await supabase.from('profiles').select('*, student_profiles(*)').eq('role', 'student');
                    data = ((students || []) as any[]).map((s: any) => ({
                        Name: s.full_name,
                        Email: s.email,
                        Phone: s.phone,
                        City: s.city,
                        'Exam Target': s.exam_target,
                        'Class Level': s.class_level,
                        'Study Streak': s.student_profiles?.[0]?.study_streak || 0,
                        'Total Points': s.student_profiles?.[0]?.total_points || 0,
                        'Subscription': s.student_profiles?.[0]?.subscription_status || 'N/A',
                        'Created At': s.created_at
                    }));
                    filename = `Students_${month}`;
                    break;

                case 'student-performance':
                    const { data: perfStudents } = await supabase.from('profiles').select('*, student_profiles(*)').eq('role', 'student');
                    data = ((perfStudents || []) as any[]).map((s: any) => ({
                        Name: s.full_name,
                        'Study Streak': s.student_profiles?.[0]?.study_streak || 0,
                        'Longest Streak': s.student_profiles?.[0]?.longest_streak || 0,
                        'Total Study Minutes': s.student_profiles?.[0]?.total_study_minutes || 0,
                        'Rank Prediction': s.student_profiles?.[0]?.rank_prediction || 'N/A',
                        'Percentile Prediction': s.student_profiles?.[0]?.percentile_prediction || 'N/A'
                    }));
                    filename = `Student_Performance_${month}`;
                    break;

                // Course Reports
                case 'all-courses':
                    const { data: courses } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
                    data = ((courses || []) as any[]).map((c: any) => ({
                        Title: c.title,
                        Description: c.description,
                        Price: c.price,
                        'GST Rate': c.gst_rate || 18,
                        'Total Price': c.price ? c.price * (1 + (c.gst_rate || 18) / 100) : 0,
                        Category: c.category,
                        Level: c.level,
                        'Enrollment Count': c.enrollment_count || 0,
                        Status: c.is_published ? 'Published' : 'Draft',
                        'Created At': c.created_at
                    }));
                    filename = `Courses_${month}`;
                    break;

                // Payment Reports
                case 'all-payments':
                    const { data: payments } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
                    data = ((payments || []) as any[]).map((p: any) => ({
                        'Order ID': p.razorpay_order_id,
                        'Payment ID': p.razorpay_payment_id,
                        Amount: p.amount,
                        Status: p.status,
                        Type: p.payment_type,
                        'Student Email': p.student_id,
                        'Created At': p.created_at
                    }));
                    filename = `Payments_${month}`;
                    break;

                case 'payment-summary':
                    const { data: paySummary } = await supabase.from('payments').select('amount, status, payment_type');
                    const totalAmount = ((paySummary || []) as any[]).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                    const successPayments = ((paySummary || []) as any[]).filter((p: any) => p.status === 'completed').length;
                    const failedPayments = ((paySummary || []) as any[]).filter((p: any) => p.status === 'failed').length;
                    data = [
                        { 'Total Transactions': (paySummary || []).length, 'Total Amount': totalAmount },
                        { 'Successful': successPayments, 'Failed': failedPayments }
                    ];
                    filename = `Payment_Summary_${month}`;
                    break;

                // Donation Reports
                case 'all-donations':
                    const { data: donations } = await supabase.from('donations').select('*').order('created_at', { ascending: false });
                    data = ((donations || []) as any[]).map((d: any) => ({
                        'Receipt Number': d.receipt_number,
                        'Donor Name': d.donor_name,
                        'Donor Email': d.donor_email,
                        Amount: d.amount,
                        Status: d.status,
                        'Payment ID': d.razorpay_payment_id,
                        'Created At': d.created_at
                    }));
                    filename = `Donations_${month}`;
                    break;

                // Lecture Reports
                case 'all-lectures':
                    const { data: lectures } = await supabase.from('lectures').select('*').order('created_at', { ascending: false });
                    data = ((lectures || []) as any[]).map((l: any) => ({
                        Title: l.title,
                        Description: l.description,
                        Subject: l.subject,
                        Faculty: l.faculty_name,
                        Duration: l.duration_minutes,
                        'Video URL': l.video_url,
                        Status: l.is_published ? 'Published' : 'Draft',
                        'Created At': l.created_at
                    }));
                    filename = `Lectures_${month}`;
                    break;

                // Test Reports
                case 'all-tests':
                    const { data: tests } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
                    data = ((tests || []) as any[]).map((t: any) => ({
                        Title: t.title,
                        Description: t.description,
                        Type: t.test_type,
                        'Question Count': t.question_count,
                        Duration: t.duration_minutes,
                        'Total Marks': t.total_marks,
                        Status: t.is_published ? 'Published' : 'Draft',
                        'Created At': t.created_at
                    }));
                    filename = `Tests_${month}`;
                    break;

                // Question Reports
                case 'all-questions':
                    const { data: questions } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
                    data = ((questions || []) as any[]).map((q: any) => ({
                        'Question Text': q.question_text,
                        'Solution': q.solution_text,
                        Difficulty: q.difficulty_level,
                        Subject: q.subject,
                        Topic: q.topic,
                        Type: q.question_type,
                        Marks: q.marks,
                        'Created At': q.created_at
                    }));
                    filename = `Questions_${month}`;
                    break;

                // Faculty Reports
                case 'all-faculty':
                    const { data: faculty } = await supabase.from('faculty').select('*').order('name', { ascending: true });
                    data = ((faculty || []) as any[]).map((f: any) => ({
                        Name: f.name,
                        Subject: f.subject,
                        'Qualification': f.qualification,
                        Experience: f.experience_years + ' years',
                        About: f.bio,
                        'Created At': f.created_at
                    }));
                    filename = `Faculty_${month}`;
                    break;

                // Career Reports
                case 'all-careers':
                    const { data: careers } = await supabase.from('careers').select('*').order('created_at', { ascending: false });
                    data = ((careers || []) as any[]).map((c: any) => ({
                        Title: c.title,
                        Description: c.description,
                        Location: c.location,
                        'Job Type': c.job_type,
                        Salary: c.salary_range,
                        Status: c.is_active ? 'Active' : 'Inactive',
                        'Created At': c.created_at
                    }));
                    filename = `Careers_${month}`;
                    break;

                case 'career-applications':
                    const { data: applications } = await supabase.from('career_applications').select('*, careers(title)').order('created_at', { ascending: false });
                    data = ((applications || []) as any[]).map((a: any) => ({
                        Name: a.full_name,
                        Email: a.email,
                        Phone: a.phone,
                        'Applied For': a.careers?.title || 'N/A',
                        Status: a.status,
                        'Applied At': a.created_at
                    }));
                    filename = `Career_Applications_${month}`;
                    break;

                // Analytics Reports
                case 'platform-analytics':
                    const { data: profiles } = await supabase.from('profiles').select('role, created_at') as { data: Array<{ role?: string }> | null };
                    const { data: sp } = await supabase.from('student_profiles').select('*');
                    
                    const roleCounts = ((profiles) || []).reduce((acc, p) => {
                        const role = p?.role || 'unknown';
                        acc[role] = (acc[role] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    
                    const totalStudyMinutes = (sp || []).reduce((sum, s: any) => sum + (s.total_study_minutes || 0), 0);
                    const avgStreak = sp?.length ? (sp.reduce((sum, s: any) => sum + (s.study_streak || 0), 0) / sp.length).toFixed(2) : 0;
                    
                    data = [
                        { 'Total Users': (profiles || []).length, ...roleCounts },
                        { 'Total Study Minutes': totalStudyMinutes, 'Average Streak': avgStreak }
                    ];
                    filename = `Platform_Analytics_${month}`;
                    break;

                default:
                    throw createApiError(ErrorType.VALIDATION, `Unknown report: ${report}`);
            }

            const COMPANY_NAME = 'SaviEduTech';
            const COMPANY_TAGLINE = 'A Brand Unit of Savita Global Interprises';
            const REPORT_TITLE = report.replace(/-/g, ' ').toUpperCase();
            const REPORT_DATE = new Date().toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
            });

            function addBrandingCSV(csvContent: string): string {
                const header = `${COMPANY_NAME} - ${COMPANY_TAGLINE}\n${REPORT_TITLE}\nReport Date: ${REPORT_DATE}\nGenerated: ${new Date().toISOString()}\n\n`;
                const footer = `\n\n--- Generated by ${COMPANY_NAME} ---\n${COMPANY_TAGLINE}\nReport Generated on: ${new Date().toLocaleString('en-IN')}`;
                return header + csvContent + footer;
            }

            function addBrandingJSON(jsonContent: string): string {
                const brandedData = {
                    company: {
                        name: COMPANY_NAME,
                        tagline: COMPANY_TAGLINE
                    },
                    report: {
                        title: REPORT_TITLE,
                        date: REPORT_DATE,
                        generatedAt: new Date().toISOString()
                    },
                    data: JSON.parse(jsonContent)
                };
                return JSON.stringify(brandedData, null, 2);
            }

            function addBrandingXLSX(xlsxContent: string): string {
                const headerLine = `${COMPANY_NAME} - ${COMPANY_TAGLINE}`;
                const reportLine = `${REPORT_TITLE} | Report Date: ${REPORT_DATE}`;
                return headerLine + '\n' + reportLine + '\n' + '-'.repeat(80) + '\n\n' + xlsxContent + '\n\n--- Generated by ' + COMPANY_NAME + ' ---';
            }

            function addBrandingDOCX(markdownContent: string): string {
                return `# ${COMPANY_NAME}\n## ${COMPANY_TAGLINE}\n\n---\n\n# ${REPORT_TITLE}\n**Report Date:** ${REPORT_DATE}\n\n---\n\n${markdownContent}\n\n---\n\n*Generated by ${COMPANY_NAME}*\n*${COMPANY_TAGLINE}*\n*Report Generated on: ${new Date().toLocaleString('en-IN')}*`;
            }

            let content: string;
            let contentType: string;
            let fileExtension: string;

            switch (format) {
                case 'json':
                    content = addBrandingJSON(convertToJSON(data));
                    contentType = 'application/json';
                    fileExtension = 'json';
                    break;
                case 'csv':
                    content = addBrandingCSV(convertToCSV(data));
                    contentType = 'text/csv';
                    fileExtension = 'csv';
                    break;
                case 'xlsx':
                    content = addBrandingXLSX(arrayToXLSX(data));
                    contentType = 'application/vnd.ms-excel';
                    fileExtension = 'xlsx';
                    break;
                case 'docx':
                    content = addBrandingDOCX(`# ${REPORT_TITLE}\n\n${convertToCSV(data).replace(/,/g, ' | ')}`);
                    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    fileExtension = 'docx';
                    break;
                case 'pdf':
                default:
                    content = addBrandingJSON(convertToJSON(data));
                    contentType = 'application/pdf';
                    fileExtension = 'pdf';
            }

            const headers = new Headers();
            headers.set('Content-Type', contentType);
            headers.set('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);

            return new NextResponse(content, { status: 200, headers });
        },
        {
            routeLabel: '/api/admin/reports/export',
            defaultCacheControl: 'no-store',
        }
    );
}
