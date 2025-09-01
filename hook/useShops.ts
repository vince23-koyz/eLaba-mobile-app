// hooks/useShops.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Shop {
  shop_id: number;
  name: string;
  address?: string;
  website?: string;
  owner_name?: string;
  operation_hours?: string;
  admin_id?: number;
}

export default function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://10.0.2.2:5000/api/shop');
      setShops(response.data);
      setError(null);
    } catch (err: any) {
      console.log('Error fetching shops:', err.message);
      setError('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  return { shops, loading, error, refresh: fetchShops };
}
