import { api, API_ENDPOINTS } from '../config/api';

export type DeliveryPayload = {
  pickup_address: string;
  delivery_address: string | null;
  delivery_time: string | null; // ISO string or null for pending pickups
  status: 'pending' | 'pickup_scheduled' | 'picked_up' | 'at_shop' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
  booking_id: number;
  customer_id: number;
  shop_id: number;
  service_id: number;
};

export async function createDelivery(payload: DeliveryPayload) {
  const res = await api.post(API_ENDPOINTS.DELIVERY.BASE, payload);
  return res.data;
}

export async function getDeliveries(params?: { shop_id?: number; customer_id?: number; booking_id?: number }) {
  const res = await api.get(API_ENDPOINTS.DELIVERY.BASE, { params });
  return res.data;
}

export async function updateDeliveryStatus(deliveryId: number, status: DeliveryPayload['status']) {
  const res = await api.patch(API_ENDPOINTS.DELIVERY.STATUS(deliveryId), { status });
  return res.data;
}
