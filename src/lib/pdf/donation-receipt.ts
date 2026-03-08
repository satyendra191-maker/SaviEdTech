import jsPDF from 'jspdf';
import { addSaviFooter, addSaviHeader, addSaviWatermark } from '@/lib/pdf/branding';

export interface DonationReceiptData {
    donorName: string;
    transactionId: string;
    amount: number;
    currency: string;
    receiptNumber: string;
    donationDate: string;
    donorEmail?: string | null;
    donorPhone?: string | null;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatCurrency(amount: number, currency: string): string {
    if (currency.toUpperCase() === 'INR') {
        return `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
}

export async function generateDonationReceiptPDF(data: DonationReceiptData): Promise<Blob> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    addSaviWatermark(doc);
    addSaviHeader(doc, {
        title: 'Donation Tax Receipt',
        subtitle: 'This receipt is generated for donation acknowledgment and tax documentation.',
        accentRgb: [15, 23, 42],
    });

    // Receipt details
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 56, 182, 78, 3, 3, 'S');

    const rows: Array<[string, string]> = [
        ['Receipt Number', data.receiptNumber],
        ['Donation Date', formatDate(data.donationDate)],
        ['Donor Name', data.donorName],
        ['Transaction ID', data.transactionId],
        ['Amount', formatCurrency(data.amount, data.currency)],
        ['Donor Email', data.donorEmail || 'Not provided'],
        ['Donor Phone', data.donorPhone || 'Not provided'],
    ];

    let y = 66;
    for (const [label, value] of rows) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${label}:`, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 62, y);
        y += 10;
    }

    // Declaration
    doc.roundedRect(14, 142, 182, 48, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Declaration', 20, 152);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('1. Received with thanks towards education support for vulnerable children.', 20, 161);
    doc.text('2. Donation is intended for educational and scholarship initiatives.', 20, 168);
    doc.text('3. This receipt may be used for tax filing under applicable rules.', 20, 175);
    doc.text('4. Keep this document for your records and compliance purposes.', 20, 182);

    addSaviFooter(doc, {
        generatedAt: formatDate(new Date().toISOString()),
        pageNumber: 1,
    });

    return doc.output('blob');
}
