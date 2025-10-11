import React, { useState } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';

export default function PasswordRecovery() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(1); // 1: Phone Number, 2: OTP, 3: New Password
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);

  // Generate a random 6-digit OTP
  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    return otp;
  };

  // Validate Philippine phone number
  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check for valid Philippine phone number patterns
    const patterns = [
      /^63\d{10}$/, // +63 format (63XXXXXXXXXX)
      /^09\d{9}$/, // 09 format (09XXXXXXXXX)
      /^9\d{9}$/, // 9 format (9XXXXXXXXX)
    ];
    
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('63')) {
      // Convert 63XXXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(2, 3)}${cleanPhone.slice(3, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8)}`;
    } else if (cleanPhone.startsWith('09')) {
      // Convert 09XXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(1, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
      // Convert 9XXXXXXXXX to +63 9XX XXX XXXX
      return `+63 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
    }
    
    return phone; // Return original if no pattern matches
  };

  // Get normalized phone number for API calls
  const getNormalizedPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('63')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('09')) {
      return `+63${cleanPhone.slice(1)}`;
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
      return `+63${cleanPhone}`;
    }
    
    return phone;
  };

  // Check if input starts with a letter (should show validation warning)
  const startsWithLetter = (text: string) => {
    return text.length > 0 && /^[a-zA-Z]/.test(text.trim());
  };

  // Handle phone number input change
  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);
    
    // Show validation warning only if user starts typing with a letter
    if (text.length === 1 && startsWithLetter(text)) {
      setShowPhoneValidation(true);
    } else if (text.length === 0) {
      // Reset validation state when input is cleared
      setShowPhoneValidation(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }

    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number', 
        'Please enter a valid Philippine phone number.\n\nValid formats:\n• +63 9XX XXX XXXX\n• 09XX XXX XXXX\n• 9XX XXX XXXX'
      );
      return;
    }

    setLoading(true);
    try {
      // Generate temporary OTP for testing
      const tempOTP = generateOTP();
      console.log('🔐 Generated OTP for testing:', tempOTP);
      
      // For development: Show OTP in alert for easy testing
      // Comment out this alert in production
      Alert.alert(
        'OTP Generated', 
        `Your temporary OTP is: ${tempOTP}\n\n(This is for testing purposes only)`,
        [{ text: 'OK' }]
      );

      // Simulate API call to send OTP
      // In production, this would send OTP via SMS
      setTimeout(() => {
        Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
        setStep(2);
        startResendTimer();
        setLoading(false);
      }, 1000);

      /* 
      // uncomment in future when backend is ready
      const response = await axios.post(
        'http://10.0.2.2:5000/api/customers/forgot-password',
        { phone_number: phoneNumber },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.success) {
        Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
        setStep(2);
        startResendTimer();
      } else {
        Alert.alert('Error', response.data?.message || 'Phone number not found.');
      }
      */
    } catch (error: any) {
      console.log('Send OTP Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code.');
      return;
    }

    setLoading(true);
    try {
      // Verify OTP against the generated one
      if (otp === generatedOTP) {
        Alert.alert('Success', 'OTP verified successfully.');
        setStep(3);
      } else {
        Alert.alert('Error', 'Invalid OTP code. Please try again.');
        return;
      }

      /* 
      // uncomment in future when backend is ready
      const response = await axios.post(
        'http://10.0.2.2:5000/api/customers/verify-otp',
        { phone_number: phoneNumber, otp: otp },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.success) {
        Alert.alert('Success', 'OTP verified successfully.');
        setStep(3);
      } else {
        Alert.alert('Error', response.data?.message || 'Invalid OTP code.');
      }
      */
    } catch (error: any) {
      console.log('Verify OTP Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // For testing purposes, simulate successful password reset
      Alert.alert('Success', 'Password has been reset successfully!', [
        { 
          text: 'OK', 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
      ]);

      /* 
      // uncomment in future when backend is ready
      const response = await axios.post(
        'http://10.0.2.2:5000/api/customers/reset-password',
        { 
          phone_number: phoneNumber, 
          otp: otp,
          new_password: newPassword 
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.success) {
        Alert.alert('Success', 'Password has been reset successfully!', [
          { 
            text: 'OK', 
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          }
        ]);
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to reset password.');
      }
      */
    } catch (error: any) {
      console.log('Reset Password Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      // Generate new OTP for testing
      const newOTP = generateOTP();
      console.log('🔐 New OTP generated:', newOTP);
      
      // For development: Show new OTP in alert
      Alert.alert(
        'New OTP Generated', 
        `Your new OTP is: ${newOTP}\n\n(This is for testing purposes only)`,
        [{ text: 'OK' }]
      );

      setTimeout(() => {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
        startResendTimer();
        setLoading(false);
      }, 1000);

      /* 
      // uncomment in future when backend is ready
      const response = await axios.post(
        'http://10.0.2.2:5000/api/customers/forgot-password',
        { phone_number: phoneNumber },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.success) {
        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
        startResendTimer();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to resend OTP.');
      }
      */
    } catch (error: any) {
      console.log('Resend OTP Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
        <Text style={[styles.stepText, step >= 1 && styles.stepTextActive]}>1</Text>
      </View>
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
        <Text style={[styles.stepText, step >= 2 && styles.stepTextActive]}>2</Text>
      </View>
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
        <Text style={[styles.stepText, step >= 3 && styles.stepTextActive]}>3</Text>
      </View>
    </View>
  );

  const renderPhoneStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Enter Phone Number</Text>
      <Text style={styles.stepDescription}>
        We'll send a verification code to your registered phone number
      </Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={[
          styles.input,
          showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && styles.inputError
        ]}
        placeholder="+63 9XX XXX XXXX"
        placeholderTextColor="#3D3D3D"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        autoFocus
      />

      {/* Validation feedback - only show if user started with letter or has invalid format after starting with letter */}
      {showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && (
        <View style={styles.validationContainer}>
          <Text style={styles.validationText}>
            Please enter a valid Philippine phone number
          </Text>
        </View>
      )}

      {/* Format examples */}
      <View style={styles.formatExamples}>
        <Text style={styles.formatTitle}>Valid formats:</Text>
        <Text style={styles.formatText}>• +63 9XX XXX XXXX</Text>
        <Text style={styles.formatText}>• 09XX XXX XXXX</Text>
        <Text style={styles.formatText}>• 9XX XXX XXXX</Text>
      </View>

      <TouchableOpacity 
        onPress={handleSendOTP} 
        style={[
          styles.button, 
          (loading || (showPhoneValidation && !!phoneNumber.trim() && !validatePhoneNumber(phoneNumber))) && styles.buttonDisabled
        ]}
        disabled={loading || (showPhoneValidation && !!phoneNumber.trim() && !validatePhoneNumber(phoneNumber))}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Enter Verification Code</Text>
      <Text style={styles.stepDescription}>
        Enter the 6-digit code sent to {phoneNumber}
      </Text>

      {/* Development Helper - Remove in production */}
      {__DEV__ && generatedOTP && (
        <View style={styles.devHelper}>
          <Text style={styles.devHelperText}>🔧 Dev Mode: Current OTP is {generatedOTP}</Text>
        </View>
      )}

      <Text style={styles.label}>OTP Code</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit code"
        placeholderTextColor="#3D3D3D"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
        autoFocus
      />

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity 
          onPress={handleResendOTP} 
          disabled={resendTimer > 0 || loading}
        >
          <Text style={[styles.resendLink, (resendTimer > 0 || loading) && styles.resendLinkDisabled]}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={handleVerifyOTP} 
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Create New Password</Text>
      <Text style={styles.stepDescription}>
        Enter a strong password to secure your account
      </Text>

      <Text style={styles.label}>New Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor="#3D3D3D"
          secureTextEntry={!passwordVisible}
          value={newPassword}
          onChangeText={setNewPassword}
          autoFocus
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
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

      <Text style={styles.label}>Confirm Password</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#3D3D3D"
          secureTextEntry={!passwordVisible}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity 
        onPress={handleResetPassword} 
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={styles.appTitle}>eLABA: Laundry Booking Services</Text>
                <Image source={require('../../assets/img/elaba.png')} style={styles.appIcon} />
                <Text style={styles.screenTitle}>Password Recovery</Text>
              </View>

              {renderStepIndicator()}
            </View>

            {step === 1 && renderPhoneStep()}
            {step === 2 && renderOTPStep()}
            {step === 3 && renderPasswordStep()}

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2b7ecb',
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  appIcon: {
    width: 60,
    height: 60,
    resizeMode: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff75',
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2b7ecb',
    borderColor: '#2b7ecb',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ccc',
  },
  stepLineActive: {
    backgroundColor: '#2b7ecb',
  },
  form: {
    backgroundColor: '#ffffff75',
    borderRadius: 25,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    alignSelf: 'flex-start',
    marginBottom: 10,
    color: '#333',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 47,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: '#89bfb8',
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 12,
  },
  eyeIcon: {
    width: 22,
    height: 22,
    tintColor: '#666',
  },
  button: {
    width: '100%',
    backgroundColor: '#2b7ecb',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#2b7ecb',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  loginText: {
    color: '#333',
    fontSize: 14,
  },
  loginLink: {
    color: '#2b7ecb',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Development helper styles
  devHelper: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    alignSelf: 'stretch',
  },
  devHelperText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Phone validation styles
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  validationContainer: {
    marginTop: -10,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  validationText: {
    color: '#dc3545',
    fontSize: 12,
    fontStyle: 'italic',
  },
  formatExamples: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignSelf: 'stretch',
  },
  formatTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  formatText: {
    fontSize: 11,
    color: '#6c757d',
    lineHeight: 16,
  },
});
