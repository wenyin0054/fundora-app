import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { generateResetToken, resetUserDB } from '../../../database/userAuth';
import * as Linking from "expo-linking";

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');
  
  const handleReset = async () => {
    const prefix = Linking.createURL("/");
    
    // Basic email validation
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    
    try {
      setLoading(true);
      const token = await generateResetToken(email);
      setLoading(false);

      // Generate deep link
      const generatedResetLink = `myapp://reset?email=${encodeURIComponent(
        email
      )}&token=${token}`;
      
      setResetLink(generatedResetLink);

      // Navigate to ResetPassword screen with parameters
      navigation.navigate('ResetPassword', {
        email: email,
        token: token,
        resetLink: generatedResetLink
      });

    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Your Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address below to receive a password reset link.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
    marginBottom: 6,
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  inputGroup: {
    marginBottom: 35,
  },
  label: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#57C0A1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#A8D5C5',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});