import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';

export default function SignupScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
      const handleLogin = () => {
        navigation.navigate('Login')
      };

  const handleSubmit = () => {
    Alert.alert(
      'Account Created Successfully!!',
      'Continue to login?',
      [
        {
          text: 'Later',
          onPress: () => console.log('User chose to wait'),
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            console.log('Navigating to login...');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleConfirmCode = () => {
    console.log('Entered SMS Code:', smsCode);
    setModalVisible(false);
    // TODO: Validate or send code to server
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
        <Text style={styles.login}>Create an Account</Text>
        <Text style={styles.portal}>Customer Portal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#4d4d4dbd"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="4-6 characters"
          placeholderTextColor="#4d4d4dbd"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="No., St, Zone#, Baranggay, City"
          placeholderTextColor="#4d4d4dbd"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneRow}>
        <TextInput
            style={styles.phoneInput}
            placeholder="+63"
            placeholderTextColor="#4d4d4dbd"
            keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.verifyButtonInline} onPress={() => setModalVisible(true)}>
            <Text style={styles.verifyLink}>Verify</Text>
        </TouchableOpacity>
        </View>

        <Text style={styles.label}>Create Password</Text>
        <TextInput
          style={styles.input}
          placeholder="6-16 characters"
          placeholderTextColor="#4d4d4dbd"
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="6-16 characters"
          placeholderTextColor="#4d4d4dbd"
          secureTextEntry
        />

        <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have Account? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SMS Verification Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SMS Code</Text>
            <Text style={styles.modalSubtext}>
              Enter the code that we sent to +63*********
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter code"
              keyboardType="number-pad"
              value={smsCode}
              onChangeText={setSmsCode}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Resend Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCode}
                style={styles.modalConfirm}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  elabaContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  login: {
    fontSize: 24,
    fontWeight: '600',
  },
  portal: {
    fontSize: 16,
  },
  form: {
    width: '100%',
    backgroundColor: '#ffffff75',
    borderRadius: 35,
    padding: 25,
    marginTop: 15,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    alignSelf: 'flex-start',
    marginTop: 1,
    marginBottom: 3,
    left: 6,
  },
  input: {
    width: '100%',
    height: 43,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: '#89bfb8',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  phoneRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  marginBottom: 10,
},
phoneInput: {
  flex: 1,
  height: 43,
  backgroundColor: '#fffcf2',
  borderRadius: 12,
  borderWidth: 0.3,
  borderColor: '#89bfb8',
  paddingHorizontal: 15,
},
verifyButtonInline: {
  marginLeft: 10,
  paddingVertical: 10,
  paddingHorizontal: 15,
  backgroundColor: '#749abd',
  borderRadius: 10,
},
verifyLink: {
  color: '#fff',
  fontWeight: 'bold',
},

  submitButton: {
    width: '50%',
    backgroundColor: '#2b7ecb',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginText: {
    color: '#333',
  },
  loginLink: {
    color: '#2b7ecb',
    fontWeight: 'bold',
  },

  // Modal Styles
  modalWrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtext: {
    textAlign: 'center',
    color: '#555',
    marginTop: 8,
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ccc',
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#000',
  },
  modalConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2b7ecb',
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
