//HomeScreen.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Platform,
  RefreshControl,
  BackHandler,
  ToastAndroid,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';


import ShopCard from '../components/ShopCard';
import useShops from '../hook/useShops';
import { api, API_ENDPOINTS, API_CONFIG } from '../config/api';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const lastBackPress = useRef(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  const { shops, loading, error, refresh } = useShops();
  // Randomize shops order for display
  const [randomizedShops, setRandomizedShops] = useState<typeof shops>([]);

  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerLastName, setCustomerLastName] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    const loadCustomerName = async () => {
      try {
        const name = await AsyncStorage.getItem('customerName');
        const lastName = await AsyncStorage.getItem('customerLastName');
        const id = await AsyncStorage.getItem('customerId');
        if (name) {
          setCustomerName(name);
        }
        if (lastName) {
          setCustomerLastName(lastName);
        }
        if (id) {
          setCustomerId(id);
        }

        if (id) {
          try {
            const response = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
            const picture = response.data?.profile_picture;
            if (picture) {
              setProfilePicture(picture);
              setImageKey(Date.now());
            }
          } catch (error) {
            console.log('Error loading customer profile image for home header:', error);
          }
        }
      } catch (e) {
        console.log('Error loading customer data:', e);
      }
    };

    loadCustomerName();
  }, []);

  const getInitials = (firstName: string | null, lastName: string | null): string => {
    if (!firstName && !lastName) return 'NN';

    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';

    if (firstInitial && lastInitial) {
      return firstInitial + lastInitial;
    }
    if (firstInitial) return firstInitial;
    if (lastInitial) return lastInitial;
    return 'NN';
  };

  const getProfileImageUrl = (): string | null => {
    if (!profilePicture) return null;
    try {
      const base = API_CONFIG.BASE_ORIGIN;
      const pic = String(profilePicture);
      if (pic.startsWith('http')) {
        return `${pic}${pic.includes('?') ? `&v=${imageKey}` : `?v=${imageKey}`}`;
      }
      if (pic.startsWith('/uploads')) {
        return `${base}${pic}?v=${imageKey}`;
      }
      return `${base}/uploads/profile/${pic}?v=${imageKey}`;
    } catch {
      return null;
    }
  };

  const handleProfile = () => {
    navigation.navigate('MyProfile');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isFocused) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      const syncHomeState = async () => {
        await onRefresh();

        if (firstLoad) {
          setFirstLoad(false);
        }
      };

      void syncHomeState();
    }
  }, [isFocused, firstLoad]);

  // Shuffle shops whenever shops data changes
  useEffect(() => {
    if (shops && shops.length > 0) {
      setRandomizedShops(shuffleArray(shops));
    } else {
      setRandomizedShops([]);
    }
  }, [shops]);

  useEffect(() => {
    shimmerAnim.setValue(0);
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

useEffect(() => {
  if (!isFocused) return; 

  const backAction = () => {

    const now = Date.now();
    if (now - lastBackPress.current < 2000) {
      BackHandler.exitApp();
      return true;
    } else {
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    }
  };

  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => backHandler.remove();
}, [isFocused]);

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3ec6ff']}
              tintColor="#3ec6ff"
            />
          }
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.leftContainer}>
                <Image source={require('../assets/img/elaba.png')} style={styles.appIcon} />
                <Text style={styles.headerTitle}>eLaba</Text>
              </View>
              <TouchableOpacity onPress={handleProfile} style={styles.profileAvatarButton}>
                {profilePicture ? (
                  <Image
                    key={`home-header-avatar-${profilePicture}-${imageKey}`}
                    source={{ uri: getProfileImageUrl() || undefined, cache: 'reload' as any }}
                    style={styles.profileAvatarImage}
                    resizeMode="cover"
                    onError={() => setProfilePicture(null)}
                  />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarText}>{getInitials(customerName, customerLastName)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.rectangleLine}>
              <Text style={styles.welcomeText}>
                {customerName
                  ? `Hello, ${customerName}`
                  : 'Hello, Guest'}
              </Text>
            </View>

            <Text style={styles.welcomeText}>
              Welcome! Find the best deals at your favorite laundry shops
            </Text>

            <View style={styles.cardContainer}>
              {[
                { icon: require('../assets/img/dry.png'), label: 'Dry Clean' },
                { icon: require('../assets/img/wash.png'), label: 'Wash' },
                { icon: require('../assets/img/iron.png'), label: 'Iron' },
              ].map((item, index) => (
                <View key={index} style={[styles.card, styles.cardStatic]} pointerEvents="none">
                  <Image source={item.icon} style={styles.cardImage} />
                  <Text style={styles.cardText}>{item.label}</Text>
                </View>
              ))}
            </View>

          </View>

          {/* SECTION LABEL */}
          <View style={styles.selectContainer}>
            <Text style={styles.selectText}>Select Laundry Shops</Text>
          </View>

          {/* SHOP CARDS */}
          {error && <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text>}

          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <View key={`shop-skeleton-${index}`} style={styles.shopSkeletonCard}>
                <View style={styles.shopSkeletonBanner}>
                  <Animated.View
                    style={[
                      styles.skeletonShimmer,
                      {
                        transform: [{ translateX: shimmerTranslate }],
                      },
                    ]}
                  />
                </View>
                <View style={styles.shopSkeletonContent}>
                  <View style={styles.shopSkeletonLineWide}>
                    <Animated.View
                      style={[
                        styles.skeletonShimmer,
                        {
                          transform: [{ translateX: shimmerTranslate }],
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.shopSkeletonLineShort}>
                    <Animated.View
                      style={[
                        styles.skeletonShimmer,
                        {
                          transform: [{ translateX: shimmerTranslate }],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))
          ) : shops.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 10 }}>No shops available.</Text>
          ) : (
            randomizedShops.map((shop) => (
              <ShopCard
                key={shop.shop_id}
                name={shop.name}
                address={shop.address}
                logo={shop.logo}
                status={shop.status as any}
                onPress={() => navigation.navigate('ShopDetails', { shop_id: shop.shop_id })}
              />
            ))
          )}

          {/* FADE EFFECT */}
          <LinearGradient
            colors={['transparent', 'rgba(150, 188, 255, 0.5)']}
            style={styles.fadeBottom}
            pointerEvents="none"
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Styles same lang as dati
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100 + (Platform.OS === 'ios' ? 20 : 10),
  },
  header: {
    width: '100%',
    backgroundColor: '#418AEC',
    borderBottomLeftRadius: 75,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#ffffff',
    borderBottomWidth: 0.4,
    paddingBottom: 10,
  },
  leftContainer: { flexDirection: 'row', alignItems: 'center' },
  appIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Caprasimo-Regular',
    color: '#FFFFFF',
  },
  profileAvatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#d9f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  profileAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  profileAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#8bd8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  rectangleLine: {
    backgroundColor: '#a5c4fa',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 15,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'RobotoMono-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 110,
    borderRadius: 12,
    marginHorizontal: 5,
    padding: 8,
  },
  cardElevated: {
    backgroundColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardStatic: {
    backgroundColor: '#ffffff',
    // Removed elevation/shadow to signal non-interactivity
  },
  cardImage: { width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' },
  cardText: { fontSize: 13, fontWeight: '600', color: '#2c3e50' },
  selectContainer: { alignItems: 'center', marginTop: 30 },
  selectText: { color: '#221f1f', fontSize: 18, fontWeight: '600' },
  shopSkeletonCard: {
    width: width * 0.90,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  shopSkeletonBanner: {
    width: '100%',
    height: 140,
    backgroundColor: '#e8e8ef',
  },
  shopSkeletonContent: {
    padding: 16,
  },
  shopSkeletonLineWide: {
    height: 14,
    width: '70%',
    backgroundColor: '#e8e8ef',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  shopSkeletonLineShort: {
    height: 12,
    width: '40%',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    left: -220,
    top: 0,
    bottom: 0,
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  fadeBottom: { height: 40, marginTop: -40, width: '100%' },
});
