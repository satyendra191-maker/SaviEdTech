import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatTimeRemaining(seconds: number): string {
    if (seconds < 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
}

export function formatTimeAgo(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

export function formatUpcomingDate(dateString: string | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
}

export function calculatePercentile(rank: number, total: number): number {
    if (total === 0) return 0;
    return Math.round(((total - rank + 1) / total) * 100);
}

export function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
        case 'easy':
            return 'text-green-500 bg-green-50';
        case 'medium':
            return 'text-amber-500 bg-amber-50';
        case 'hard':
            return 'text-red-500 bg-red-50';
        default:
            return 'text-gray-500 bg-gray-50';
    }
}

export function getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
        case 'easy':
            return 'Easy';
        case 'medium':
            return 'Medium';
        case 'hard':
            return 'Hard';
        default:
            return difficulty;
    }
}

export function getSubjectColor(subject: string): string {
    switch (subject.toLowerCase()) {
        case 'physics':
            return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'chemistry':
            return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        case 'mathematics':
        case 'maths':
            return 'text-amber-600 bg-amber-50 border-amber-200';
        case 'biology':
            return 'text-red-600 bg-red-50 border-red-200';
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200';
    }
}

export function getFacultyColor(facultyCode: string): string {
    switch (facultyCode) {
        case 'dharmendra':
            return 'from-blue-500 to-blue-600';
        case 'harendra':
            return 'from-emerald-500 to-emerald-600';
        case 'ravindra':
            return 'from-amber-500 to-amber-600';
        case 'arvind':
            return 'from-red-500 to-red-600';
        default:
            return 'from-primary-500 to-primary-600';
    }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function sanitizeHtml(html: string): string {
    return html
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers
                .map((header) => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    const stringValue = String(value);
                    if (stringValue.includes(',') || stringValue.includes('"')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                })
                .join(',')
        ),
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

export function calculateStreak(days: { date: string; active: boolean }[]): number {
    if (days.length === 0) return 0;

    const sortedDays = [...days].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const day of sortedDays) {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === streak && day.active) {
            streak++;
        } else if (diffDays > streak) {
            break;
        }
    }

    return streak;
}

export function predictRank(
    testScores: number[],
    accuracy: number,
    avgSolveTime: number
): { rank: number; percentile: number; readiness: number } {
    if (testScores.length === 0) {
        return { rank: 0, percentile: 0, readiness: 0 };
    }

    const avgScore = testScores.reduce((a, b) => a + b, 0) / testScores.length;
    const maxPossibleScore = 300; // JEE Main max score
    const scorePercent = (avgScore / maxPossibleScore) * 100;

    // Simple prediction algorithm (can be enhanced with ML)
    let baseRank = Math.round(100000 * Math.exp(-0.05 * scorePercent));

    // Adjust for accuracy
    if (accuracy > 90) baseRank = Math.round(baseRank * 0.7);
    else if (accuracy > 80) baseRank = Math.round(baseRank * 0.85);
    else if (accuracy < 50) baseRank = Math.round(baseRank * 1.3);

    // Adjust for solve time (optimal is 2-3 min per question)
    if (avgSolveTime < 1.5) baseRank = Math.round(baseRank * 0.9); // Fast but may be rushing
    else if (avgSolveTime > 4) baseRank = Math.round(baseRank * 1.1); // Too slow

    const totalStudents = 1000000; // Approximate JEE candidates
    const percentile = Math.max(0, Math.min(100, 100 - (baseRank / totalStudents) * 100));
    const readiness = Math.round((scorePercent * 0.4 + accuracy * 0.4 + Math.min(100, (3 / avgSolveTime) * 100) * 0.2));

    return {
        rank: Math.max(1, baseRank),
        percentile: Math.round(percentile * 100) / 100,
        readiness: Math.min(100, readiness),
    };
}