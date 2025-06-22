import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Image, Text, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBarStyle,
        tabBarIcon: ({ focused }) => {
          let iconPath;
          let label;

          if (route.name === 'Home') {
            iconPath = require('../assets/img/icon/home-icon.png');
            label = 'Home';
          } else if (route.name === 'Notification') {
            iconPath = require('../assets/img/icon/bell-icon.png');
            label = 'Notification';
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
                    { tintColor: focused ? '#3ec6ff' : '#bbb' },
                  ]}
                />
              </View>
              <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>
                {label}
              </Text>

              {/* OPTIONAL BADGE for notifications */}
              {route.name === 'Notification' && (
                <View style={styles.badgeBubble}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
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
    backgroundColor: '#fff',
    borderRadius: 20,
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
  iconLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#999',
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
