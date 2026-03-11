'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, File, ChevronDown, Loader2, Check } from 'lucide-react';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx' | 'json' | 'docx';

interface ReportOption {
    report: string;
    label: string;
    description: string;
}

interface ExportDropdownProps {
    report: string;
    label: string;
    month: string;
    onExport?: (format: ExportFormat) => void;
}

const formatIcons: Record<ExportFormat, typeof FileText> = {
    pdf: FileText,
    csv: FileSpreadsheet,
    xlsx: FileSpreadsheet,
    json: FileJson,
    docx: File,
};

const formatLabels: Record<ExportFormat, string> = {
    pdf: 'PDF Document',
    csv: 'CSV Spreadsheet',
    xlsx: 'Excel Workbook',
    json: 'JSON Data',
    docx: 'Word Document',
};

export function ExportDropdown({ report, label, month, onExport }: ExportDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
    const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = async (format: ExportFormat) => {
        setExportingFormat(format);
        setIsOpen(false);

        try {
            const url = `/api/admin/finance/export?report=${encodeURIComponent(report)}&format=${format}&month=${encodeURIComponent(month)}`;
            
            const response = await fetch(url, { credentials: 'include' });
            
            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `${label.replace(/\s+/g, '_')}_${month}.${format}`;
            
            if (contentDisposition) {
                const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            setExportedFormat(format);
            setTimeout(() => setExportedFormat(null), 2000);
            
            if (onExport) {
                onExport(format);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export. Please try again.');
        } finally {
            setExportingFormat(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={exportingFormat !== null}
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 min-w-[180px]"
            >
                <span className="flex items-center gap-2">
                    {exportingFormat ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : exportedFormat ? (
                        <Check className="h-4 w-4 text-green-600" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    {exportingFormat ? `Exporting...` : exportedFormat ? `Downloaded ${formatLabels[exportedFormat]}` : label}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="p-2">
                        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Select Format
                        </p>
                        {(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
                            const Icon = formatIcons[format];
                            return (
                                <button
                                    key={format}
                                    type="button"
                                    onClick={() => handleExport(format)}
                                    disabled={exportingFormat !== null}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <Icon className="h-4 w-4 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{formatLabels[format]}</span>
                                        <span className="text-xs text-slate-400">.{format} file</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface ReportGridProps {
    reports: ReportOption[];
    selectedMonth: string;
}

export function ReportGrid({ reports, selectedMonth }: ReportGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
                <div key={report.report} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-900">{report.label}</h3>
                            <p className="mt-1 text-sm leading-5 text-slate-500">{report.description}</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <ExportDropdown
                            report={report.report}
                            label={report.label}
                            month={selectedMonth}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export const ALL_FINANCE_REPORTS: ReportOption[] = [
    // GST Reports
    { report: 'gstr1', label: 'GSTR-1 Export', description: 'Details of outward supplies for GST filing' },
    { report: 'gstr3b', label: 'GSTR-3B Export', description: 'Summary of tax liability for monthly filing' },
    { report: 'gst-summary', label: 'GST Summary', description: 'Complete GST collection and payment summary' },
    { report: 'gst-input-credit', label: 'Input Tax Credit', description: 'ITC reconciliation and credit tracking' },
    
    // Sales Reports
    { report: 'monthly-gst-sales', label: 'Monthly GST Sales', description: 'Invoice-level GST sales register' },
    { report: 'course-sales', label: 'Course Sales Report', description: 'Course and subscription sales analysis' },
    { report: 'subscription-sales', label: 'Subscription Sales', description: 'Recurring revenue from subscriptions' },
    { report: 'product-sales', label: 'Product-wise Sales', description: 'Sales breakdown by product/course' },
    
    // Financial Reports
    { report: 'revenue-summary', label: 'Revenue Summary', description: 'High-level revenue, GST, and donations' },
    { report: 'transaction-ledger', label: 'Transaction Ledger', description: 'Double-entry accounting ledger' },
    { report: 'profit-loss', label: 'Profit & Loss Statement', description: 'Income and expense breakdown' },
    { report: 'balance-sheet', label: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
    
    // Donation Reports
    { report: 'donation-transactions', label: 'Donation Transactions', description: 'Complete donation receipt register' },
    { report: 'donor-list', label: 'Donor List', description: 'All donors with donation history' },
    { report: 'donation-receipts', label: 'Donation Receipts', description: 'All generated donation receipts' },
    
    // Invoice Reports
    { report: 'invoice-register', label: 'Invoice Register', description: 'All invoices generated with details' },
    { report: 'pending-invoices', label: 'Pending Invoices', description: 'Unpaid invoices and follow-ups' },
    { report: 'invoice-ageing', label: 'Invoice Ageing Report', description: 'Outstanding invoice aging analysis' },
    
    // Tax Reports
    { report: 'tax-collected', label: 'Tax Collected Report', description: 'GST collected on all transactions' },
    { report: 'tax-paid', label: 'Tax Paid Report', description: 'GST paid on purchases and expenses' },
    { report: 'tds-report', label: 'TDS Report', description: 'Tax deducted at source summary' },
    
    // Expense Reports
    { report: 'expense-report', label: 'Expense Report', description: 'All business expenses categorized' },
    { report: 'vendor-payments', label: 'Vendor Payments', description: 'Payments made to vendors/suppliers' },
    { report: 'salary-payments', label: 'Salary Payments', description: 'Employee salary and wage payments' },
    
    // Audit Reports
    { report: 'audit-trail', label: 'Audit Trail', description: 'Complete financial audit trail' },
    { report: 'bank-reconciliation', label: 'Bank Reconciliation', description: 'Bank statement vs book reconciliation' },
];

export default ExportDropdown;
