import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  customerId: string | null;
  customerName: string | null;
  customerLastName: string | null;
  customerUsername: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerStreet: string | null;
  customerZone: string | null;
  customerBarangay: string | null;
  customerCity: string | null;
}

export const useUserData = () => {
  const [userData, setUserData] = useState<UserData>({
    customerId: null,
    customerName: null,
    customerLastName: null,
    customerUsername: null,
    customerEmail: null,
    customerPhone: null,
    customerAddress: null,
    customerStreet: null,
    customerZone: null,
    customerBarangay: null,
    customerCity: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        const [
          customerId,
          customerName,
          customerLastName,
          customerUsername,
          customerEmail,
          customerPhone,
          customerAddress,
          customerStreet,
          customerZone,
          customerBarangay,
          customerCity,
        ] = await AsyncStorage.multiGet([
          'customerId',
          'customerName',
          'customerLastName',
          'customerUsername',
          'customerEmail',
          'customerPhone',
          'customerAddress',
          'customerStreet',
          'customerZone',
          'customerBarangay',
          'customerCity',
        ]);

        setUserData({
          customerId: customerId[1],
          customerName: customerName[1],
          customerLastName: customerLastName[1],
          customerUsername: customerUsername[1],
          customerEmail: customerEmail[1],
          customerPhone: customerPhone[1],
          customerAddress: customerAddress[1],
          customerStreet: customerStreet[1],
          customerZone: customerZone[1],
          customerBarangay: customerBarangay[1],
          customerCity: customerCity[1],
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const refreshUserData = async () => {
    setLoading(true);
    try {
      const [
        customerId,
        customerName,
        customerLastName,
        customerUsername,
        customerEmail,
        customerPhone,
        customerAddress,
        customerStreet,
        customerZone,
        customerBarangay,
        customerCity,
      ] = await AsyncStorage.multiGet([
        'customerId',
        'customerName',
        'customerLastName',
        'customerUsername',
        'customerEmail',
        'customerPhone',
        'customerAddress',
        'customerStreet',
        'customerZone',
        'customerBarangay',
        'customerCity',
      ]);

      setUserData({
        customerId: customerId[1],
        customerName: customerName[1],
        customerLastName: customerLastName[1],
        customerUsername: customerUsername[1],
        customerEmail: customerEmail[1],
        customerPhone: customerPhone[1],
        customerAddress: customerAddress[1],
        customerStreet: customerStreet[1],
        customerZone: customerZone[1],
        customerBarangay: customerBarangay[1],
        customerCity: customerCity[1],
      });
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return { userData, loading, refreshUserData };
};