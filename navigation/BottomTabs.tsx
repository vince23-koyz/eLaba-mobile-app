//BottomTabs.tsx
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Image, Text, StyleSheet, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from '../screens/HomeScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagingScreen from '../screens/Messaging/MessagingScreen';
import useNotificationCount from '../hook/useNotificationCount';
import useUnreadMessages from '../hook/useUnreadMessages';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { count } = useNotificationCount();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { unreadCount, refreshUnreadMessages } = useUnreadMessages(customerId || '', 'customer');

  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        setCustomerId(id || null);
      } catch (error) {
        console.log('Error loading customer id for tabs:', error);
      }
    };

    void loadCustomerId();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!customerId) return;
      void refreshUnreadMessages();
    }, [customerId, refreshUnreadMessages])
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [styles.tabBarStyle, { height: isTablet ? 92 : 80, left: Math.min(width * 0.06, 24), right: Math.min(width * 0.06, 24) }],
        tabBarIcon: ({ focused }) => {
          let iconPath;
          let label;

          if (route.name === 'HomeTab') {
            iconPath = require('../assets/img/icon/home-icon.png');
            label = 'Home';
          } else if (route.name === 'Notification') {
            iconPath = require('../assets/img/icon/bell-icon.png');
            label = 'Notifs';
          } else if (route.name === 'Messaging') {
            iconPath = require('../assets/img/icon/chat.png');
            label = 'Chats';
          } else if (route.name === 'Profile') {
            iconPath = require('../assets/img/icon/account-icon.png');
            label = 'Profile';
          }

          return (
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconWrapper,
                  focused && styles.iconFocusedShadow,
                ]}
              >
                <Image
                  source={iconPath}
                  style={[
                    styles.iconImage,
                    { tintColor: focused ? '#3ec6ff' : '#595959', width: isTablet ? 30 : 26, height: isTablet ? 30 : 26 },
                  ]}
                />
              </View>
              <Text style={[styles.iconLabel, focused && styles.iconLabelActive, isTablet && styles.iconLabelTablet]}>
                {label}
              </Text>

              {(route.name === 'Notification' && count > 0 || route.name === 'Messaging' && unreadCount > 0) && (
                <View style={styles.badgeBubble}>
                  <Text style={styles.badgeText}>{route.name === 'Notification' ? (count > 99 ? '99+' : count) : (unreadCount > 99 ? '99+' : unreadCount)}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="Messaging" component={MessagingScreen} />
      <Tab.Screen name="Notification" component={NotificationScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    height: 80,
    backgroundColor: '#ffffffea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 20
  },
  iconWrapper: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  iconFocusedShadow: {
    backgroundColor: '#e1f8ff',
  },
  iconImage: {
    width: 26,
    height: 26,
  },
  iconLabelTablet: {
    fontSize: 11,
  },
  iconLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#595959',
    fontWeight: '500',
    lineHeight: 14,
  },
  iconLabelActive: {
    color: '#3ec6ff',
    fontWeight: '700',
  },
  badgeBubble: {
    position: 'absolute',
    top: 2,
    right: -10,
    backgroundColor: '#FF3B30',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
