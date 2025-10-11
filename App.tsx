import React from 'react';
import Navigator from './navigation/Navigator';
import { useNotifications } from './hook/useNotifications';

const App: React.FC = () => {

  useNotifications();
  return <Navigator />;
};

export default App;
