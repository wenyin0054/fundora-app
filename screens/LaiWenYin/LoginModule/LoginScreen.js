import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SimpleHeader from "../../reuseComponet/simpleheader.js";
import {
  loginUser,
  initUserDB,
  logUserTable,
  getUserById,
  getTodayQuizStatus,
  resetUserDB,
  checkOnboardingStatus,
  hasRegisteredFace,
} from '../../../database/userAuth.js';
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useUser } from '../../reuseComponet/UserContext.js';
export default function LoginScreen({ navigation,route }) {
  const { setUserId } = useUser();
  // form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // for login button
  const [faceLoginLoading, setFaceLoginLoading] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [autoFaceLoginAvailable, setAutoFaceLoginAvailable] = useState(false);
  const [disableAutoFaceLogin, setDisableAutoFaceLogin] = useState(false);
const [readyToAutoLogin, setReadyToAutoLogin] = useState(false);


  // validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  // toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastTimeoutRef = useRef(null);

  // animation - shake for the invalid form
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // prevent multiple auto-face-login attempts
  const autoFaceLoginTriggeredRef = useRef(false);

  useEffect(() => {
    if (route?.params?.disableAuto) {
      setDisableAutoFaceLogin(true);
      console.log("Testing.....",disableAutoFaceLogin);
    }

    setReadyToAutoLogin(true);
  }, [route?.params]);


useEffect(() => {
  console.log("Ready to auto login:", readyToAutoLogin);
  if (!readyToAutoLogin) return;
  initUserDB();
  logUserTable();

  if (!disableAutoFaceLogin) {
    checkAutoFaceLoginAndNavigate();
  }

  return () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };
}, [disableAutoFaceLogin]);


  useFocusEffect(
    React.useCallback(() => {
      setFaceLoginLoading(false);
    }, [])
  );
  // validate when fields change
  useEffect(() => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setIsFormValid(!eErr && !pErr);
  }, [email, password]);

  // --------------- Validation helpers ---------------
  const validateEmail = (value) => {
    const v = (value || '').trim();
    if (!v) return 'Email is required';
    // simple email regex
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(v)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (value) => {
    const v = value || '';
    if (!v) return 'Password is required';
    if (v.length < 6) return 'Password must be at least 6 characters';
    if (v.length > 20) return 'Password must be less than 20 characters';
    return '';
  };

  // --------------- Toast ---------------
  const showToast = (message, type = 'error', duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, duration);
  };

  // --------------- Shake animation ---------------
  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // --------------- Auto-face login check ---------------
  // If recentUsersWithFaceAuth exists, auto navigate to FaceLoginScreen once.
  const checkAutoFaceLoginAndNavigate = async () => {
    if (disableAutoFaceLogin) return;
    try {
      const lastUserJson = await AsyncStorage.getItem("lastLoggedInUser");
      if (!lastUserJson) {
        console.log("⚠️ No last logged-in user found");
        return;
      }

      const lastUser = JSON.parse(lastUserJson);
      const userId = lastUser.userId;

      const faceRegistered = await hasRegisteredFace(userId);
      if (!faceRegistered) {
        console.log("⚠️ User has no face registered");
        return;
      }

      if (autoFaceLoginTriggeredRef.current) return;
      autoFaceLoginTriggeredRef.current = true;

      console.log("🔐 Auto Face Login triggered for:", userId);

      navigation.navigate("FaceLoginScreen", {
        onSuccess: async (userData) => {
          console.log("🎉 Face login success");
          setFaceLoginLoading(false);
          navigation.replace("MainApp");
        },
        onCancel: () => {
          console.log("🛑 Face login cancelled");
          setFaceLoginLoading(false);
        },
      });

    } catch (err) {
      console.error("❌ Auto face login error", err);
    }
  };


  // --------------- Auto face login flow ---------------
  const handleAutoFaceLogin = async () => {
    setFaceLoginLoading(true);

    try {
      navigation.navigate('FaceLoginScreen', {
        onSuccess: async (userData) => {
          setFaceLoginLoading(false);
          await handleLoginSuccess(userData);
        },
        onCancel: async () => {
          setFaceLoginLoading(false);
          setAutoFaceLoginAvailable(false);
          await removeAllUsersFromFaceAuth();
          showToast('Face not recognized — please login manually.', 'error');
        },
      });
    } catch (err) {
      console.error('Auto face login error:', err);
      setFaceLoginLoading(false);
      showToast('Face login failed. Please login manually.', 'error');
    }
  };

  // --------------- Manage recentUsersWithFaceAuth ---------------
  const storeRecentUserWithFaceAuth = async (user) => {
    try {
      const recentUsers = await AsyncStorage.getItem('recentUsersWithFaceAuth');
      let usersArray = recentUsers ? JSON.parse(recentUsers) : [];

      usersArray = usersArray.filter(u => u.userId !== user.userId);
      usersArray.unshift({
        userId: user.userId,
        username: user.username,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      usersArray = usersArray.slice(0, 5);
      await AsyncStorage.setItem('recentUsersWithFaceAuth', JSON.stringify(usersArray));
      setAutoFaceLoginAvailable(true);
    } catch (err) {
      console.error('Error storing recent user:', err);
    }
  };

  const removeAllUsersFromFaceAuth = async () => {
    try {
      await AsyncStorage.removeItem('recentUsersWithFaceAuth');
      setAutoFaceLoginAvailable(false);
    } catch (err) {
      console.error('Error removing face auth users:', err);
    }
  };

  const removeUserFromFaceAuth = async (userId) => {
    try {
      const recentUsers = await AsyncStorage.getItem('recentUsersWithFaceAuth');
      if (!recentUsers) return;
      let usersArray = JSON.parse(recentUsers);
      usersArray = usersArray.filter(u => u.userId !== userId);
      await AsyncStorage.setItem('recentUsersWithFaceAuth', JSON.stringify(usersArray));
      setAutoFaceLoginAvailable(usersArray.length > 0);
    } catch (err) {
      console.error('Error removing user from face auth:', err);
    }
  };

  // --------------- Login flow ---------------
  const handleLogin = async () => {
    // final validation
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);

    setEmailError(eErr);
    setPasswordError(pErr);

    if (eErr || pErr) {
      runShake();
      showToast('Please fix the highlighted errors', 'error');
      return;
    }

    setLoading(true);

    try {
      const user = await loginUser(email.trim(), password);

      if (!user) {
        runShake();
        showToast('Invalid email or password', 'error');
        setLoading(false);
        return;
      }

      // success
      await handleLoginSuccess(user);
    } catch (err) {
      console.error('Login error:', err);
      showToast('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user) => {
    setNavigationLoading(true);
    showToast(`Welcome back, ${user.username}!`, 'success');

    try {
      // store session
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        userId: user.userId,
        username: user.username,
        email: user.email,
      }));

      await AsyncStorage.setItem('lastLoggedInUser', JSON.stringify({
        userId: user.userId,
        username: user.username,
        email: user.email,
      }));

      // 🔥 IMPORTANT: update UserContext
      setUserId(user.userId);


      // store for face auth
      const hasFace = await hasRegisteredFace(user.userId);
      if (hasFace) {
        await storeRecentUserWithFaceAuth(user);
      }

      // route determination
      const next = await determineNextScreen(user.userId);
      // small delay to show toast + loading UI
      setTimeout(() => {
        // use replace to clear history
        navigation.replace(next.screen, next.params || {});
      }, 250);

    } catch (err) {
      console.error('Error during post-login:', err);
      // fallback
      navigation.replace('MainApp');
    } finally {
      setNavigationLoading(false);
    }
  };

  const determineNextScreen = async (userId) => {
    try {
      const onboardingDone = await checkOnboardingStatus(userId);
      const userData = await getUserById(userId);
      const hasFace = await hasRegisteredFace(userId);
      const dailyQuizEnabled = !!(userData && userData.dailyQuiz === 1);

      // not done onboarding
      if (!onboardingDone) {
        return { screen: 'OnboardingScreen' };
      }

      // no face registered
      if (!hasFace) {
        return {
          screen: 'FaceRegistration',
          params: { showSkipOption: true, fromLogin: true }
        };
      }

      if (dailyQuizEnabled) {
        const hasSeenQuizIntro = await AsyncStorage.getItem(`hasSeenQuizIntro_${userId}`);
        const todayDone = await getTodayQuizStatus(userId);
        if (!hasSeenQuizIntro) {
          return { screen: 'QuizIntroductionScreen', params: { userId } };
        } else if (!todayDone) {
          return { screen: 'DailyQuiz', params: { userId } };
        }
      }

      return { screen: 'MainApp' };
    } catch (err) {
      console.error('determineNextScreen error:', err);
      return { screen: 'MainApp' };
    }
  };

  // --------------- Render ---------------
  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <SimpleHeader title="Login" showBackButton={false} />

          <Text style={styles.title}>Fundora</Text>
          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue managing your finances.
          </Text>

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // inline validation feedback
                if (emailError) setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter your email"
              placeholderTextColor={"#c5c5c5ff"}
              editable={!loading && !navigationLoading}
              returnKeyType="next"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={"#c5c5c5ff"}
                maxLength={20}
                editable={!loading && !navigationLoading}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            <Text style={styles.charCount}>{password.length}/20 characters</Text>
          </Animated.View>

          {/* Face Login Option */}
          <View style={styles.faceLoginContainer}>
            <View style={styles.separatorContainer}>
              <View style={styles.separator} />
              <Text style={styles.separatorText}>or</Text>
              <View style={styles.separator} />
            </View>

            <TouchableOpacity style={styles.faceLoginButton} onPress={handleAutoFaceLogin}>
              <Ionicons name="person-circle-outline" size={36} color="#57C0A1" />
              <Text style={styles.faceLoginText}>Use Face ID</Text>
            </TouchableOpacity>
          </View>


          <TouchableOpacity>
            <Text style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, !isFormValid && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={!isFormValid || loading || navigationLoading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.registerText}>
            Don't have an account?{' '}
            <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
              Register
            </Text>
          </Text>
        </View>

        {/* overlays */}
        {(loading || navigationLoading) && (
          <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#57C0A1" />
              <Text style={styles.loadingText}>{loading ? 'Logging in...' : 'Preparing your experience...'}</Text>
            </MotiView>
          </BlurView>
        )}

        {faceLoginLoading && (
          <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#57C0A1" />
              <Text style={styles.loadingText}>Face Recognition...</Text>
            </MotiView>
          </BlurView>
        )}
      </ScrollView>

      {/* Toast */}
      {toastVisible && (
        <MotiView
          from={{ opacity: 0, translateY: 80 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 80 }}
          style={[
            styles.toastContainer,
            toastType === 'error' ? styles.toastError : styles.toastSuccess
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
    padding: 15,
  },
  container: {
    flex: 1,
  },

  // Toast Styles
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
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
    marginLeft: 10,
    marginRight: 10,
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

  // Loading Overlays
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
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
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

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#57C0A1',
    textAlign: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 24,
  },
  welcome: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 30,
    color: '#171A1FFF',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginVertical: 18,
  },
  label: {
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 12,
  },
  inputError: {
    // duplicate key intentionally merged earlier - this keeps consistent style
    borderColor: '#EF4444',
    borderWidth: 1,
    backgroundColor: '#FEF3F2',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    color: "#000",
  },
  forgot: {
    color: '#57C0A1',
    textAlign: 'right',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#57C0A1',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
  registerText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#565D6DFF',
  },
  registerLink: {
    color: '#57C0A1'
  },
  faceLoginContainer: {
    marginTop: 20,
    alignItems: "center",
  },

  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    width: "80%",
  },

  separator: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  separatorText: {
    marginHorizontal: 10,
    color: "#6B7280",
    fontSize: 14,
  },

  faceLoginButton: {
    alignItems: "center",
    justifyContent: "center",
  },

  faceLoginText: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "500",
    color: "#57C0A1",
  },

});
