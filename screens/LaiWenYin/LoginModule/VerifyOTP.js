import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { getApiBase } from "../FaceAuthModule/apiConfig";

const API = getApiBase();

export default function VerifyOTP() {
  const route = useRoute();
  const navigation = useNavigation();
  const { email } = route.params;

  const [otp, setOtp] = useState("");

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "OTP must be 6 digits");
      return;
    }

    try {
      const res = await axios.post(`${API}/verify-otp`, {
        email,
        otp,
      });

      if (res.data.success) {
        navigation.navigate("ResetPassword", { email });
      } else {
        Alert.alert("Error", res.data.error);
      }

    } catch (err) {
      Alert.alert("Error", "Server unreachable");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>

      <Text style={styles.subtitle}>
        We have sent a 6-digit OTP to{" "}
        <Text style={{ fontWeight: "700" }}>{email}</Text>
      </Text>

      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter OTP"
        keyboardType="number-pad"
        maxLength={6}
      />

      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOTP}>
        <Text style={styles.verifyText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: "#F9FAFB" },
  title: { fontSize: 30, fontWeight: "700", color: "#111827", marginBottom: 10 },
  subtitle: { fontSize: 15, color: "#6B7280", marginBottom: 25, lineHeight: 20 },
  otpInput: {
    height: 55,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 25,
  },
  verifyBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
