// hooks/useShops.ts
import { useState, useEffect } from 'react';
import { api } from '../config/api';
import { isShopVisibleToCustomers } from '../utils/shopAvailability';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

interface Shop {
  shop_id: number;
  name: string;
  address?: string;
  website?: string;
  owner_name?: string;
  operation_hours?: string;
  admin_id?: number;
  logo?: string;
  status?: string; // active shops are visible to customers
  pickup_delivery_enabled?: number | boolean | string;
}

export default function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shop');
      // Include approved shops even when staff have temporarily closed them.
      const filtered = Array.isArray(response.data)
        ? response.data.filter((s: Shop) => isShopVisibleToCustomers(s.status))
        : [];
      setShops(filtered);
      setError(null);
    } catch (err: any) {
      console.log('Error fetching shops:', err.message);
      setError(getApiErrorMessage(err, 'Failed to load shops.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  return { shops, loading, error, refresh: fetchShops };
}
