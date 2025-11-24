import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addUser, getUserByEmail } from '../../../database/userAuth';
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Register({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  // Validation states - track both errors and touched states
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  
  const [isFormValid, setIsFormValid] = useState(false);

  // Toast message states
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  useEffect(() => {
    validateForm();
  }, [fullName, email, password, confirmPassword]);

  // Toast message function
  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Validation functions
  const validateFullName = (name) => {
    if (!name) return 'Full name is required';
    if (name.trim().length < 3) return 'Full name must be at least 3 characters long';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password.length > 20) return 'Password must be less than 20 characters';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) return 'Password must contain letters and numbers';
    return '';
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return '';
  };

  const validateForm = () => {
    // Only validate fields that have been touched
    const fullNameValid = !fullNameTouched || validateFullName(fullName) === '';
    const emailValid = !emailTouched || validateEmail(email) === '';
    const passwordValid = !passwordTouched || validatePassword(password) === '';
    const confirmPasswordValid = !confirmPasswordTouched || validateConfirmPassword(confirmPassword) === '';
    
    // For form submission, all fields must be valid
    const allFieldsValid = 
      validateFullName(fullName) === '' &&
      validateEmail(email) === '' &&
      validatePassword(password) === '' &&
      validateConfirmPassword(confirmPassword) === '';
    
    setIsFormValid(allFieldsValid);
  };

  const updateFieldValidation = (field, value) => {
    switch (field) {
      case 'fullName':
        setFullNameTouched(true);
        setFullNameError(validateFullName(value));
        break;
      case 'email':
        setEmailTouched(true);
        setEmailError(validateEmail(value));
        break;
      case 'password':
        setPasswordTouched(true);
        setPasswordError(validatePassword(value));
        break;
      case 'confirmPassword':
        setConfirmPasswordTouched(true);
        setConfirmPasswordError(validateConfirmPassword(value));
        break;
    }
  };

  const shakeForm = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleRegister = async () => {
    // Mark all fields as touched when trying to submit
    setFullNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    // Update all errors
    const fullNameValidation = validateFullName(fullName);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = validateConfirmPassword(confirmPassword);

    setFullNameError(fullNameValidation);
    setEmailError(emailValidation);
    setPasswordError(passwordValidation);
    setConfirmPasswordError(confirmPasswordValidation);

    if (fullNameValidation || emailValidation || passwordValidation || confirmPasswordValidation) {
      shakeForm();
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);

      // Check if email already exists
      const existingUser = await getUserByEmail(email.trim());
      if (existingUser) {
        setLoading(false);
        showToast('This email is already registered', 'error');
        return;
      }

      // Add user
      const userId = await addUser(fullName, email.trim(), password);

      setLoading(false);
      showToast('Account created successfully!', 'success');

      // Store user data for face registration
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        userId: userId,
        username: fullName,
        email: email,
      }));

      // Navigate to face registration
      setTimeout(() => {
        navigation.replace("Login", { 
          showSkipOption: false,
          fromRegister: true 
        });
      }, 1500);

    } catch (error) {
      setLoading(false);
      showToast(error.message || 'Registration failed', 'error');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>
          Please fill in your details to get started.
        </Text>

        <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, fullNameError && styles.inputError]}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                updateFieldValidation('fullName', text);
              }}
              onBlur={() => setFullNameTouched(true)}
              autoCapitalize="words"
            />
            {fullNameError ? <Text style={styles.errorText}>{fullNameError}</Text> : null}
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Please enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                updateFieldValidation('email', text);
              }}
              onBlur={() => setEmailTouched(true)}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordContainer, passwordError && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Please enter password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  updateFieldValidation('password', text);
                  // Also validate confirm password when password changes
                  if (confirmPasswordTouched) {
                    setConfirmPasswordError(validateConfirmPassword(confirmPassword));
                  }
                }}
                onBlur={() => setPasswordTouched(true)}
                maxLength={20}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            <Text style={styles.charCount}>{password.length}/20 characters</Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.passwordContainer, confirmPasswordError && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Please confirm password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  updateFieldValidation('confirmPassword', text);
                }}
                onBlur={() => setConfirmPasswordTouched(true)}
                maxLength={20}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.registerButton, !isFormValid && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            Login
          </Text>
        </Text>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 400 }}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color="#57C0A1" />
            <Text style={styles.loadingText}>Creating Account...</Text>
          </MotiView>
        </BlurView>
      )}

      {/* Toast Message */}
      {toastVisible && (
        <MotiView
          from={{ opacity: 0, translateY: 100 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 100 }}
          style={[
            styles.toastContainer,
            toastType === 'error' && styles.toastError,
            toastType === 'success' && styles.toastSuccess,
          ]}
        >
          <Ionicons 
            name={toastType === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastVisible(false)}>
            <Ionicons name="close-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 40,
    color: '#57C0A1',
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 20,
    fontSize: 16,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },

  // Validation Styles
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
    backgroundColor: '#FEF3F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },

  // Button Styles
  registerButton: {
    backgroundColor: '#57C0A1',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#57C0A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },

  // Login Link
  loginText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#565D6DFF',
    fontSize: 15,
  },
  loginLink: {
    color: '#57C0A1',
    fontWeight: '700',
  },

  // Loading Overlay
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  loadingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#57C0A1",
  },

  // Toast Styles
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
});