import jsPDF from 'jspdf';

export const SAVI_BRAND = {
    title: 'SaviEduTech',
    tagline: 'JEE | NEET | Board Preparation',
    footerLineOne: 'Developed and Designed by SaviTech AI',
    footerLineTwo: '© 2026 SaviEduTech (A brand unit of SGI) — All Rights Reserved',
    watermarkLineOne: 'SaviEduTech',
    watermarkLineTwo: 'JEE | NEET | Board Preparation',
} as const;

interface HeaderOptions {
    title: string;
    subtitle?: string;
    accentRgb?: [number, number, number];
}

interface FooterOptions {
    generatedAt?: string;
    pageNumber?: number;
}

export function addSaviWatermark(doc: jsPDF): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text(SAVI_BRAND.watermarkLineOne, pageWidth / 2, pageHeight / 2 - 6, {
        align: 'center',
        angle: 32,
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(SAVI_BRAND.watermarkLineTwo, pageWidth / 2, pageHeight / 2 + 8, {
        align: 'center',
        angle: 32,
    });
}

export function addSaviHeader(doc: jsPDF, options: HeaderOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const accent = options.accentRgb || [15, 23, 42];

    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(SAVI_BRAND.title, 14, 11);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(SAVI_BRAND.tagline, 14, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(options.title, 14, 40);

    if (options.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const subtitleLines = doc.splitTextToSize(options.subtitle, pageWidth - 28);
        doc.text(subtitleLines, 14, 47);
    }
}

export function addSaviFooter(doc: jsPDF, options?: FooterOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerTop = pageHeight - 18;

    doc.setDrawColor(226, 232, 240);
    doc.line(14, footerTop, pageWidth - 14, footerTop);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(SAVI_BRAND.footerLineOne, 14, footerTop + 5);
    doc.text(SAVI_BRAND.footerLineTwo, 14, footerTop + 10);

    const rightSide: string[] = [];
    if (options?.generatedAt) {
        rightSide.push(`Generated: ${options.generatedAt}`);
    }
    if (typeof options?.pageNumber === 'number') {
        rightSide.push(`Page ${options.pageNumber}`);
    }
    if (rightSide.length > 0) {
        doc.text(rightSide.join(' | '), pageWidth - 14, footerTop + 10, { align: 'right' });
    }
}

