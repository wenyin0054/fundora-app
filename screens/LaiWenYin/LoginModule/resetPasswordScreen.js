import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView 
} from "react-native";
import { resetPassword } from '../../../database/userAuth';

export default function ResetPassword({ route, navigation }) {
  const { email, token, resetLink } = route.params || {};
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    // Add more validation rules as needed
    return null;
  };

  const handleReset = async () => {
    // Validation checks
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (!confirmPassword) {
      Alert.alert("Error", "Please confirm your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert("Error", passwordError);
      return;
    }

    if (!email || !token) {
      Alert.alert("Error", "Reset information is missing. Please try the reset process again.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email, token, newPassword);
      setLoading(false);
      
      Alert.alert(
        "✅ Success", 
        "Your password has been reset successfully. You can now log in with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => navigation.navigate("Login")
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to reset password. Please try again.");
    }
  };

  const handleShowResetLink = () => {
    if (resetLink) {
      Alert.alert(
        "Reset Link Info",
        `Email: ${email}\n\nReset Link: ${resetLink}`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>for {email}</Text>

      {resetLink && (
        <TouchableOpacity style={styles.infoButton} onPress={handleShowResetLink}>
          <Text style={styles.infoButtonText}>View Reset Information</Text>
        </TouchableOpacity>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeButtonText}>
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </Text>
          </TouchableOpacity>
        </View>
        {newPassword && validatePassword(newPassword) && (
          <Text style={styles.errorText}>{validatePassword(newPassword)}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />
          <TouchableOpacity 
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeButtonText}>
              {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
            </Text>
          </TouchableOpacity>
        </View>
        {confirmPassword && newPassword !== confirmPassword && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.buttonText}>Resetting Password...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Confirm Reset</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Back to Forgot Password</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: "#fff" 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 10, 
    textAlign: "center" 
  },
  subtitle: { 
    fontSize: 14, 
    color: "#6B7280", 
    marginBottom: 20, 
    textAlign: "center" 
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    fontSize: 14,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    paddingRight: 50, // Space for eye button
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeButtonText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "#57C0A1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
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
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 15,
  },
  backButtonText: {
    color: "#6B7280",
    fontWeight: "500",
    fontSize: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 5,
  },
  infoButton: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  infoButtonText: {
    color: "#374151",
    fontWeight: "500",
    fontSize: 12,
  },
});