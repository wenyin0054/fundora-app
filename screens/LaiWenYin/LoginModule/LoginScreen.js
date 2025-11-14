import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import SimpleHeader from "../../reuseComponet/simpleheader.js";
import { ScrollView } from 'react-native';
import { loginUser, initUserDB } from '../../../database/userAuth.js';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { BlurView } from "expo-blur";
import { MotiView } from "moti";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    initUserDB(); // Create table if not exists
  }, []);

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
  
    const user = await loginUser(email, password); // ✅ await async result
    setLoading(false);

    if (user) {
      Alert.alert("Success", `Welcome ${user.username}!`);
      navigation.replace("MainTabs"); // replace = faster transition
    } else {
      Alert.alert("Error", "Invalid email or password");
    }
  };




  const handleFaceAuth = () => {
    console.log('Face Authentication activated');
    navigation.navigate('FaceRegistration')
  };
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >

      <View style={styles.container}>
        <SimpleHeader title="Login" showBackButton={false} />

        <Text style={styles.title}>Fundora</Text>
        <Text style={styles.welcome}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue managing your finances.
        </Text>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="user@fundora.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="password123"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={!loading ? handleLogin : null}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />) : (
            <Text style={styles.loginText}>Login</Text>)}
        </TouchableOpacity>


        <Text style={styles.registerText}>
          Don't have an account?{' '}
          <Text style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            Register
          </Text>
        </Text>

        <View style={styles.faceContainer}>
          <Text style={styles.faceTitle}>Face Authentication</Text>
          <Text style={styles.faceSubtitle}>Login securely with just a glance.</Text>
          <View style={styles.faceRow}>
            <Image
              source={require('../../../assets/Selection.png')}
              style={styles.icon}
            />
            <TouchableOpacity style={styles.faceButton} onPress={handleFaceAuth}>
              <Text style={styles.faceButtonText}>Enable Face Authentication</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {loading && (
        <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 400 }}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color="#57C0A1" />
            <Text style={styles.loadingText}>Logging in...</Text>
          </MotiView>
        </BlurView>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 15,
  },

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

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#57C0A1',
    textAlign: 'center',
    marginTop: 40,
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
    marginVertical: 30,
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
  },
  forgot: {
    color: '#8AD0ABFF',
    textAlign: 'right',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#57C0A1',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },
  loginText: {
    color: '#112A1DFF',
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
    color: '#57C0A1',
    fontWeight: '600',
  },
  faceContainer: {
    backgroundColor: '#F4FBF7FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
  },
  faceTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  faceSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  faceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  icon: {
    width: 45,
    height: 85,
    marginRight: 10,
  },
  faceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#89D0AAFF",
    borderRadius: 9999,
    paddingVertical: 12,
    justifyContent: "center",
  },
  faceButtonText: {
    color: "#215339FF",
    fontWeight: "600",
    textAlign: "center",
  },
});
