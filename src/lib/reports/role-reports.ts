import { format } from 'date-fns';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { createAdminSupabaseClient } from '@/lib/supabase';

export type RoleReportFormat = 'pdf' | 'xlsx' | 'json' | 'docx';

export interface RoleReportPermission {
    role_slug: string;
    can_generate: boolean;
    available_formats: string[];
    custom_fields: Array<{ label: string; value: string }>;
}

interface RoleReportSection {
    title: string;
    rows: Array<{ label: string; value: string }>;
}

export interface RoleReportDataset {
    title: string;
    role: string;
    generatedAt: string;
    summary: Array<{ label: string; value: string }>;
    sections: RoleReportSection[];
    customFields: Array<{ label: string; value: string }>;
}

const REPORT_HEADER_TITLE = 'SaviEduTech';
const REPORT_HEADER_TAGLINE = 'JEE | NEET | Board Preparation';
const REPORT_FOOTER_TEXT = 'SGI | Savita Global Interprises';

function getAdminClient() {
    return createAdminSupabaseClient() as any;
}

function formatRoleLabel(role: string): string {
    return role
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (typeof value === 'number') {
        return value.toLocaleString('en-IN');
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return String(value);
}

export async function getRoleReportPermissions(): Promise<RoleReportPermission[]> {
    const { data, error } = await getAdminClient()
        .from('role_report_permissions')
        .select('*')
        .order('role_slug', { ascending: true });

    if (error || !data) {
        return [];
    }

    return (data as any[]).map((row) => ({
        role_slug: row.role_slug,
        can_generate: Boolean(row.can_generate),
        available_formats: Array.isArray(row.available_formats) ? row.available_formats : ['pdf', 'xlsx', 'json', 'docx'],
        custom_fields: Array.isArray(row.custom_fields) ? row.custom_fields : [],
    }));
}

export async function upsertRoleReportPermission(input: RoleReportPermission, updatedBy: string | null) {
    const { error } = await getAdminClient()
        .from('role_report_permissions')
        .upsert({
            role_slug: input.role_slug,
            can_generate: input.can_generate,
            available_formats: input.available_formats,
            custom_fields: input.custom_fields,
            updated_by: updatedBy,
        }, {
            onConflict: 'role_slug',
        });

    if (error) {
        throw error;
    }
}

export async function getRoleReportPermission(roleSlug: string): Promise<RoleReportPermission | null> {
    const { data, error } = await getAdminClient()
        .from('role_report_permissions')
        .select('*')
        .eq('role_slug', roleSlug)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return {
        role_slug: data.role_slug,
        can_generate: Boolean(data.can_generate),
        available_formats: Array.isArray(data.available_formats) ? data.available_formats : ['pdf', 'xlsx', 'json', 'docx'],
        custom_fields: Array.isArray(data.custom_fields) ? data.custom_fields : [],
    };
}

export async function buildRoleReportDataset(userId: string, role: string): Promise<RoleReportDataset> {
    const supabase = getAdminClient();

    const [
        profileResult,
        notificationsResult,
        lectureProgressResult,
        practiceResult,
        testsResult,
        studentProgressResult,
        doubtsResult,
        pointsResult,
        achievementsResult,
        paymentsResult,
        parentLinksResult,
        lecturesManagedResult,
        blogPostsResult,
        financeAuditResult,
        careerApplicationsResult,
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).or(`user_id.eq.${userId},user_id.is.null`),
        supabase.from('lecture_progress').select('progress_percent, is_completed, last_watched_at').eq('user_id', userId),
        supabase.from('question_attempts').select('is_correct, occurred_at').eq('user_id', userId),
        supabase.from('test_attempts').select('status, total_score, max_score, percentile, submitted_at').eq('user_id', userId),
        supabase.from('student_progress').select('accuracy_percent, total_questions_attempted, tests_taken, total_study_minutes').eq('user_id', userId),
        supabase.from('doubts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_points').select('total_points').eq('user_id', userId).maybeSingle(),
        supabase.from('user_achievements').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('payments').select('amount, status, payment_type').eq('user_id', userId),
        supabase.from('parent_links').select('student_id', { count: 'exact' }).eq('parent_id', userId),
        supabase.from('lectures').select('id', { count: 'exact', head: true }).eq('faculty_id', userId),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
        supabase.from('financial_audit_logs').select('id', { count: 'exact', head: true }).eq('actor_user_id', userId),
        supabase.from('career_applications').select('id', { count: 'exact', head: true }),
    ]);

    const profile = profileResult.data || null;
    const lectureProgress = Array.isArray(lectureProgressResult.data) ? lectureProgressResult.data : [];
    const practiceAttempts = Array.isArray(practiceResult.data) ? practiceResult.data : [];
    const tests = Array.isArray(testsResult.data) ? testsResult.data : [];
    const studentProgress = Array.isArray(studentProgressResult.data) ? studentProgressResult.data : [];
    const payments = Array.isArray(paymentsResult.data) ? paymentsResult.data : [];

    const completedLectures = lectureProgress.filter((item) => item.is_completed).length;
    const correctPractice = practiceAttempts.filter((item) => item.is_correct).length;
    const completedTests = tests.filter((item) => item.status === 'completed' || item.status === 'time_up').length;
    const averageAccuracy = studentProgress.length
        ? Math.round(studentProgress.reduce((sum, row) => sum + Number(row.accuracy_percent || 0), 0) / studentProgress.length)
        : 0;
    const completedRevenue = payments
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const summary = [
        { label: 'Name', value: formatValue(profile?.full_name || 'User') },
        { label: 'Email', value: formatValue(profile?.email) },
        { label: 'Role', value: formatRoleLabel(role) },
        { label: 'Joined', value: profile?.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : '-' },
        { label: 'Last Active', value: profile?.last_active_at ? format(new Date(profile.last_active_at), 'dd MMM yyyy, hh:mm a') : '-' },
    ];

    const sections: RoleReportSection[] = [
        {
            title: 'Activity Snapshot',
            rows: [
                { label: 'Notifications Available', value: formatValue(notificationsResult.count || 0) },
                { label: 'Lecture Sessions', value: formatValue(lectureProgress.length) },
                { label: 'Completed Lectures', value: formatValue(completedLectures) },
                { label: 'Practice Attempts', value: formatValue(practiceAttempts.length) },
                { label: 'Correct Answers', value: formatValue(correctPractice) },
                { label: 'Tests Completed', value: formatValue(completedTests) },
            ],
        },
        {
            title: 'Performance and Usage',
            rows: [
                { label: 'Average Accuracy', value: `${averageAccuracy}%` },
                { label: 'Study Minutes', value: formatValue(studentProgress.reduce((sum, row) => sum + Number(row.total_study_minutes || 0), 0)) },
                { label: 'Doubts Raised', value: formatValue(doubtsResult.count || 0) },
                { label: 'Reward Points', value: formatValue(pointsResult.data?.total_points || 0) },
                { label: 'Achievements Earned', value: formatValue(achievementsResult.count || 0) },
                { label: 'Payments Completed', value: `Rs ${completedRevenue.toLocaleString('en-IN')}` },
            ],
        },
    ];

    if (role === 'parent') {
        sections.push({
            title: 'Parent Monitoring',
            rows: [
                { label: 'Linked Students', value: formatValue(parentLinksResult.count || 0) },
            ],
        });
    }

    if (role === 'content_manager' || role === 'faculty' || role === 'admin') {
        sections.push({
            title: 'Content Operations',
            rows: [
                { label: 'Lectures Managed', value: formatValue(lecturesManagedResult.count || 0) },
                { label: 'Blog Posts Authored', value: formatValue(blogPostsResult.count || 0) },
            ],
        });
    }

    if (role === 'finance_manager' || role === 'accounts_manager') {
        sections.push({
            title: 'Finance Activity',
            rows: [
                { label: 'Finance Audit Events', value: formatValue(financeAuditResult.count || 0) },
                { label: 'Processed User Payments', value: formatValue(payments.length) },
            ],
        });
    }

    if (role === 'hr') {
        sections.push({
            title: 'Hiring Overview',
            rows: [
                { label: 'Career Applications in System', value: formatValue(careerApplicationsResult.count || 0) },
            ],
        });
    }

    const permission = await getRoleReportPermission(role);

    return {
        title: `${formatRoleLabel(role)} Activity Report`,
        role,
        generatedAt: format(new Date(), 'dd MMM yyyy, hh:mm a'),
        summary,
        sections,
        customFields: permission?.custom_fields || [],
    };
}

export async function exportRoleReport(
    dataset: RoleReportDataset,
    formatType: RoleReportFormat
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    switch (formatType) {
        case 'json':
            return {
                buffer: Buffer.from(JSON.stringify(dataset, null, 2), 'utf-8'),
                contentType: 'application/json',
                extension: 'json',
            };
        case 'xlsx':
            return exportRoleReportXlsx(dataset);
        case 'docx':
            return exportRoleReportDocx(dataset);
        default:
            return exportRoleReportPdf(dataset);
    }
}

async function exportRoleReportDocx(
    dataset: RoleReportDataset
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: REPORT_HEADER_TITLE, bold: true, size: 34 }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: REPORT_HEADER_TAGLINE, size: 22 }),
                        ],
                    }),
                    new Paragraph({
                        spacing: { after: 240 },
                        children: [
                            new TextRun({ text: dataset.title, bold: true, size: 28 }),
                        ],
                    }),
                    ...dataset.summary.map((item) => new Paragraph({
                        children: [
                            new TextRun({ text: `${item.label}: `, bold: true }),
                            new TextRun({ text: item.value }),
                        ],
                    })),
                    ...dataset.sections.flatMap((section) => [
                        new Paragraph({
                            spacing: { before: 240, after: 120 },
                            children: [new TextRun({ text: section.title, bold: true, size: 24 })],
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: section.rows.map((row) => new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: row.label })] }),
                                    new TableCell({ children: [new Paragraph({ text: row.value })] }),
                                ],
                            })),
                        }),
                    ]),
                    ...(dataset.customFields.length > 0 ? [
                        new Paragraph({
                            spacing: { before: 240, after: 120 },
                            children: [new TextRun({ text: 'Custom Fields', bold: true, size: 24 })],
                        }),
                        ...dataset.customFields.map((field) => new Paragraph({
                            children: [
                                new TextRun({ text: `${field.label}: `, bold: true }),
                                new TextRun({ text: field.value }),
                            ],
                        })),
                    ] : []),
                    new Paragraph({
                        spacing: { before: 300 },
                        children: [new TextRun({ text: REPORT_FOOTER_TEXT, italics: true, size: 18 })],
                    }),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
    };
}

function exportRoleReportXlsx(
    dataset: RoleReportDataset
): { buffer: Buffer; contentType: string; extension: string } {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(dataset.summary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    dataset.sections.forEach((section, index) => {
        const sheet = XLSX.utils.json_to_sheet(section.rows);
        XLSX.utils.book_append_sheet(workbook, sheet, `Section${index + 1}`);
    });

    if (dataset.customFields.length > 0) {
        const customSheet = XLSX.utils.json_to_sheet(dataset.customFields);
        XLSX.utils.book_append_sheet(workbook, customSheet, 'Custom Fields');
    }

    const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
    }) as Buffer;

    return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
    };
}

function exportRoleReportPdf(
    dataset: RoleReportDataset
): { buffer: Buffer; contentType: string; extension: string } {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    const addFooter = (pageNumber: number) => {
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(REPORT_FOOTER_TEXT, 14, pageHeight - 12);
        doc.text(`Generated ${dataset.generatedAt} | Page ${pageNumber}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
    };

    const ensureSpace = (height: number, pageNumberRef: { value: number }) => {
        if (currentY + height <= pageHeight - 24) {
            return;
        }
        addFooter(pageNumberRef.value);
        doc.addPage();
        pageNumberRef.value += 1;
        currentY = 20;
        addHeader();
    };

    const addHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text(REPORT_HEADER_TITLE, 14, currentY);
        currentY += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(REPORT_HEADER_TAGLINE, 14, currentY);
        currentY += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(dataset.title, 14, currentY);
        currentY += 8;
    };

    const pageNumberRef = { value: 1 };
    addHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    dataset.summary.forEach((item) => {
        ensureSpace(6, pageNumberRef);
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}:`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value, 52, currentY);
        currentY += 6;
    });

    dataset.sections.forEach((section) => {
        ensureSpace(14, pageNumberRef);
        currentY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(section.title, 14, currentY);
        currentY += 6;
        doc.setFontSize(10);
        section.rows.forEach((row) => {
            ensureSpace(6, pageNumberRef);
            doc.setFont('helvetica', 'bold');
            doc.text(row.label, 16, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(row.value, 78, currentY);
            currentY += 6;
        });
    });

    if (dataset.customFields.length > 0) {
        ensureSpace(10, pageNumberRef);
        currentY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Custom Fields', 14, currentY);
        currentY += 6;
        doc.setFontSize(10);
        dataset.customFields.forEach((field) => {
            ensureSpace(6, pageNumberRef);
            doc.setFont('helvetica', 'bold');
            doc.text(field.label, 16, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(field.value, 78, currentY);
            currentY += 6;
        });
    }

    addFooter(pageNumberRef.value);
    return {
        buffer: Buffer.from(doc.output('arraybuffer')),
        contentType: 'application/pdf',
        extension: 'pdf',
    };
}
