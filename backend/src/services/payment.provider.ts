export interface PaymentInitRequest {
  userId: string;
  amount: number;
  paymentMethod: string;
  packageId?: string;
  referenceId?: string;
  type?: 'ACCESS_PACKAGE' | 'PRODUCT_ORDER' | 'RESEARCH_PURCHASE';
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  providerReference?: string;
}

/** Abstraction layer — swap providers (Paystack, Stripe, MTN MoMo) without changing business logic */
export interface PaymentProvider {
  readonly name: string;
  initiatePayment(request: PaymentInitRequest): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
}

/** Mock provider for development; replace in production */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async initiatePayment(request: PaymentInitRequest): Promise<PaymentResult> {
    const transactionId = `MOCK-${Date.now()}-${request.userId.slice(0, 6).toUpperCase()}`;
    return {
      transactionId,
      status: 'COMPLETED',
      providerReference: transactionId,
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    return { transactionId, status: 'COMPLETED' };
  }
}

let activeProvider: PaymentProvider = new MockPaymentProvider();

export function setPaymentProvider(provider: PaymentProvider): void {
  activeProvider = provider;
}

export function getPaymentProvider(): PaymentProvider {
  return activeProvider;
}
