import React from 'react';
import Navigator from './navigation/Navigator';
import { useNotifications } from './hook/useNotifications';
import { useFCMNotificationNavigation } from './hook/useFCMNotificationNavigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from './context/AlertContext';

const App: React.FC = () => {
  useNotifications();
  useFCMNotificationNavigation();

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <Navigator />
      </AlertProvider>
    </SafeAreaProvider>
  );
};

export default App;
