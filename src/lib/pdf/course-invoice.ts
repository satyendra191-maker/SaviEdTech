import jsPDF from 'jspdf';
import { addSaviFooter, addSaviHeader, addSaviWatermark } from '@/lib/pdf/branding';

export interface CourseInvoicePdfData {
    invoiceNumber: string;
    invoiceDate: string;
    studentName: string;
    studentEmail?: string | null;
    courseTitle: string;
    courseId?: string | null;
    taxableValue: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    currency: string;
    transactionId?: string | null;
    orderId?: string | null;
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatMoney(value: number, currency: string): string {
    if (currency.toUpperCase() === 'INR') {
        return `INR ${value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }

    return `${currency.toUpperCase()} ${value.toFixed(2)}`;
}

export async function generateCourseInvoicePDF(data: CourseInvoicePdfData): Promise<Blob> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const legalName = process.env.SAVI_BUSINESS_NAME || 'SaviEduTech';
    const gstin = process.env.SAVI_GSTIN || 'Not Configured';
    const placeOfSupply = process.env.SAVI_PLACE_OF_SUPPLY || 'India';

    addSaviWatermark(doc);
    addSaviHeader(doc, {
        title: 'Tax Invoice',
        subtitle: `Issued by ${legalName}. Suitable for accounting and GST return preparation.`,
        accentRgb: [14, 116, 144],
    });

    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 56, 182, 54, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Invoice Details', 20, 66);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const leftColumn: Array<[string, string]> = [
        ['Invoice Number', data.invoiceNumber],
        ['Invoice Date', formatDate(data.invoiceDate)],
        ['Legal Entity', legalName],
        ['GSTIN', gstin],
        ['Place of Supply', placeOfSupply],
    ];

    const rightColumn: Array<[string, string]> = [
        ['Student Name', data.studentName],
        ['Student Email', data.studentEmail || 'Not provided'],
        ['Course / Plan', data.courseTitle],
        ['Course ID', data.courseId || 'Not available'],
        ['Transaction ID', data.transactionId || data.orderId || 'Not available'],
    ];

    let leftY = 74;
    for (const [label, value] of leftColumn) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 20, leftY);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 58, leftY);
        leftY += 8;
    }

    let rightY = 74;
    for (const [label, value] of rightColumn) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 108, rightY);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 146, rightY, { maxWidth: 42 });
        rightY += 8;
    }

    doc.roundedRect(14, 118, 182, 60, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Tax Computation', 20, 128);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(20, 136, 170, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.text('Particulars', 24, 142);
    doc.text('Amount', 182, 142, { align: 'right' });

    const rows: Array<[string, string]> = [
        ['Taxable Value', formatMoney(data.taxableValue, data.currency)],
        [`GST @ ${data.gstRate.toFixed(2)}%`, formatMoney(data.gstAmount, data.currency)],
        ['Total Payable Amount', formatMoney(data.totalAmount, data.currency)],
    ];

    let rowY = 154;
    rows.forEach(([label, value], index) => {
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20, rowY - 6, 170, 10, 2, 2, 'F');
        }
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(label, 24, rowY);
        doc.text(value, 182, rowY, { align: 'right' });
        rowY += 12;
    });

    doc.roundedRect(14, 186, 182, 72, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.text('Declaration', 20, 196);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const declarationLines = [
        '1. This invoice was generated for a SaviEduTech course or subscription purchase.',
        '2. Taxable value and GST amount are recorded for accounting and GST return preparation.',
        '3. Course prices are treated using the configured GST settings for the platform.',
        '4. Preserve this document for statutory records, audit, and reconciliation with Razorpay settlements.',
    ];

    let declarationY = 206;
    declarationLines.forEach((line) => {
        doc.text(line, 20, declarationY);
        declarationY += 10;
    });

    addSaviFooter(doc, {
        generatedAt: formatDate(new Date().toISOString()),
        pageNumber: 1,
    });

    return doc.output('blob');
}
