import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from "axios";
import { getApiBase } from "../FaceAuthModule/apiConfig";
import { getUserByEmail } from '../../../database/userAuth';
import { FDSValidatedInput, FDSButton } from "../../reuseComponet/DesignSystem"; 


export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);

  const API = getApiBase();

  const handleReset = async () => {
    const validEmail = emailRef.current?.validate();
    if (!validEmail) return;

  try {
    setLoading(true);
    // FRONT-END email verification using SQLite (userAuth.db)
    const user = await getUserByEmail(email);
    if (!user) {
      Alert.alert("Email Not Found", "This email is not registered.");
      setLoading(false);
      return;
    }

    console.log("📩 Sending OTP to:", email, "API:", API);
    await axios.post(`${API}/send-otp`, { email });
    navigation.navigate("VerifyOTP", { email });
  } catch (err) {
    Alert.alert("Error", err.message || "Failed to send OTP");
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

        <FDSValidatedInput
          ref={emailRef}
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          validate={(v) => {
            const trimmed = (v || '').trim();
            if (!trimmed) return false;
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(trimmed);
          }}
          errorMessage="Please enter a valid email address"
        />

        <FDSButton
          title="Send Reset Link"
          loading={loading}
          loadingText="Sending OTP..."
          onPress={handleReset}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#000', marginBottom: 6 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: 30, lineHeight: 20, fontSize: 14, paddingHorizontal: 10 },
});
