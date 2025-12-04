import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, Alert, ActivityIndicator, ScrollView 
} from "react-native";
import { resetPassword } from "../../../database/userAuth";

export default function ResetPassword({ route, navigation }) {
  const { email, token, resetLink } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // STRONG PASSWORD VALIDATION
  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Must include an uppercase letter (A–Z)";
    if (!/[a-z]/.test(password)) return "Must include a lowercase letter (a–z)";
    if (!/[0-9]/.test(password)) return "Must include a number (0–9)";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Must include a special character";
    return null;
  };

  const handleReset = async () => {
    if (!email || !token) {
      Alert.alert("Error", "Missing password reset details. Try again.");
      return;
    }

    // Run validations
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      Alert.alert("Invalid Password", pwdError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email, token, newPassword);
      setLoading(false);

      Alert.alert(
        "Success",
        "Your password has been reset. Please log in using your new password.",
        [{ text: "Go to Login", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      setLoading(false);

      let message = "Failed to reset password. Please try again.";

      if (error?.message) {
        message = error.message;
      }

      Alert.alert("Error", message);
    }
  };

  const handleShowResetLink = () => {
    if (resetLink) {
      Alert.alert(
        "Reset Link Information",
        `Email: ${email}\n\nReset Link: ${resetLink}`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>{email}</Text>

      {resetLink && (
        <TouchableOpacity style={styles.infoButton} onPress={handleShowResetLink}>
          <Text style={styles.infoButtonText}>View Reset Info</Text>
        </TouchableOpacity>
      )}

      {/* NEW PASSWORD */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor={"#c5c5c5ff"}
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

      {/* CONFIRM PASSWORD */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={"#c5c5c5ff"}
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

      {/* RESET BUTTON */}
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.buttonText}>Resetting...</Text>
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
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 },

  inputGroup: { marginBottom: 20 },
  label: { fontWeight: "500", marginBottom: 8 },

  passwordContainer: { position: "relative" },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    paddingRight: 50,
    fontSize: 16,
  },

  eyeButton: { position: "absolute", right: 12, top: 12 },
  eyeButtonText: { fontSize: 16 },

  button: {
    backgroundColor: "#57C0A1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },

  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  loadingContainer: { flexDirection: "row", gap: 8 },

  backButton: { marginTop: 15, alignItems: "center" },
  backButtonText: { color: "#6B7280" },

  errorText: { color: "#EF4444", fontSize: 12, marginTop: 5 },

  infoButton: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  infoButtonText: { fontSize: 12 },
});
