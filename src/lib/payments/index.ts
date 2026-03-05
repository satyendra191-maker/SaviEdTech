/**
 * Payment Library
 * 
 * Unified payment gateway integration for SaviEduTech
 * Supports Razorpay (India)
 */

// Razorpay exports
export * as razorpay from './razorpay';

// Gateway type
export type PaymentGateway = 'razorpay';

// Helper function to check if Razorpay is configured
export async function getAvailableGateways(): Promise<{
    razorpay: boolean;
}> {
    const { isConfigured } = await import('./razorpay');
    
    return {
        razorpay: isConfigured(),
    };
}

// Helper to determine best gateway based on location
export function getRecommendedGateway(location: 'india' | 'international' = 'india'): PaymentGateway {
    return 'razorpay';
}
