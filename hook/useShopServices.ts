import { useState, useEffect } from 'react';
import axios from 'axios';

interface Service {
  service_id: number;
  shop_id: number;
  offers: string;
  quantity: number;
  description?: string;
  price: number;
  package?: string;
  status?: string;
}

export default function useShopServices(shop_id: number) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    if (!shop_id) return;
    try {
      setLoading(true);
      const response = await axios.get(`http://10.0.2.2:5000/api/service/shop/${shop_id}`);
      setServices(response.data);
      setError(null);
    } catch (err: any) {
      console.log('Error fetching services:', err.message);
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [shop_id]);

  return { services, loading, error, refresh: fetchServices };
}
