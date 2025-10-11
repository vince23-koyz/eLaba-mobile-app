import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';

import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import PasswordRecovery from '../screens/Auth/PasswordRecovery';
import SignupScreen from '../screens/Auth/SignupScreen';
import ShopDetails from '../screens/ShopScreens/ShopDetails';
import BookingScreen from '../screens/ShopScreens/BookingScreen';
import ConfirmationScreen from '../screens/ShopScreens/ConfirmScreen';
import BottomTabs from './BottomTabs';
import MyProfile from '../screens/MyProfile';
import EditProfile from '../screens/EditProfile';
import TransactionHistory from '../screens/TransactionHistory';
import MessagingScreen from '../screens/Messaging/MessagingScreen';
import ConvoScreen from '../screens/Messaging/ConvoScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  PasswordRecovery: undefined;
  Signup: undefined;
  Home: undefined;
  Messaging: undefined;
  Convo: {
    shopName: string;
    shopId: string;
    receiverId: string;
    receiverType: 'customer' | 'admin';
    avatar: any;
    useCreativeIcon?: boolean;
  };
  ShopDetails: { shop_id: number };
  BookingService: { 
    type: 'Walk in' | 'Pick up'; 
    services: {
      service_id: number;
      offers: string;
      price: number;
      description?: string;
    }[];
    shop_id: number;
    shop_name: string;
  };
  Confirmation: { 
    booking_type: 'Walk in' | 'Pick up'; 
    selectedService: number; 
    serviceName: string;
    servicePrice: number;
    selectedDate: string; 
    payment: 'gcash' | 'cash' | 'cod';
    pickUpFee: number;
    total: number;
    shop_id: number;
    customer_id: number;
  };
  MyProfile: undefined;
  EditProfile: undefined; 
  Transaction: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      const customerName = await AsyncStorage.getItem('customerName');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      
      // Check if user data exists and isLoggedIn flag is true
      if (customerId && customerName && isLoggedIn === 'true') {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Error checking auth status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#96bcff' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#ffffff', marginTop: 10, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isLoggedIn ? "Home" : "Welcome"}>
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PasswordRecovery" 
          component={PasswordRecovery} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Signup" 
          component={SignupScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={BottomTabs} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Messaging" 
          component={MessagingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Convo" 
          component={ConvoScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ShopDetails"  
          component={ShopDetails} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BookingService"  
          component={BookingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Confirmation" 
          component={ConfirmationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MyProfile" 
          component={MyProfile} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfile} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Transaction"
          component={TransactionHistory}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
