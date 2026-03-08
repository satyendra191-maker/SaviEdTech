/**
 * Payment Components Export
 * 
 * Razorpay is the only supported payment gateway
 */

export {
    PaymentButton,
    RazorpayButton,
    type PaymentButtonProps,
    type PaymentGateway,
    type PaymentStatus,
} from './PaymentButton';

export {
    CoursePayment,
    type CourseData,
    type CoursePaymentProps,
} from './CoursePayment';

export { PurchaseCheckoutPanel } from './PurchaseCheckoutPanel';

export { ReceiptLookupCard } from './ReceiptLookupCard';
