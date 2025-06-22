import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import WashingMachine from '../assets/img/elaba.png';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';



const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleGetStarted = () => {
    navigation.navigate('Login');
  };


  return (
    <LinearGradient
      colors={['#b2f7ef', '#a6c1ee']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#a6c1ee" />

      <View style={styles.logoContainer}>
        <Image source={WashingMachine} style={styles.image} />
        <Text style={styles.welcome}>Welcome to eLaba</Text>
        <Text style={styles.subtitle}>Laundry Booking Services</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
  },
  welcome: {
    fontSize: 35,
    fontFamily: 'Caprasimo-Regular',
    marginTop: 30,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#34495e',
    marginTop: 5,
  },
  image: {
    marginTop: 130,
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
    elevation: 4,
  },
  buttonText: {
    color: '#2980b9',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WelcomeScreen;
