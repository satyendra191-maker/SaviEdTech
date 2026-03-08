import crypto from 'node:crypto';

const DEFAULT_COURSE_GST_RATE = Number.parseFloat(
    process.env.SAVI_DEFAULT_COURSE_GST_RATE
        || process.env.DEFAULT_COURSE_GST_RATE
        || process.env.COURSE_GST_RATE
        || '18'
);

function numericHash(seed: string, length: number): string {
    const digest = crypto.createHash('sha256').update(seed).digest('hex');
    let digits = '';

    for (const char of digest) {
        if (/\d/.test(char)) {
            digits += char;
        } else {
            digits += String(char.charCodeAt(0) % 10);
        }
    }

    if (digits.length < length) {
        digits = `${digits}${Date.now()}`.replace(/\D/g, '');
    }

    return digits.slice(0, length).padStart(length, '0');
}

function formatDocumentDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${day}${month}${year}`;
}

export function buildCourseInvoiceNumber(value: string | Date, seed: string): string {
    return `SGICOURSE${formatDocumentDate(value)}${numericHash(seed, 10)}`;
}

export function buildDonationReceiptNumber(value: string | Date, seed: string): string {
    return `SGIDONATE${formatDocumentDate(value)}${numericHash(seed, 10)}`;
}

export function getDefaultCourseGstRate(): number {
    if (!Number.isFinite(DEFAULT_COURSE_GST_RATE) || DEFAULT_COURSE_GST_RATE < 0) {
        return 18;
    }

    return Number(DEFAULT_COURSE_GST_RATE.toFixed(2));
}

export function resolveGstRate(
    transactionType: 'donation' | 'course_purchase' | 'subscription',
    metadata?: Record<string, unknown> | null
): number {
    if (transactionType === 'donation') {
        return 0;
    }

    const rawRate = metadata?.gstRate;
    if (typeof rawRate === 'number' && Number.isFinite(rawRate) && rawRate >= 0) {
        return Number(rawRate.toFixed(2));
    }

    if (typeof rawRate === 'string') {
        const parsed = Number.parseFloat(rawRate);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return Number(parsed.toFixed(2));
        }
    }

    return getDefaultCourseGstRate();
}

export interface TaxBreakdown {
    taxableValue: number;
    gstAmount: number;
    totalAmount: number;
    gstRate: number;
}

export function calculateInclusiveTaxBreakdown(totalAmount: number, gstRate: number): TaxBreakdown {
    const normalizedTotal = Number(Number(totalAmount || 0).toFixed(2));
    const normalizedRate = Number(Number(gstRate || 0).toFixed(2));

    if (normalizedRate <= 0) {
        return {
            taxableValue: normalizedTotal,
            gstAmount: 0,
            totalAmount: normalizedTotal,
            gstRate: 0,
        };
    }

    const taxableValue = Number((normalizedTotal / (1 + normalizedRate / 100)).toFixed(2));
    const gstAmount = Number((normalizedTotal - taxableValue).toFixed(2));

    return {
        taxableValue,
        gstAmount,
        totalAmount: normalizedTotal,
        gstRate: normalizedRate,
    };
}

export function formatInr(value: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
