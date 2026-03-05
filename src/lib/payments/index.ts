/**
 * Payment Library
 * 
 * Unified payment gateway integration for SaviEduTech
 * Supports Razorpay (India), Stripe (International), and PayPal
 */

// Razorpay exports
export * as razorpay from './razorpay';

// Stripe exports  
export * as stripe from './stripe';

// PayPal exports
export * as paypal from './paypal';

// Gateway type
export type PaymentGateway = 'razorpay' | 'stripe' | 'paypal';

// Helper function to get available gateways based on configuration
export async function getAvailableGateways(): Promise<{
    razorpay: boolean;
    stripe: boolean;
    paypal: boolean;
}> {
    const [{ isConfigured: razorpayConfigured }, { isConfigured: stripeConfigured }, { isConfigured: paypalConfigured }] =
        await Promise.all([
            import('./razorpay').then(m => ({ isConfigured: m.isConfigured() })),
            import('./stripe').then(m => ({ isConfigured: m.isConfigured() })),
            import('./paypal').then(m => ({ isConfigured: m.isConfigured() })),
        ]);

    return {
        razorpay: razorpayConfigured,
        stripe: stripeConfigured,
        paypal: paypalConfigured,
    };
}

// Helper to determine best gateway based on location/currency
export function getRecommendedGateway(location: 'india' | 'international' = 'india'): PaymentGateway {
    switch (location) {
        case 'india':
            return 'razorpay';
        case 'international':
            return 'stripe';
        default:
            return 'razorpay';
    }
}
