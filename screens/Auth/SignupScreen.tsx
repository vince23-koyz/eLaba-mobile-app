import React, { useEffect, useRef, useState } from 'react';
import {
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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { AuthService } from '../../services/authService';
import { useAlert } from '../../context/AlertContext';

export default function SignupScreen() {
  const { showAlert } = useAlert();
  const toTitleCase = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  // Flow: details -> otp -> password
  const [step, setStep] = useState<'details' | 'otp' | 'password'>('details');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const otpClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
  
  const formatPhoneForDisplay = (raw: string) => {
    // Normalize common PH formats to +63 9XXXXXXXXX for display only
    const digits = (raw || '').replace(/[^0-9+]/g, '');
    let normalized = digits;
    if (/^09\d{9}$/.test(digits)) {
      normalized = `+63${digits.slice(1)}`;
    } else if (/^63\d{10}$/.test(digits)) {
      normalized = `+${digits}`;
    } else if (/^\+63\d{10}$/.test(digits)) {
      normalized = digits;
    }
    // insert a space after +63 for readability
    return normalized.replace(/^\+63/, '+63 ');
  };
  
  const composeDetailsSummary = () => {
    const name = `${toTitleCase(firstName)} ${toTitleCase(lastName)}`.trim();
    const addrParts = [street, zone, barangay, city].filter(Boolean).map(toTitleCase);
    const addr = addrParts.join(', ');
    const prettyPhone = formatPhoneForDisplay(phoneNumber);
    return (
      `Please confirm your details:\n\n` +
      `Name: ${name || '—'}\n` +
      `Username: ${username || '—'}\n` +
      `Address: ${addr || '—'}\n` +
      `Phone: ${prettyPhone || '—'}\n\n` +
      `We will send an OTP to this phone. This number will also be used as your login.`
    );
  };
  
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (otpClearTimerRef.current) {
        clearTimeout(otpClearTimerRef.current);
      }
    };
  }, []);

  const validateDetails = () => {
    if (!firstName || !lastName || !username || !city || !phoneNumber) {
      showAlert('Missing info', 'Please fill out required fields including phone number.', undefined, 'warning');
      return false;
    }
    if (username.length < 4 || username.length > 16) {
      showAlert('Invalid username', 'Username should be 4-16 characters.', undefined, 'warning');
      return false;
    }
    // Philippine mobile number validation: +63, valid prefix, 10 digits
    // Valid mobile prefixes: 9xx, 8xx, 7xx
    // Accepts: 09123456789, 639123456789, +639123456789
    const phMobileRegex = /^(?:\+63|63|0)9\d{9}$/;
    if (!phMobileRegex.test(phoneNumber)) {
      showAlert('Invalid phone number', 'Enter a valid Philippine mobile number (e.g. +639XXXXXXXXX).', undefined, 'warning');
      return false;
    }
    return true;
  };

  const showExistingPhoneAlert = (message?: string) => {
    if (message?.toLowerCase().includes('phone number already registered')) {
      showAlert(
        'Phone Number Unavailable',
        'This phone number is already linked to an existing eLaba account. Please use a different number or log in to your account.',
        undefined,
        'warning'
      );
      return true;
    }
    return false;
  };

  const showInvalidOtpError = () => {
    setOtpError('The code is incorrect or expired. Please try again or request a new code.');
    otpRefs.current[0]?.focus();
    if (otpClearTimerRef.current) {
      clearTimeout(otpClearTimerRef.current);
    }
    otpClearTimerRef.current = setTimeout(() => {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      otpClearTimerRef.current = null;
    }, 2000);
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    if (otpError) setOtpError('');
    if (otpClearTimerRef.current) {
      clearTimeout(otpClearTimerRef.current);
      otpClearTimerRef.current = null;
    }

    const digits = value.slice(0, 6).split('');
    const nextOtp = [...otp];

    if (digits.length > 1) {
      digits.forEach((digit, offset) => {
        if (index + offset < nextOtp.length) {
          nextOtp[index + offset] = digit;
        }
      });
      setOtp(nextOtp);
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    nextOtp[index] = value;
    setOtp(nextOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const onPrimaryAction = async () => {
    try {
      if (step === 'details') {
        if (!validateDetails()) return;
        // Ask user to confirm phone number before sending OTP
        const summary = composeDetailsSummary();
        showAlert(
          'Confirm your details',
          summary,
          [
            { text: 'Edit', style: 'cancel' },
            {
              text: 'Confirm & send code',
              primary: true,
              onPress: async () => {
                setLoading(true);
                try {
                  const res = await AuthService.requestOtp(phoneNumber);
                  if (res?.success) {
                    showAlert('OTP sent', 'We sent a verification code to your phone.', undefined, 'success');
                    setStep('otp');
                    setResendCooldown(60);
                  } else {
                    if (!showExistingPhoneAlert(res?.message)) {
                      showAlert('Error', res?.message || 'Failed to send OTP.', undefined, 'error');
                    }
                  }
                } catch (err: any) {
                  console.log('Request OTP Error:', err?.response?.data || err?.message || err);
                  const message = err?.response?.data?.message;
                  if (!showExistingPhoneAlert(message)) {
                    showAlert('Error', 'Failed to send OTP. Please try again.', undefined, 'error');
                  }
                } finally {
                  setLoading(false);
                }
              },
            },
          ],
          'confirm'
        );
      } else if (step === 'otp') {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
          setOtpError('Please enter all 6 digits of the verification code.');
          return;
        }
        setLoading(true);
        const res = await AuthService.verifyOtp(phoneNumber, otpCode);
        if (res?.success) {
          setStep('password');
          setPassword('');
          setConfirmPassword('');
          setPasswordVisible(false);
        } else {
          showInvalidOtpError();
        }
      } else if (step === 'password') {
        if (!password || !confirmPassword) {
          showAlert('Error', 'Please enter password and confirm it.', undefined, 'warning');
          return;
        }
        if (password.length < 6) {
          showAlert('Error', 'Password must be at least 6 characters.', undefined, 'warning');
          return;
        }
        if (password !== confirmPassword) {
          showAlert('Error', 'Passwords do not match.', undefined, 'warning');
          return;
        }
        setLoading(true);
        const response = await AuthService.registerCustomer({
          first_name: toTitleCase(firstName),
          last_name: toTitleCase(lastName),
          username, // do not auto-capitalize
          street: toTitleCase(street),
          zone: toTitleCase(zone),
          barangay: toTitleCase(barangay),
          city: toTitleCase(city),
          phone_number: phoneNumber,
          password,
        });
        if (response && (response.customer_id || response.success)) {
          showAlert('Success', 'Account created successfully! Please login.', undefined, 'success');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else {
          if (!showExistingPhoneAlert(response?.message)) {
            showAlert('Error', response?.message || 'Signup failed.', undefined, 'error');
          }
        }
      }
    } catch (error: any) {
      console.log('Signup/OTP Error:', error.response?.data || error.message || error);
      const message = error.response?.data?.message;
      if (step === 'otp') {
        showInvalidOtpError();
      } else if (!showExistingPhoneAlert(message)) {
        showAlert('Error', message || 'Request failed. Try again.', undefined, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (resendCooldown > 0) return;
      setLoading(true);
      const res = await AuthService.requestOtp(phoneNumber);
      if (res?.success) {
        showAlert('OTP resent', 'Please check your phone for the new code.', undefined, 'success');
        setResendCooldown(60);
      } else {
        showAlert('Error', res?.message || 'Failed to resend OTP.', undefined, 'error');
      }
    } catch (error: any) {
      console.log('Resend OTP Error:', error.response?.data || error.message || error);
      showAlert('Error', 'Could not resend OTP.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => {
    return null;
  };

  const StepList = () => {
    // Horizontal stepper: _ _ _ (no circles)
    const steps: Array<'details' | 'otp' | 'password'> = ['details', 'otp', 'password'];
    const currentIdx = steps.findIndex(s => s === step);
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
        {steps.map((s, idx) => (
          <Text
            key={s}
            style={{
              fontSize: 32,
              color: idx === currentIdx ? '#2b7ecb' : '#89bfb8',
              fontWeight: idx === currentIdx ? 'bold' : 'normal',
              marginHorizontal: 8,
            }}
          >
            _
          </Text>
        ))}
      </View>
    );
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
              <StepList />

              {step === 'details' && (
                <View>
                  <View style={styles.row}>
                    <View style={styles.halfInputWrapper}>
                      <Text style={styles.labelFirst}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="First name"
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholderTextColor="#4d4d4dbd"
                      autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.halfInputWrapper}>
                      <Text style={styles.labelFirst}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Last name"
                        value={lastName}
                        onChangeText={setLastName}
                        placeholderTextColor="#4d4d4dbd"
                      autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <Text style={styles.labelCompact}>Username</Text>
                  <TextInput style={styles.input} placeholder="4-16 characters" value={username} onChangeText={setUsername} placeholderTextColor="#4d4d4dbd" autoCapitalize="none" autoCorrect={false} />

                  <Text style={styles.labelRegular}>Address</Text>
                  <View style={styles.row}>
                    <View style={styles.halfInputWrapper}>
                      <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} placeholderTextColor="#4d4d4dbd" autoCapitalize="words" />
                    </View>
                    <View style={styles.halfInputWrapper}>
                      <TextInput style={styles.input} placeholder="Zone" value={zone} onChangeText={setZone} placeholderTextColor="#4d4d4dbd" autoCapitalize="words" />
                    </View>
                  </View>
                  <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} placeholderTextColor="#4d4d4dbd" autoCapitalize="words" />
                  <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} placeholderTextColor="#4d4d4dbd" autoCapitalize="words" />

                  <Text style={styles.labelRegular}>Phone Number</Text>
                  <View style={styles.phoneRow}>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="e.g. +63XXXXXXXXXX"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholderTextColor="#4d4d4dbd"
                      keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    />
                  </View>
                  <Text style={styles.phoneNote}>
                    Note: This phone number will be used as your login. Make sure it’s correct.
                  </Text>
                </View>
              )}

              {step === 'otp' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.labelRegular}>Enter OTP</Text>
                  <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          otpRefs.current[index] = ref;
                        }}
                        style={[styles.otpBox, otpError ? styles.otpBoxError : null]}
                        placeholder="-"
                        placeholderTextColor="#ccc"
                        keyboardType="number-pad"
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(event) => handleOtpKeyPress(event, index)}
                        maxLength={1}
                        textAlign="center"
                        editable={!loading}
                      />
                    ))}
                  </View>
                  {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <TouchableOpacity onPress={handleResend} disabled={loading || resendCooldown > 0}>
                      <Text style={{ color: loading || resendCooldown > 0 ? '#999' : '#2b7ecb', fontWeight: '600' }}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep('details')} disabled={loading}>
                      <Text style={{ color: '#444' }}>Change number</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'password' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.labelCompact}>Password</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!passwordVisible}
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      placeholderTextColor="#aaa"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setPasswordVisible(!passwordVisible)}>
                      <Image
                        source={
                          passwordVisible
                            ? require('../../assets/img/icon/visibility.png')
                            : require('../../assets/img/icon/visibility-off.png')
                        }
                        style={styles.eyeIcon}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.labelCompact}>Confirm Password</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!passwordVisible}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor="#aaa"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setPasswordVisible(!passwordVisible)}>
                      <Image
                        source={
                          passwordVisible
                            ? require('../../assets/img/icon/visibility.png')
                            : require('../../assets/img/icon/visibility-off.png')
                        }
                        style={styles.eyeIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity onPress={onPrimaryAction} disabled={loading} style={[styles.submitButton, { backgroundColor: loading ? '#888' : '#2b7ecb' }]}>
                <Text style={styles.submitButtonText}>
                  {step === 'details' ? (loading ? 'Sending OTP…' : 'Submit') : step === 'otp' ? (loading ? 'Verifying…' : 'Verify OTP') : loading ? 'Creating…' : 'Create Account'}
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                <Text style={{ color: '#444', fontSize: 14 }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{ color: '#2b7ecb', fontWeight: '600', fontSize: 14 }}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    padding: 16,
    marginTop: 8,
  },
  stepLineText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  stepLineTextActive: {
    color: '#2b7ecb',
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#89bfb8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepCircleActive: {
    borderColor: '#2b7ecb',
    backgroundColor: '#e8f2ff',
  },
  stepCircleCompleted: {
    borderColor: '#2b7ecb',
    backgroundColor: '#2b7ecb',
  },
  stepCircleText: {
    fontSize: 12,
    color: '#2b7ecb',
    fontWeight: '700',
  },
  stepCircleTextActive: {
    color: '#2b7ecb',
  },
  stepLabel: {
    marginLeft: 6,
    marginRight: 6,
    color: '#555',
    fontSize: 12,
  },
  stepLabelActive: {
    color: '#2b7ecb',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#89bfb8',
    marginHorizontal: 6,
  },
  stepLineCompleted: {
    backgroundColor: '#2b7ecb',
  },
  label: { fontSize: 14, marginBottom: 10, marginTop: 16 },
  labelFirst: { fontSize: 14, marginBottom: 6, marginTop: 0 },
  labelRegular: { fontSize: 14, marginBottom: 6, marginTop: 8 },
  labelCompact: { fontSize: 14, marginBottom: 4, marginTop: 4 },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 1,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#89bfb8',
    paddingHorizontal: 14,
    paddingRight: 40, 
    marginBottom: 6,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeIcon: { width: 22, height: 22, tintColor: '#444' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  halfInputWrapper: { flex: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 6 },
  phoneInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#89bfb8',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  phoneNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 6,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
    marginBottom: 10,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 50,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#89bfb8',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  otpBoxError: {
    borderColor: '#dc3545',
  },
  otpErrorText: {
    color: '#dc3545',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 8,
  },
  submitButton: {
    width: '60%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
