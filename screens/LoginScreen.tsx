import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = () => navigation.navigate('Signup');
  const handleForgot = () => Alert.alert('Redirecting', 'Recovery Screen');

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'http://10.0.2.2:5000/api/customers/login',
        { phone_number: phoneNumber, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.success) {
        const { first_name, last_name } = response.data.customer;

        // Save first name and customer_id to AsyncStorage
        await AsyncStorage.setItem('customerId', response.data.customer.customer_id.toString());
        await AsyncStorage.setItem('customerName', first_name);
        await AsyncStorage.setItem('customerLastName', last_name);
        await AsyncStorage.setItem('customerUsername', response.data.customer.username);
        //token
        //await AsyncStorage.setItem('token', response.data.token);

        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        Alert.alert('Error', response.data?.message || 'Invalid credentials.');
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.elabaContainer}>
        <Text style={styles.appTitle}>eLABA: Laundry Booking Services</Text>
        <Image source={require('../assets/img/elaba.png')} style={styles.appIcon} />
        <Text style={styles.login}>Login</Text>
        <Text style={styles.portal}>Customer Portal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+63"
          placeholderTextColor="#3D3D3D"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#3D3D3D"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={handleForgot}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  elabaContainer: { alignItems: 'center', marginTop: 80, gap: 10 },
  appTitle: { fontSize: 16, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  appIcon: { width: 70, height: 70, resizeMode: 'center' },
  login: { fontSize: 24, fontWeight: '600' },
  portal: { fontSize: 16 },
  form: {
    width: '100%',
    backgroundColor: '#ffffff75',
    borderRadius: 35,
    padding: 25,
    marginTop: 40,
    alignItems: 'center',
  },
  label: { fontSize: 16, alignSelf: 'flex-start', marginTop: 12, marginBottom: 10 },
  input: {
    width: '100%',
    height: 47,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: '#89bfb8',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  forgotText: { alignSelf: 'flex-end', color: '#2b7ecb', marginBottom: 20 },
  loginButton: { width: '100%', backgroundColor: '#2b7ecb', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 20 },
  signupText: { color: '#333' },
  signupLink: { color: '#2b7ecb', fontWeight: 'bold' },
});
