import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../../config/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { useAlert } from '../../context/AlertContext';

export default function ChangePhoneNumber() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlert } = useAlert();
  const [currentPhone, setCurrentPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [newPhone, setNewPhone] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 8) return digits;
    const start = digits.slice(0, 4);
    const end = digits.slice(-4);
    return `${start} **** ${end}`;
  };

  const loadCurrentPhone = async () => {
    try {
      setLoading(true);
      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId) {
        showAlert('Error', 'Please login again.', undefined, 'warning');
        navigation.navigate('Login');
        return;
      }
  const res = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(customerId));
      if (res.data?.phone_number) {
        setCurrentPhone(res.data.phone_number);
      }
    } catch (e) {
      // fallback to storage
      const phone = await AsyncStorage.getItem('customerPhone');
      if (phone) setCurrentPhone(phone);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentPhone();
  }, []);

  const onSubmit = async () => {
    showAlert(
      'Phone Change Restricted',
      'For your security, changing your phone number requires verification. This flow will be enabled in a future update.',
      [{ text: 'OK', primary: true }],
      'info'
    );
  };

  return (
    <LinearGradient
      colors={['#91fff2', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Phone Number</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyValue}>{maskPhoneNumber(currentPhone)}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>New Phone Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="09xxxxxxxxx"
            placeholderTextColor="#9aa0a6"
            value={newPhone}
            onChangeText={setNewPhone}
          />

          <Text style={styles.note}>
            Your phone number is used for login and account recovery. We'll require an OTP verification to apply any changes.
          </Text>

          <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 28,
    height: 28,
    tintColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginRight: 28,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 8,
  },
  readonlyRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readonlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe4ea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  note: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
