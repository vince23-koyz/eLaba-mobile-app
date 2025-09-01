import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';

export default function SignupScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [street, setStreet] = useState('');
  const [zone, setZone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);


  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleConfirmCode = () => {
    if (smsCode === '1234') { // sample OTP
      setPhoneVerified(true);  // enable submit
      setModalVisible(false);
    } else {
      Alert.alert('Incorrect OTP. Try again.');
    }
  };

  const handleSubmit = async () => {
    if (!phoneVerified) {
      Alert.alert('Error', 'Please verify your phone number first.');
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter password and confirm it.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      const response = await axios.post('http://10.0.2.2:5000/api/customers', {
        first_name: firstName,
        last_name: lastName,
        username,
        street,
        zone,
        barangay,
        city,
        phone_number: phoneNumber,
        password
      });

      if (response.data && response.data.customer_id) {
        Alert.alert('Success', 'Account created successfully! Please login.');

        // Redirect to Login after signup
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Error', response.data.message || 'Signup failed.');
      }
    } catch (error: any) {
      console.log('Signup Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to create account. Try again.');
    }
  };
  return (
    <LinearGradient colors={['#a2fff4', '#96bcff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.elabaContainer}>
              <Text style={styles.appTitle}>eLABA: Laundry Booking Services</Text>
              <Text style={styles.login}>Create an Account</Text>
              <Text style={styles.portal}>Customer Portal</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.halfInputWrapper}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="#4d4d4dbd"
                  />
                </View>

                <View style={styles.halfInputWrapper}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="#4d4d4dbd"
                  />
                </View>
              </View>
              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="4-6 characters" value={username} onChangeText={setUsername} placeholderTextColor="#4d4d4dbd" />

              <Text style={styles.label}>Address</Text>
              <View style={styles.row}>
                <View style={styles.halfInputWrapper}>
                  <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} placeholderTextColor="#4d4d4dbd" />
                </View>
                <View style={styles.halfInputWrapper}>
                  <TextInput style={styles.input} placeholder="Zone" value={zone} onChangeText={setZone} placeholderTextColor="#4d4d4dbd" />
                </View>
              </View>
              <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} placeholderTextColor="#4d4d4dbd" />
              <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} placeholderTextColor="#4d4d4dbd" />

              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="+63"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholderTextColor="#4d4d4dbd"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.verifyButtonInline} onPress={() => setModalVisible(true)}>
                  <Text style={styles.verifyLink}>Verify</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!passwordVisible}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#aaa"
                />
                {/* 👁 One toggle for both */}
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Image
                    source={
                      passwordVisible
                        ? require('../assets/img/icon/visibility.png')
                        : require('../assets/img/icon/visibility-off.png')
                    }
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!passwordVisible}   // 🔑 same visibility state
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#aaa"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!phoneVerified}
                style={[styles.submitButton, { backgroundColor: phoneVerified ? '#2b7ecb' : '#888' }]}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                <Text style={{ color: '#444', fontSize: 14 }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{ color: '#2b7ecb', fontWeight: '600', fontSize: 14 }}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* SMS Verification Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalWrapper}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>SMS Code</Text>
                <Text style={styles.modalSubtext}>Enter the code sent to +63*********</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter code"
                  keyboardType="number-pad"
                  value={smsCode}
                  onChangeText={setSmsCode}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCancel}>
                    <Text style={styles.modalCancelText}>Resend Code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirmCode} style={styles.modalConfirm}>
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 40 },
  elabaContainer: { alignItems: 'center', marginTop: 50, gap: 8 },
  appTitle: { fontSize: 16, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  login: { fontSize: 24, fontWeight: '600', marginTop: 4 },
  portal: { fontSize: 16, marginBottom: 20 },
  form: {
    width: '100%',
    backgroundColor: '#ffffff90',
    borderRadius: 25,
    padding: 20,
    marginTop: 10,
  },
  label: { fontSize: 14, marginBottom: 10, marginTop: 16 },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 1,
  },
  input: {
    width: '100%',
    height: 42,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#89bfb8',
    paddingHorizontal: 14,
    paddingRight: 40, 
    marginBottom: 10,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeIcon: { width: 22, height: 22, tintColor: '#444' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfInputWrapper: { flex: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
  phoneInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#89bfb8',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  verifyButtonInline: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#749abd',
    borderRadius: 10,
  },
  verifyLink: { color: '#fff', fontWeight: '600' },
  submitButton: {
    width: '60%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalWrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 22, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSubtext: { textAlign: 'center', color: '#555', marginTop: 8, marginBottom: 16 },
  modalInput: {
    width: '100%',
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#ccc', borderRadius: 12 },
  modalCancelText: { color: '#000', fontWeight: '500' },
  modalConfirm: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#2b7ecb', borderRadius: 12 },
  modalConfirmText: { color: '#fff', fontWeight: '600' },
});
