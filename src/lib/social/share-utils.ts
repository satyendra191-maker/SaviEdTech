/**
 * Social Share Utilities
 * Generate share URLs for various social media platforms
 */

export interface ShareData {
    title: string;
    description: string;
    url: string;
    hashtags?: string[];
}

export interface ChallengeShareData {
    rank: number;
    totalParticipants: number;
    challengeTitle: string;
    correctAnswer: boolean;
    points?: number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://saviedutech.com';

/**
 * Generate share message for daily challenge
 */
export function generateChallengeShareMessage(data: ChallengeShareData): string {
    const { rank, totalParticipants, challengeTitle, correctAnswer, points } = data;

    const emoji = correctAnswer ? '🎉' : '💪';
    const result = correctAnswer ? 'correctly answered' : 'attempted';
    const rankText = rank <= 10 ? `Rank #${rank}` : `Rank ${rank}`;

    let message = `${emoji} I just ${result} today's Daily National Challenge on SaviEdTech!\n\n`;
    message += `📚 ${challengeTitle}\n`;
    message += `🏆 ${rankText} out of ${totalParticipants.toLocaleString()} participants\n`;

    if (points && correctAnswer) {
        message += `⭐ Earned ${points} points\n`;
    }

    message += `\nCan you beat my rank? Try now! 👇`;

    return message;
}

/**
 * Generate WhatsApp share URL
 */
export function generateWhatsAppUrl(text: string): string {
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generate Twitter/X share URL
 */
export function generateTwitterUrl(text: string, hashtags: string[] = []): string {
    const encodedText = encodeURIComponent(text);
    const encodedHashtags = hashtags.length > 0 ? encodeURIComponent(hashtags.join(',')) : '';

    let url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    if (encodedHashtags) {
        url += `&hashtags=${encodedHashtags}`;
    }

    return url;
}

/**
 * Generate LinkedIn share URL
 */
export function generateLinkedInUrl(url: string, title: string, summary: string): string {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedSummary = encodeURIComponent(summary);

    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedSummary}`;
}

/**
 * Generate Facebook share URL
 */
export function generateFacebookUrl(url: string): string {
    const encodedUrl = encodeURIComponent(url);
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
}

/**
 * Generate Telegram share URL
 */
export function generateTelegramUrl(text: string, url: string): string {
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
}

/**
 * Generate all challenge share URLs
 */
export function generateChallengeShareUrls(data: ChallengeShareData): {
    whatsapp: string;
    twitter: string;
    linkedin: string;
    facebook: string;
    telegram: string;
    message: string;
} {
    const message = generateChallengeShareMessage(data);
    const challengeUrl = `${APP_URL}/dashboard/challenge`;
    const hashtags = ['SaviEdTech', 'DailyChallenge', 'JEEPreparation', 'NEETPreparation'];

    return {
        whatsapp: generateWhatsAppUrl(message + '\n\n' + challengeUrl),
        twitter: generateTwitterUrl(message + '\n\n' + challengeUrl, hashtags),
        linkedin: generateLinkedInUrl(
            challengeUrl,
            `Daily National Challenge - ${data.challengeTitle}`,
            message
        ),
        facebook: generateFacebookUrl(challengeUrl),
        telegram: generateTelegramUrl(message, challengeUrl),
        message,
    };
}
