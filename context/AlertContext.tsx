import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import CustomAlertModal, { AlertAction, AlertType } from '../components/CustomAlertModal';

export type ShowAlert = (
  title: string,
  message: string,
  actions?: AlertAction[],
  type?: AlertType
) => void;

type AlertContextValue = {
  showAlert: ShowAlert;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<AlertType>('info');
  const [actions, setActions] = useState<AlertAction[] | undefined>(undefined);

  const showAlert: ShowAlert = useCallback((t, m, a, alertType = 'info') => {
    const wrapped = (a && a.length ? a : [{ text: 'OK', primary: true }]).map((act) => ({
      ...act,
      onPress: (e?: any) => {
        setVisible(false);
        setTimeout(() => act.onPress?.(e), 50);
      },
    }));
    setTitle(t);
    setMessage(m);
    setType(alertType);
    setActions(wrapped);
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlertModal
        visible={visible}
        title={title}
        message={message}
        type={type}
        actions={actions}
        onRequestClose={() => setVisible(false)}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within an AlertProvider');
  return ctx;
};
