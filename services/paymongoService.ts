// services/paymongoService.ts
// Hybrid PayMongo client: works with backend mock or real modes.
import { api, API_ENDPOINTS } from '../config/api';

// Types maintained for implementation
export interface GCashPaymentResponse {
  success: boolean;
  data: {
    paymentIntentId: string;
    paymongoPaymentId?: string | null;
    paymentMethodId: string;
    redirectUrl: string;
    clientKey: string;
    status: string;
  };
  message: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'succeeded' | 'processing' | 'requires_payment_method' | 'canceled';
  data: any;
}

class PayMongoService {
  async createGCashPayment(amount: number, description: string, customerInfo: { name: string; email: string; phone: string; }, bookingId?: number) {
    const payload = { amount, description, customerInfo, bookingId };
    const res = await api.post(API_ENDPOINTS.PAYMENTS.GCASH.CREATE, payload);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to create payment');
    return res.data.data;
  }

  async checkPaymentStatus(paymentIntentId: string) {
    const res = await api.get(API_ENDPOINTS.PAYMENTS.GCASH.STATUS(paymentIntentId));
    if (!res.data.success) throw new Error(res.data.message || 'Status check failed');
    return res.data.status as PaymentStatusResponse['status'];
  }

  async getPaymentStatusDetails(paymentIntentId: string) {
    const res = await api.get(API_ENDPOINTS.PAYMENTS.GCASH.STATUS(paymentIntentId));
    if (!res.data.success) throw new Error(res.data.message || 'Status check failed');
    const resource = res.data.data;
    const attributes = resource?.attributes || {};
    const payments = attributes.payments || resource?.payments || [];
    const payment = Array.isArray(payments) ? payments[0] : payments;
    return {
      status: res.data.status as PaymentStatusResponse['status'],
      paymongoPaymentId: res.data.paymongoPaymentId || payment?.id || payment?.data?.id ||
        (typeof attributes.payment_intent === 'string' ? null : attributes.payment_intent?.id || attributes.payment_intent?.data?.id) || null,
    };
  }

  async pollPaymentStatus(paymentIntentId: string, { intervalMs = 1500, timeoutMs = 20000 } = {}): Promise<'succeeded' | 'processing' | 'requires_payment_method' | 'canceled'> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const status = await this.checkPaymentStatus(paymentIntentId);
        if (status === 'succeeded' || status === 'canceled') return status;
      } catch (e) {
        // ignore transient errors
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return 'processing';
  }

  formatAmount(amount: number) {
    const amt = Number(amount);
    if (isNaN(amt)) return '₱0.00';
    const whole = Math.floor(amt);
    const cents = Math.round((amt - whole) * 100);
    return `₱${whole}.${cents.toString().padStart(2, '0')}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await api.get(API_ENDPOINTS.PAYMENTS.BASE);
      return Array.isArray(res.data);
    } catch {
      return false;
    }
  }

  async getMode(): Promise<{ mode: string; real: boolean; hasKeys: boolean }> {
    const res = await api.get(API_ENDPOINTS.PAYMENTS.MODE);
    if (!res.data.success) throw new Error('Unable to fetch payment mode');
    return { mode: res.data.mode, real: res.data.real, hasKeys: res.data.hasKeys };
  }
}

export default new PayMongoService();