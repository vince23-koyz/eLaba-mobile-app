//HomeScreen.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
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
  ToastAndroid
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ShopCard from '../components/ShopCard';
import useShops from '../hook/useShops';


type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const lastBackPress = useRef(0);

  const { shops, loading, error, refresh } = useShops();

  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomerName = async () => {
      try {
        const name = await AsyncStorage.getItem('customerName');
        if (name) {
          setCustomerName(name);
        }
      } catch (e) {
        console.log("Error loading customer name:", e);
      }
    };

    loadCustomerName();
  }, []);

  const handleMessages = () => {
    navigation.navigate('Messaging');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  useEffect(() => {
    if (isFocused) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      onRefresh();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      if (firstLoad) {
        onRefresh();
        setFirstLoad(false);
      }
    }
  }, [isFocused, firstLoad]);

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
              <TouchableOpacity onPress={handleMessages} style={styles.messageContainer}>
                <Image source={require('../assets/img/icon/message.png')} style={styles.messageIcon} />
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
                { icon: require('../assets/img/wash.png'), label: 'Laundry' },
                { icon: require('../assets/img/iron.png'), label: 'Iron' },
              ].map((item, index) => (
                <TouchableOpacity key={index} activeOpacity={0.8}>
                  <View style={[styles.card, styles.cardElevated]}>
                    <Image source={item.icon} style={styles.cardImage} />
                    <Text style={styles.cardText}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

          </View>

          {/* SECTION LABEL */}
          <View style={styles.selectContainer}>
            <Text style={styles.selectText}>Select Laundry Shops</Text>
          </View>

          {/* SHOP CARDS */}
          {loading && <Text style={{ textAlign: 'center', marginTop: 10 }}>Loading shops...</Text>}
          {error && <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text>}
          {!loading && shops.length === 0 && (
            <Text style={{ textAlign: 'center', marginTop: 10 }}>No shops available.</Text>
          )}

          {shops.map((shop) => (
            <ShopCard
              key={shop.shop_id} 
              name={shop.name}
              address={shop.address}
              onPress={() => navigation.navigate('ShopDetails', { shop_id: shop.shop_id })}
            />
          ))}

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
  messageContainer: {
    backgroundColor: '#4ef3ff5f',
    width: 45,
    height: 45,
    borderRadius: 50,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageIcon: { width: 35, height: 35 },
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
  cardImage: { width: 50, height: 50, marginBottom: 6, resizeMode: 'contain' },
  cardText: { fontSize: 13, fontWeight: '600', color: '#2c3e50' },
  selectContainer: { alignItems: 'center', marginTop: 30 },
  selectText: { color: '#221f1f', fontSize: 18, fontWeight: '600' },
  fadeBottom: { height: 40, marginTop: -40, width: '100%' },
});
