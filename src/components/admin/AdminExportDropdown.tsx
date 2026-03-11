'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileJson, File, ChevronDown, Loader2, Check, FileCheck } from 'lucide-react';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx' | 'json' | 'docx';

interface ReportOption {
    report: string;
    label: string;
    description?: string;
}

interface ExportDropdownProps {
    reports: ReportOption[];
    defaultReport?: string;
    label?: string;
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

const formatColors: Record<ExportFormat, string> = {
    pdf: 'text-red-600',
    csv: 'text-green-600',
    xlsx: 'text-emerald-600',
    json: 'text-amber-600',
    docx: 'text-blue-600',
};

function ExportDropdownButton({ 
    onExport, 
    label = 'Download Report',
    icon: Icon = Download 
}: { 
    onExport: (format: ExportFormat) => void; 
    label?: string;
    icon?: typeof Download;
}) {
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
            await onExport(format);
            setExportedFormat(format);
            setTimeout(() => setExportedFormat(null), 2000);
        } catch (error) {
            console.error('Export error:', error);
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
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm"
            >
                <span className="flex items-center gap-2">
                    {exportingFormat ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                    ) : exportedFormat ? (
                        <Check className="h-4 w-4 text-green-600" />
                    ) : (
                        <Icon className="h-4 w-4 text-primary-600" />
                    )}
                    <span className="hidden sm:inline">
                        {exportingFormat ? `Exporting ${formatLabels[exportingFormat]}...` : 
                         exportedFormat ? `${formatLabels[exportedFormat]} Downloaded` : 
                         label}
                    </span>
                    <span className="sm:hidden">
                        {exportingFormat || exportedFormat ? 'Done' : 'Export'}
                    </span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="p-2">
                        <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                            Export Format
                        </p>
                        {(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
                            const Icon = formatIcons[format];
                            return (
                                <button
                                    key={format}
                                    type="button"
                                    onClick={() => handleExport(format)}
                                    disabled={exportingFormat !== null}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                >
                                    <Icon className={`h-4 w-4 ${formatColors[format]}`} />
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

function ReportDropdown({ 
    reports, 
    defaultReport = '', 
    label = 'Download Report' 
}: ExportDropdownProps) {
    const [selectedReport, setSelectedReport] = useState(defaultReport || reports[0]?.report || '');
    const [isExporting, setIsExporting] = useState(false);
    const [showFormats, setShowFormats] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFormats(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = async (format: ExportFormat) => {
        if (!selectedReport) return;
        setIsExporting(true);
        
        try {
            const month = new Date().toISOString().slice(0, 7);
            const response = await fetch(
                `/api/admin/reports/export-all?report=${encodeURIComponent(selectedReport)}&format=${format}&month=${month}`,
                { credentials: 'include' }
            );
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const currentReport = reports.find(r => r.report === selectedReport);
            const filename = `${currentReport?.label || selectedReport}_${month}.${format}`;
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export. Please try again.');
        } finally {
            setIsExporting(false);
            setShowFormats(false);
        }
    };

    const currentReport = reports.find(r => r.report === selectedReport);

    return (
        <div className="flex gap-2" ref={dropdownRef}>
            <div className="relative">
                <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    {reports.map((report) => (
                        <option key={report.report} value={report.report}>
                            {report.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
            </div>
            
            <ExportDropdownButton 
                onExport={handleExport} 
                label={label}
                icon={isExporting ? Loader2 : FileCheck}
            />
        </div>
    );
}

export const LEADS_REPORTS = [
    { report: 'all-leads', label: 'All Leads', description: 'Complete lead data export' },
    { report: 'leads-by-status', label: 'Leads by Status', description: 'Leads grouped by status' },
    { report: 'leads-conversion', label: 'Lead Conversion Report', description: 'Conversion rate analysis' },
];

export const STUDENT_REPORTS = [
    { report: 'all-students', label: 'All Students', description: 'Complete student list' },
    { report: 'student-performance', label: 'Student Performance', description: 'Performance metrics' },
];

export const COURSE_REPORTS = [
    { report: 'all-courses', label: 'All Courses', description: 'Complete course catalog' },
];

export const PAYMENT_REPORTS = [
    { report: 'all-payments', label: 'All Payments', description: 'Payment transactions' },
    { report: 'payment-summary', label: 'Payment Summary', description: 'Payment statistics' },
];

export const DONATION_REPORTS = [
    { report: 'all-donations', label: 'All Donations', description: 'Donation records' },
];

export const LECTURE_REPORTS = [
    { report: 'all-lectures', label: 'All Lectures', description: 'Lecture library' },
];

export const TEST_REPORTS = [
    { report: 'all-tests', label: 'All Tests', description: 'Test database' },
    { report: 'all-questions', label: 'All Questions', description: 'Question bank' },
];

export const FACULTY_REPORTS = [
    { report: 'all-faculty', label: 'All Faculty', description: 'Faculty directory' },
];

export const CAREER_REPORTS = [
    { report: 'all-careers', label: 'All Careers', description: 'Job listings' },
    { report: 'career-applications', label: 'Applications', description: 'Job applications' },
];

export const ANALYTICS_REPORTS = [
    { report: 'platform-analytics', label: 'Platform Analytics', description: 'Overall platform stats' },
];

export const GST_FINANCE_REPORTS = [
    { report: 'gstr1', label: 'GSTR-1 Export', description: 'Details of outward supplies for GST filing' },
    { report: 'gstr3b', label: 'GSTR-3B Export', description: 'Summary of tax liability for monthly filing' },
    { report: 'gst-summary', label: 'GST Summary', description: 'Complete GST collection and payment summary' },
    { report: 'monthly-gst-sales', label: 'Monthly GST Sales', description: 'Invoice-level GST sales register' },
    { report: 'transaction-ledger', label: 'Transaction Ledger', description: 'Double-entry accounting ledger' },
    { report: 'profit-loss', label: 'Profit & Loss Statement', description: 'Income and expense breakdown' },
];

function SingleReportDropdown({ 
    report, 
    label, 
    month 
}: { 
    report: string; 
    label: string; 
    month: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
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
        setIsExporting(true);
        setIsOpen(false);
        
        try {
            const response = await fetch(
                `/api/admin/reports/export-all?report=${encodeURIComponent(report)}&format=${format}&month=${month}`,
                { credentials: 'include' }
            );
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const filename = `${label.replace(/\s+/g, '_')}_${month}.${format}`;
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting}
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 w-full"
            >
                <span className="flex items-center gap-2">
                    {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Download
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
                        const Icon = formatIcons[format];
                        return (
                            <button
                                key={format}
                                type="button"
                                onClick={() => handleExport(format)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                            >
                                <Icon className={`h-3 w-3 ${formatColors[format]}`} />
                                {formatLabels[format]}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export {
    ReportDropdown as AdminReportDropdown,
    ExportDropdownButton,
    SingleReportDropdown as ExportDropdown,
};

export default ReportDropdown;
