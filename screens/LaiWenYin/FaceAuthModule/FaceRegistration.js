import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FaceRegistrationS({navigation}) {
  const [isEnabled, setIsEnabled] = useState(true);

  const toggleSwitch = () => setIsEnabled(previousState => !previousState);

  const handleRegisterFace = () => {
    console.log('Face registration process started...');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
    <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}>
  <Ionicons name="chevron-back" size={24} color="#000" />
</TouchableOpacity>


      <Text style={styles.headerTitle}>Face Registration</Text>

      {/* Logo + Description */}
      <Text style={styles.logo}>Fundora</Text>
      <Text style={styles.subtitle}>
        Your secure financial journey starts here!
      </Text>

      {/* Info Card */}
      <View style={styles.card}>
        <Ionicons name="happy-outline" size={32} color="#57C0A1" style={styles.icon} />
        <Text style={styles.cardTitle}>Unlock Convenience and Security</Text>
        <Text style={styles.cardText}>
          Experience effortless logins and enhanced protection with facial recognition. 
          Your face becomes your secure key, streamlining access while keeping your 
          finances safe. No more passwords to remember!
        </Text>
      </View>

      {/* Enable Switch */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Enable Face Recognition</Text>
        <Switch
          trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
          thumbColor={isEnabled ? '#57C0A1' : '#f4f3f4'}
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerButton, !isEnabled && { opacity: 0.6 }]}
        disabled={!isEnabled}
        onPress={handleRegisterFace}
      >
        <Ionicons name="camera-outline" size={20} color="#fff" />
        <Text style={styles.registerText}>Register My Face</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  logo: {
    color: '#57C0A1',
    fontWeight: '700',
    fontSize: 28,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  icon: {
    textAlign: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  cardText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  switchLabel: {
    fontWeight: '500',
    color: '#374151',
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#57C0A1',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});
