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
import { Ionicons } from "@expo/vector-icons";
import { resetPassword } from "../../../database/userAuth";

export default function ResetPassword({ route, navigation }) {
  const { email } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 👁 same logic as LoginScreen
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 20) return "Password must be less than 20 characters";
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password))
      return "Password must contain letters and numbers";
    return null;
  };

  const handleReset = async () => {
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
      await resetPassword(email, newPassword); // 🔐 handled securely in backend
      setLoading(false);

      Alert.alert("Success", "Your password has been reset!", [
        { text: "Go to Login", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to reset password.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>{email}</Text>

      {/* NEW PASSWORD */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter new password"
            placeholderTextColor="#6B7280"

            // 🔐 encrypted (masked) when eye is closed
            secureTextEntry={!showPassword}

            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
            maxLength={20}

            // Android dot color fix
            selectionColor="#000000"
            keyboardAppearance="light"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#6B7280"
            />
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
            style={styles.passwordInput}
            placeholder="Confirm new password"
            placeholderTextColor="#6B7280"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            maxLength={20}
            selectionColor="#000000"
            keyboardAppearance="light"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={loading}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#6B7280"
            />
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

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 16,
    color: "#000",
  },

  button: {
    backgroundColor: "#57C0A1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "600" },

  loadingContainer: { flexDirection: "row", gap: 8 },

  backButton: { marginTop: 15, alignItems: "center" },
  backButtonText: { color: "#6B7280" },

  errorText: { color: "#EF4444", fontSize: 12, marginTop: 5 },
});
