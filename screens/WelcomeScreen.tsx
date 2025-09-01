import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';

const { height } = Dimensions.get('window');

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Logo animation
      Animated.parallel([
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Text slide up animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Button scale animation
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleGetStarted = () => {
    // Add button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Login');
    });
  };


  return (
    <LinearGradient
      colors={['#b2f7ef', '#a6c1ee']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#a6c1ee" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Decorative Elements */}
        <View style={styles.decorativeContainer}>
          <View style={[styles.decorativeCircle, styles.circle1]} />
          <View style={[styles.decorativeCircle, styles.circle2]} />
          <View style={[styles.decorativeCircle, styles.circle3]} />
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Logo Section */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: logoScaleAnim },
                  { 
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image source={require('../assets/img/elaba.png')} style={styles.image} />
              <View style={styles.logoShadow} />
            </View>
            
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              }}
            >
              <Text style={styles.welcome}>Welcome to eLaba</Text>
              <Text style={styles.subtitle}>Laundry Booking Services</Text>
            </Animated.View>
          </Animated.View>

          {/* Features Section */}
          <Animated.View 
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🚀</Text>
              </View>
              <Text style={styles.featureText}>Quick & Easy</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🛡️</Text>
              </View>
              <Text style={styles.featureText}>Safe & Secure</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>⭐</Text>
              </View>
              <Text style={styles.featureText}>Premium Quality</Text>
            </View>
          </Animated.View>
        </View>

        {/* Button Section */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              transform: [{ scale: buttonScaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>
            Join thousands of satisfied customers
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 120,
    height: 120,
    top: height * 0.3,
    left: -30,
  },
  circle3: {
    width: 80,
    height: 80,
    bottom: 100,
    right: 30,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoShadow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    top: 5,
    left: 5,
    zIndex: -1,
  },
  image: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    zIndex: 1,
  },
  welcome: {
    fontSize: 32,
    fontFamily: 'Caprasimo-Regular',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#34495e',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
  },
  buttonText: {
    color: '#2980b9',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(52, 73, 94, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WelcomeScreen;
