import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { addSaviFooter, addSaviHeader, addSaviWatermark } from '@/lib/pdf/branding';

export interface AdminReportMetric {
    label: string;
    value: string;
    helper?: string;
}

export interface AdminReportTable {
    title: string;
    columns: string[];
    rows: string[][];
}

export interface AdminReportChartPoint {
    label: string;
    value: number;
}

export interface AdminReportPayload {
    title: string;
    subtitle: string;
    generatedBy: string;
    metrics: AdminReportMetric[];
    charts?: Array<{
        title: string;
        points: AdminReportChartPoint[];
    }>;
    tables?: AdminReportTable[];
}

export async function generateAdminReportPDF(payload: AdminReportPayload): Promise<Blob> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    let pageNumber = 1;
    let currentY = 58;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const addPageBranding = () => {
        addSaviWatermark(doc);
        addSaviHeader(doc, {
            title: payload.title,
            subtitle: `${payload.subtitle} Generated for ${payload.generatedBy}.`,
            accentRgb: [30, 41, 59],
        });
        addSaviFooter(doc, {
            generatedAt: format(new Date(), 'dd MMM yyyy, hh:mm a'),
            pageNumber,
        });
    };

    const ensureSpace = (height: number) => {
        if (currentY + height > pageHeight - 28) {
            doc.addPage();
            pageNumber += 1;
            currentY = 58;
            addPageBranding();
        }
    };

    addPageBranding();

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Key Metrics', 14, currentY);
    currentY += 8;

    payload.metrics.forEach((metric, index) => {
        const cardX = 14 + (index % 2) * 92;
        const cardY = currentY + Math.floor(index / 2) * 24;
        ensureSpace(24);

        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, cardY, 84, 18, 3, 3, 'S');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(metric.label, cardX + 4, cardY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(metric.value, cardX + 4, cardY + 13);
        if (metric.helper) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(metric.helper, cardX + 4, cardY + 17);
        }
    });

    currentY += Math.ceil(payload.metrics.length / 2) * 24 + 4;

    for (const chart of payload.charts || []) {
        ensureSpace(58);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(chart.title, 14, currentY);
        currentY += 6;

        const maxValue = Math.max(...chart.points.map((point) => point.value), 1);
        chart.points.slice(0, 8).forEach((point, index) => {
            const rowY = currentY + index * 6;
            const barWidth = Math.max(6, (point.value / maxValue) * (pageWidth - 74));
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(point.label, 14, rowY + 3);
            doc.setFillColor(37, 99, 235);
            doc.roundedRect(52, rowY, barWidth, 4, 1, 1, 'F');
            doc.text(String(point.value), pageWidth - 16, rowY + 3, { align: 'right' });
        });

        currentY += Math.min(chart.points.length, 8) * 6 + 8;
    }

    for (const table of payload.tables || []) {
        ensureSpace(24);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(table.title, 14, currentY);
        currentY += 6;

        const colWidth = (pageWidth - 28) / table.columns.length;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, pageWidth - 28, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        table.columns.forEach((column, index) => {
            doc.text(column, 16 + index * colWidth, currentY + 4.5);
        });
        currentY += 9;

        table.rows.slice(0, 16).forEach((row, rowIndex) => {
            ensureSpace(8);
            if (rowIndex % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(14, currentY - 1.5, pageWidth - 28, 7, 'F');
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            row.forEach((value, index) => {
                const text = doc.splitTextToSize(value, colWidth - 4);
                doc.text(text[0] || '', 16 + index * colWidth, currentY + 3);
            });
            currentY += 7;
        });

        currentY += 6;
    }

    return doc.output('blob');
}
