import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import WashingMachine from '../assets/img/elaba.png';
import MessageIcon from '../assets/img/message_icon.png';
import DryCleanIcon from '../assets/img/dry.png';
import LaundryIcon from '../assets/img/wash.png';
import IronIcon from '../assets/img/iron.png';
import FavoriteIcon from '../assets/img/icon/favorite-icon.png';
import BhiveImage from '../assets/img/bhive.png';
import TayNicks from '../assets/img/taynicks.png';
import SitandSpin from '../assets/img/sitspin.png';
import WashnFold from '../assets/img/washnfold.png';
import Geofer from '../assets/img/geofer.png';

export default function HomeScreen() {
  const BookButton = () => {
    Alert.alert('Booking...', 'Navigating to Laundry Shop Details');
  };
  const HandleMessages = () => {
    Alert.alert('Messages', 'Navigating to Messaging Screen');
  };

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.leftContainer}>
                <Image source={WashingMachine} style={styles.appIcon} />
                <Text style={styles.headerTitle}>eLaba</Text>
              </View>
              <TouchableOpacity onPress={HandleMessages}>
                <Image source={MessageIcon} style={styles.messageIcon} />
              </TouchableOpacity>
            </View>

            <View style={styles.rectangleLine}></View>

            <Text style={styles.welcomeText}>
              Welcome! Find the best deals at your favorite laundry shops
            </Text>

            <View style={styles.cardContainer}>
              {[
                { icon: DryCleanIcon, label: 'Dry Clean' },
                { icon: LaundryIcon, label: 'Laundry' },
                { icon: IronIcon, label: 'Iron' },
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

          {/* SHOP CARD */}
          <View style={styles.shopCard}>
            <View style={styles.imageWrapper}>
              <Image source={BhiveImage} style={styles.shopImage} />
              <Image source={FavoriteIcon} style={styles.favoriteIcon} />
            </View>
            <View style={styles.footerContainer}>
              <Text style={styles.shopName}>B-Hive Laundry Shop</Text>
              <TouchableOpacity onPress={BookButton} style={styles.bookBtn}>
                <Text style={styles.textBtn}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shopCard}>
            <View style={styles.imageWrapper}>
              <Image source={TayNicks} style={styles.shopImage} />
              <Image source={FavoriteIcon} style={styles.favoriteIcon} />
            </View>
            <View style={styles.footerContainer}>
              <Text style={styles.shopName}>Tay Nick's Laundry Shop</Text>
              <TouchableOpacity onPress={BookButton} style={styles.bookBtn}>
                <Text style={styles.textBtn}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shopCard}>
            <View style={styles.imageWrapper}>
              <Image source={SitandSpin} style={styles.shopImage} />
              <Image source={FavoriteIcon} style={styles.favoriteIcon} />
            </View>
            <View style={styles.footerContainer}>
              <Text style={styles.shopName}>Sit and Spin Laundry Shop</Text>
              <TouchableOpacity onPress={BookButton} style={styles.bookBtn}>
                <Text style={styles.textBtn}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shopCard}>
            <View style={styles.imageWrapper}>
              <Image source={WashnFold} style={styles.shopImage} />
              <Image source={FavoriteIcon} style={styles.favoriteIcon} />
            </View>
            <View style={styles.footerContainer}>
              <Text style={styles.shopName}>Wash n Fold Laundry Shop</Text>
              <TouchableOpacity onPress={BookButton} style={styles.bookBtn}>
                <Text style={styles.textBtn}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shopCard}>
            <View style={styles.imageWrapper}>
              <Image source={Geofer} style={styles.shopImage} />
              <Image source={FavoriteIcon} style={styles.favoriteIcon} />
            </View>
            <View style={styles.footerContainer}>
              <Text style={styles.shopName}>Geofer Wash n Laundry Shop</Text>
              <TouchableOpacity onPress={BookButton} style={styles.bookBtn}>
                <Text style={styles.textBtn}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
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
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    resizeMode: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Caprasimo-Regular',
    color: '#FFFFFF',
  },
  messageIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
  },
  rectangleLine: {
    backgroundColor: '#B1D2FF',
    width: '100%',
    height: 50,
    marginTop: 15,
    borderRadius: 15,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'RobotoMono-Bold',
    color: '#FFFFFF',
    marginTop: 25,
    paddingHorizontal: 5,
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
  cardImage: {
    width: 50,
    height: 50,
    marginBottom: 6,
    resizeMode: 'contain',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
  },
  selectContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  selectText: {
    color: '#221f1f',
    fontSize: 18,
    fontWeight: '600',
  },
  shopCard: {
    backgroundColor: '#ffffff',
    width: '90%',
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  imageWrapper: {
    position: 'relative',
  },
  shopImage: {
    width: '100%',
    height: 170,
    resizeMode: 'cover',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 25,
    height: 25,
    zIndex: 2,
  },
  footerContainer: {
    height: 75,
    backgroundColor: '#f6f6f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  shopName: {
    fontSize: 16,
    color: '#333',
  },
  bookBtn: {
    backgroundColor: '#3ec6ff',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  textBtn: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
