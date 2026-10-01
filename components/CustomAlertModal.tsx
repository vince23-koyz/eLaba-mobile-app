import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, GestureResponderEvent, Platform } from 'react-native';
import Icons from './Icons';

export type AlertAction = {
  text: string;
  onPress?: (e?: GestureResponderEvent) => void;
  style?: 'default' | 'cancel' | 'destructive';
  primary?: boolean;
};

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

type Props = {
  visible: boolean;
  title?: string;
  message?: string | React.ReactNode;
  type?: AlertType;
  actions?: AlertAction[];
  onRequestClose?: () => void;
};

const typeStyles: Record<AlertType, { accent: string; tint: string }> = {
  info: { accent: '#2563eb', tint: '#e8f0fe' },
  success: { accent: '#16a34a', tint: '#ecfdf5' },
  warning: { accent: '#d97706', tint: '#fff7ed' },
  error: { accent: '#dc2626', tint: '#fef2f2' },
  confirm: { accent: '#4f46e5', tint: '#eef2ff' },
};

export default function CustomAlertModal({ visible, title, message, type = 'info', actions, onRequestClose }: Props) {
  const palette = typeStyles[type] || typeStyles.info;
  const finalActions: AlertAction[] = actions && actions.length > 0
    ? actions
    : [{ text: 'OK', primary: true }];

  const isTwo = finalActions.length === 2;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={type === 'success' || type === 'confirm' ? () => undefined : onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: palette.tint }]}>
            {renderTypeIcon(type, palette.accent)}
          </View>
          <Text style={styles.title} numberOfLines={2}> 
            {title || (type === 'confirm' ? 'Confirm' : 'Notice')}
          </Text>

          <View style={styles.body}>
            {typeof message === 'string' ? (
              <Text style={styles.message}>{message}</Text>
            ) : (
              message
            )}
          </View>

          <View style={[styles.actions, isTwo && styles.actionsTwo]}>
            {finalActions.map((action, idx) => {
              const variant = action.primary
                ? 'primary'
                : action.style === 'destructive'
                ? 'destructive'
                : action.style === 'cancel'
                ? 'ghost'
                : 'default';

              return (
                <Pressable
                  key={`${action.text}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={action.text}
                  onPress={action.onPress}
                  android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                  style={[
                    styles.button,
                    isTwo && styles.buttonTwo,
                    isTwo && action.primary && styles.buttonTwoPrimary,
                    isTwo && !action.primary && styles.buttonTwoSecondary,
                    getButtonStyle(variant),
                    variant === 'primary' && { backgroundColor: palette.accent, borderColor: palette.accent },
                  ]}
                >
                  <View style={styles.buttonInner}>
                    <Text style={[
                      styles.buttonText,
                      getButtonTextStyle(variant),
                    ]}>{action.text}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function renderTypeIcon(type: AlertType, color: string) {
  const size = 24;
  switch (type) {
    case 'success':
      return <Icons.Check size={size} color={color} />;
    case 'warning':
      return <Icons.Alert size={size} color={color} />;
    case 'error':
      return <Icons.Alert size={size} color={color} />;
    case 'confirm':
      return <Icons.Info size={size} color={color} />;
    default:
      return <Icons.Info size={size} color={color} />;
  }
}

function getButtonStyle(variant: 'primary' | 'destructive' | 'ghost' | 'default') {
  switch (variant) {
    case 'primary':
      return { backgroundColor: '#3b82f6', borderColor: '#3b82f6' };
    case 'destructive':
      return { backgroundColor: '#ef4444', borderColor: '#ef4444' };
    case 'ghost':
      return { backgroundColor: '#ffffff', borderColor: '#d1d5db' };
    default:
      return { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' };
  }
}

function getButtonTextStyle(variant: 'primary' | 'destructive' | 'ghost' | 'default') {
  switch (variant) {
    case 'primary':
    case 'destructive':
      return { color: '#ffffff' };
    case 'ghost':
      return { color: '#374151' };
    default:
      return { color: '#111827' };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } } }),
  },
  iconWrap: {
    alignSelf: 'center',
    marginTop: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 10,
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  message: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'column',
    padding: 12,
    gap: 8,
  },
  actionsTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    minHeight: 48,
    paddingVertical: 0,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  buttonTwo: {
    marginHorizontal: 0,
  },
  buttonTwoPrimary: {
    flex: 1.6,
  },
  buttonTwoSecondary: {
    flex: 1,
  },
  buttonInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 19,
    textAlign: 'center',
  },
});
