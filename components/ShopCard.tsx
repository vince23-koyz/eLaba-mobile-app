import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ShopCardProps {
  name: string;
  address?: string; 
  onPress: () => void;
}

const { width } = Dimensions.get('window');

export default function ShopCard({ name, address, onPress }: ShopCardProps) {
  return (
    <TouchableOpacity 
      style={styles.shopCard} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Shop Icon Container */}
        <View style={styles.iconContainer}>
          <View style={styles.shopIcon}>
            <Text style={styles.iconText}>🏪</Text>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.shopName} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            <View style={styles.addressContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.address} numberOfLines={2} ellipsizeMode="tail">
                {address || 'No address available'}
              </Text>
            </View>
          </View>

          {/* Action Indicator */}
          <View style={styles.actionContainer}>
            <View style={styles.chevronContainer}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shopCard: {
    width: width * 0.92,
    alignSelf: 'center',
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  iconContainer: {
    marginRight: 16,
  },
  shopIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  iconText: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: { 
    flex: 1,
    marginRight: 12,
  },
  shopName: { 
    fontSize: 18, 
    color: '#2c3e50', 
    fontFamily: 'GoogleSansCode-Medium',
    fontWeight: '700',
    marginBottom: 6,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 6,
    marginTop: 2,
  },
  address: { 
    fontSize: 14, 
    color: '#7f8c8d', 
    fontFamily: 'Montserrat-Medium',
    flex: 1,
    lineHeight: 18,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 20,
    color: '#667eea',
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(118, 75, 162, 0.05)',
  },
});
