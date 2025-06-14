import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
// import LoginScreen from '../screens/LoginScreen'; // for later

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  // Add other screens here
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
        {/* Later:
        <Stack.Screen name="Login" component={LoginScreen} />
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
