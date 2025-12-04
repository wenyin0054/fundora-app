import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { generateResetToken } from '../../../database/userAuth';

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  // Shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const runShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (value) => {
    const v = (value || '').trim();
    if (!v) return 'Email is required';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(v)) return 'Please enter a valid email address';
    return '';
  };

  const handleReset = async () => {
    const error = validateEmail(email);
    setEmailError(error);

    if (error) {
      runShake();
      return; // stop submission if invalid
    }

    try {
      setLoading(true);
      const token = await generateResetToken(email);

      const generatedResetLink = `myapp://reset?email=${encodeURIComponent(email)}&token=${token}`;

      navigation.navigate('ResetPassword', {
        email: email,
        token: token,
        resetLink: generatedResetLink
      });

    } catch (err) {
      alert(err.message || 'Failed to generate reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Your Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address below to receive a password reset link.
        </Text>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor={"#c5c5c5ff"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              editable={!loading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Generating Link...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#000', marginBottom: 6 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 20, fontSize: 14, paddingHorizontal: 10 },
  inputGroup: { marginBottom: 35 },
  label: { fontWeight: '500', color: '#374151', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  inputError: { borderColor: '#EF4444', borderWidth: 1, backgroundColor: '#FEF3F2' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  button: { backgroundColor: '#57C0A1', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#A8D5C5', opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
