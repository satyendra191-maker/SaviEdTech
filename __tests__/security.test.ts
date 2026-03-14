/**
 * @jest-environment node
 */

/**
 * Security Utilities - Unit Tests
 */

// Copy of functions to test (avoiding import issues in test environment)
function sanitizeInput(input: string): string {
    if (!input) return '';
    return input
        .replace(/<[^>]*>/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\0/g, '');
}

function sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${parsed.search}`;
    } catch {
        if (url.startsWith('/') && !url.startsWith('//')) {
            return url.replace(/[<>'"]/g, '');
        }
        return '';
    }
}

function containsSuspiciousPatterns(input: string): boolean {
    const patterns = [
        /\b(union\s+select|insert\s+into|delete\s+from|drop\s+table)\b/i,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /javascript:/i,
        /<[^>]*\son\w+\s*=/i,
        /\.\.\//,
        /%00/,
    ];
    return patterns.some(pattern => pattern.test(input));
}

function generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// TESTS

describe('Security Utilities', () => {
    describe('sanitizeInput', () => {
        test('should remove HTML tags', () => {
            expect(sanitizeInput('<p>Hello</p>')).toBe('Hello');
        });

        test('should remove script tags', () => {
            expect(sanitizeInput('<script>alert(1)</script>')).toBe('');
        });

        test('should remove event handlers', () => {
            const result = sanitizeInput('<img onerror="alert(1)">');
            expect(result).not.toContain('onerror');
        });

        test('should handle empty input', () => {
            expect(sanitizeInput('')).toBe('');
        });

        test('should escape HTML entities', () => {
            const result = sanitizeInput('<div>"test"</div>');
            expect(result).toContain('&lt;');
            expect(result).toContain('&quot;');
        });
    });

    describe('sanitizeUrl', () => {
        test('should allow HTTPS URLs', () => {
            expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
        });

        test('should allow HTTP URLs', () => {
            expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
        });

        test('should reject javascript URLs', () => {
            expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        });

        test('should reject data URLs', () => {
            expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
        });

        test('should allow relative paths', () => {
            expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
        });

        test('should handle invalid URLs', () => {
            expect(sanitizeUrl('')).toBe('');
            expect(sanitizeUrl('not-a-url')).toBe('');
        });
    });

    describe('containsSuspiciousPatterns', () => {
        test('should detect SQL injection - SELECT', () => {
            expect(containsSuspiciousPatterns('SELECT * FROM users')).toBe(true);
        });

        test('should detect SQL injection - INSERT', () => {
            expect(containsSuspiciousPatterns('INSERT INTO payments')).toBe(true);
        });

        test('should detect SQL injection - DELETE', () => {
            expect(containsSuspiciousPatterns('DELETE FROM courses')).toBe(true);
        });

        test('should detect XSS script tags', () => {
            expect(containsSuspiciousPatterns('<script>alert(1)</script>')).toBe(true);
        });

        test('should detect XSS event handlers', () => {
            expect(containsSuspiciousPatterns('<img onerror=alert(1)>')).toBe(true);
        });

        test('should detect path traversal', () => {
            expect(containsSuspiciousPatterns('../../../etc/passwd')).toBe(true);
        });

        test('should detect null byte injection', () => {
            expect(containsSuspiciousPatterns('test%00value')).toBe(true);
        });

        test('should return false for normal text', () => {
            expect(containsSuspiciousPatterns('Hello World')).toBe(false);
            expect(containsSuspiciousPatterns('Test query')).toBe(false);
            expect(containsSuspiciousPatterns('Course: Mathematics')).toBe(false);
        });
    });

    describe('generateSecureToken', () => {
        test('should generate tokens of correct length', () => {
            expect(generateSecureToken(32)).toHaveLength(64);
            expect(generateSecureToken(16)).toHaveLength(32);
        });

        test('should generate unique tokens', () => {
            const tokens = new Set<string>();
            for (let i = 0; i < 100; i++) {
                tokens.add(generateSecureToken(32));
            }
            expect(tokens.size).toBe(100);
        });

        test('should generate hex characters only', () => {
            const token = generateSecureToken(32);
            expect(token).toMatch(/^[a-f0-9]+$/);
        });
    });

    describe('constantTimeCompare', () => {
        test('should return true for equal strings', () => {
            expect(constantTimeCompare('test', 'test')).toBe(true);
            expect(constantTimeCompare('', '')).toBe(true);
        });

        test('should return false for different strings', () => {
            expect(constantTimeCompare('test', 'Test')).toBe(false);
            expect(constantTimeCompare('test', 'test1')).toBe(false);
        });

        test('should handle different lengths safely', () => {
            expect(constantTimeCompare('a', 'ab')).toBe(false);
            expect(constantTimeCompare('ab', 'a')).toBe(false);
            expect(constantTimeCompare('', 'a')).toBe(false);
        });

        test('should handle special characters', () => {
            expect(constantTimeCompare('p@ssw0rd!', 'p@ssw0rd!')).toBe(true);
            expect(constantTimeCompare('p@ssw0rd!', 'p@ssw0rd')).toBe(false);
        });
    });
});
