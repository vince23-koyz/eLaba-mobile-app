import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { API_CONFIG } from '../config/api';

interface ShopCardProps {
  name: string;
  address?: string; 
  logo?: string; // Shop banner/logo
  status?: 'active' | 'inactive' | 'pending' | string; // backend status; pending will be filtered out upstream
  onPress: () => void;
}

const { width } = Dimensions.get('window');

export default function ShopCard({ name, address, logo, status, onPress }: ShopCardProps) {
  // Construct logo URL: if already absolute, use as-is; else prefix backend base
  const logoUrl = logo
    ? (logo.startsWith('http') ? logo : `${API_CONFIG.BASE_ORIGIN}${logo}`)
    : null;

  // Status indicator mapping
  const isActive = status === 'active' || !status; // default to active if not provided
  const indicatorBg = isActive ? 'rgba(76, 175, 80, 0.9)' : 'rgba(239, 68, 68, 0.9)';
  const indicatorText = isActive ? 'Open' : 'Closed';
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      glowAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isActive, glowAnim]);

  return (
    <TouchableOpacity 
      style={styles.shopCard} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      {/* Banner Section at the Top */}
      <View style={styles.bannerSection}>
        {logoUrl ? (
          <>
            <Image source={{ uri: logoUrl }} style={styles.bannerLogo} resizeMode="cover" />
            {/* Overlay gradient for better button visibility */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)']}
              style={styles.bannerOverlay}
              pointerEvents="none"
            />
          </>
        ) : (
          <LinearGradient
            colors={['#4A90E2', '#35b4bd', '#2E86AB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerPlaceholder}
          >
            <View style={styles.placeholderContent}>
              <View style={styles.creativeIconContainer}>
                {/* Laundry Machine Icon */}
                <View style={styles.washingMachine}>
                  <View style={styles.machineBody} />
                  <View style={styles.machineWindow} />
                  <View style={styles.machineControl1} />
                  <View style={styles.machineControl2} />
                </View>
                {/* Floating Bubbles */}
                <View style={styles.bubble1} />
                <View style={styles.bubble2} />
                <View style={styles.bubble3} />
              </View>
              <Text style={styles.bannerShopName} numberOfLines={2} ellipsizeMode="tail">
                {name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            {/* Decorative elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </LinearGradient>
        )}
        
        {/* Enhanced Book Button */}
        <TouchableOpacity style={styles.bookButton} onPress={onPress}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookButtonGradient}
          >
            <Text style={styles.bookButtonText}>Book</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Status indicator */}
        <Animated.View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: indicatorBg,
              borderColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.95)'],
              }),
              shadowColor: isActive ? '#ffffff' : '#000000',
              shadowOpacity: isActive ? glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.7],
              }) : 0.2,
              shadowRadius: isActive ? 6 : 4,
            },
          ]}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{indicatorText}</Text>
        </Animated.View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <View style={styles.shopInfo}>
          <View style={styles.shopNameContainer}>
            <Text style={styles.shopName} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
          </View>
          
          {address && (
            <View style={styles.addressContainer}>
              <View style={styles.locationIconContainer}>
                <Text style={styles.locationIcon}>📍</Text>
              </View>
              <Text style={styles.address}>
                {address}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Bottom accent line */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomAccent}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shopCard: {
    width: width * 0.90,
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  
  // Enhanced Banner Section Styles
  bannerSection: {
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerLogo: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  placeholderIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholderIcon: {
    fontSize: 28,
    opacity: 0.9,
  },
  // Creative Washing Machine Icon Styles
  creativeIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  washingMachine: {
    width: 40,
    height: 40,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineBody: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    position: 'absolute',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  machineWindow: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderRadius: 12,
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  machineControl1: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
    position: 'absolute',
    top: -12,
    left: -8,
  },
  machineControl2: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
    position: 'absolute',
    top: -12,
    right: -8,
  },
  bubble1: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
    position: 'absolute',
    top: -5,
    left: 15,
  },
  bubble2: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
    position: 'absolute',
    top: -15,
    right: 10,
  },
  bubble3: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    position: 'absolute',
    top: -8,
    right: 20,
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  bannerShopName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: 'System', // You can change this to a custom font
    lineHeight: 22,
    maxWidth: 200,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
  
  // Enhanced Book Button Styles
  bookButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 25,
    shadowColor: '#4facfe',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 3,
  },
  bookButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Status Indicator Styles
  statusIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 3,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 5,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Enhanced Content Section Styles
  contentSection: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  shopInfo: {
    alignItems: 'flex-start',
  },
  shopNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 19,
    color: '#1a1a1a',
    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  locationIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  locationIcon: {
    fontSize: 11,
  },
  address: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  
  // Info Row Styles
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 0.48,
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.2,
  },
  
  // Bottom Accent
  bottomAccent: {
    height: 4,
    backgroundColor: '#667eea',
  },
});
