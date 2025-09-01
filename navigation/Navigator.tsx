import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ShopDetails from '../screens/ShopScreens/ShopDetails';
import BookingScreen from '../screens/ShopScreens/BookingScreen';
import ConfirmationScreen from '../screens/ShopScreens/ConfirmScreen';
import BottomTabs from './BottomTabs';
import EditProfile from '../screens/EditProfile';
import TransactionHistory from '../screens/TransactionHistory';
import MessagingScreen from '../screens/Messaging/MessagingScreen';
import ConvoScreen from '../screens/Messaging/ConvoScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Messaging: undefined;
  Convo: undefined;
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
  EditProfile: undefined; 
  Transaction: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
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
