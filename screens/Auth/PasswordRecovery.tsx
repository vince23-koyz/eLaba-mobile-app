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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { api, API_ENDPOINTS } from '../../config/api';
import { useAlert } from '../../context/AlertContext';

export default function PasswordRecovery() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlert } = useAlert();

  const [step, setStep] = useState(1); // 1: Phone Number, 2: OTP, 3: New Password
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const otpRefs = React.useRef<Array<TextInput | null>>([]);

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

  // Handle OTP input for individual boxes
  const handleOTPChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    if (otpError) {
      setOtpError('');
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next box if digit is entered
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to go to previous box
  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Check if all OTP boxes are filled
  const isOTPComplete = () => {
    return otp.every((digit) => digit.trim() !== '');
  };

  // Handle phone number input change
  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);
    if (phoneError) {
      setPhoneError('');
    }

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
      setPhoneError('Please enter your phone number.');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      showAlert(
        'Invalid Phone Number',
        'Please enter a valid Philippine phone number.\n\nValid formats:\n• +63 9XX XXX XXXX\n• 09XX XXX XXXX\n• 9XX XXX XXXX',
        undefined,
        'warning'
      );
      return;
    }

    const normalizedPhone = getNormalizedPhoneNumber(phoneNumber);
    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.CUSTOMERS.FORGOT_PASSWORD, { phone_number: normalizedPhone });

      if (response.data?.success) {
        if (response.data?.otp) {
          console.log('🔐 Generated OTP:', response.data.otp);
        }
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setStep(2);
        startResendTimer();
      } else {
        showAlert('Error', response.data?.message || 'Failed to send OTP.', undefined, 'error');
      }
    } catch (error: any) {
      console.log('Send OTP Error:', error.response?.data || error.message || error);
      showAlert('Error', error.response?.data?.message || 'Failed to send OTP. Please try again.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (!otpString.trim()) {
      showAlert('Error', 'Please enter the OTP code.', undefined, 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.CUSTOMERS.VERIFY_OTP, {
        phone_number: getNormalizedPhoneNumber(phoneNumber),
        otp: otpString,
      });

      if (response.data?.success) {
        setOtpError('');
        showAlert('Success', 'OTP verified successfully.', undefined, 'success');
        setOtp(['', '', '', '', '', '']); // Reset OTP
        setStep(3);
      } else {
        setOtp(['', '', '', '', '', '']);
        setOtpError(response.data?.message || 'Incorrect code. Please try again.');
        otpRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.log('Verify OTP Error:', error.message || error);
      setOtp(['', '', '', '', '', '']);
      setOtpError(error.response?.data?.message || 'Incorrect code. Please try again.');
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showAlert('Error', 'Please fill in both password fields.', undefined, 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match.', undefined, 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long.', undefined, 'warning');
      return;
    }

    const normalizedPhone = getNormalizedPhoneNumber(phoneNumber);
    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        phone_number: normalizedPhone,
        new_password: newPassword,
      });

      const data = response.data;
      if (data?.success) {
        showAlert(
          'Success',
          'Password has been reset successfully!',
          [{ text: 'OK', primary: true, onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }],
          'success'
        );
      } else {
        showAlert('Error', data?.message || 'Failed to reset password.', undefined, 'error');
      }
    } catch (error: any) {
      console.log('Reset Password Error:', error.response?.data || error.message || error);
      showAlert('Error', error.response?.data?.message || 'Failed to reset password. Please try again.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    if (!phoneNumber.trim()) {
      showAlert('Error', 'Please enter your phone number before resending OTP.', undefined, 'warning');
      return;
    }

    const normalizedPhone = getNormalizedPhoneNumber(phoneNumber);
    setLoading(true);

    try {
      const response = await api.post(API_ENDPOINTS.CUSTOMERS.FORGOT_PASSWORD, { phone_number: normalizedPhone });

      if (response.data?.success) {
        if (response.data?.otp) {
          console.log('🔐 Generated OTP:', response.data.otp);
        }
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        startResendTimer();
      } else {
        showAlert('Error', response.data?.message || 'Failed to resend OTP.', undefined, 'error');
      }
    } catch (error: any) {
      console.log('Resend OTP Error:', error.response?.data || error.message || error);
      showAlert('Error', error.response?.data?.message || 'Failed to resend OTP. Please try again.', undefined, 'error');
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
      if (step === 2) {
        setOtp(['', '', '', '', '', '']); // Reset OTP when going back
      }
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
          phoneError ? styles.inputError : null,
          showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && styles.inputError
        ]}
        placeholder="+63 9XX XXX XXXX"
        placeholderTextColor="#3D3D3D"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={handlePhoneNumberChange}
        autoFocus
      />

      {phoneError ? (
        <View style={styles.validationContainer}>
          <Text style={styles.validationText}>{phoneError}</Text>
        </View>
      ) : null}

      {/* Validation feedback - only show if user started with letter or has invalid format after starting with letter */}
      {showPhoneValidation && phoneNumber.trim() && !validatePhoneNumber(phoneNumber) && !phoneError && (
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
        We've sent 6 code to  {phoneNumber}
      </Text>

      {/* 6 OTP Input Boxes */}
      <View style={[styles.otpContainer, otpError ? styles.otpContainerError : null]}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) otpRefs.current[index] = ref;
            }}
            style={[styles.otpBox, otpError ? styles.otpBoxError : null]}
            placeholder="-"
            placeholderTextColor="#ccc"
            keyboardType="number-pad"
            value={digit}
            onChangeText={(value) => handleOTPChange(value, index)}
            onKeyPress={(e) => handleOTPKeyPress(e, index)}
            maxLength={1}
            textAlign="center"
            editable={!loading}
          />
        ))}
      </View>

      {otpError ? (
        <View style={styles.otpErrorContainer}>
          <Text style={styles.otpErrorText}>{otpError}</Text>
        </View>
      ) : null}

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
        style={[styles.button, (!isOTPComplete() || loading) && styles.buttonDisabled]}
        disabled={!isOTPComplete() || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify'}
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
                <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
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
  backIcon: {
    width: 26,
    height: 26,
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
    backgroundColor: '#cccccc',
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
  // OTP Input Boxes styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  otpContainerError: {
    borderColor: '#dc3545',
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
  otpErrorContainer: {
    width: '100%',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  otpErrorText: {
    color: '#dc3545',
    fontSize: 13,
    fontWeight: '600',
  },
});
