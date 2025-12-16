import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { getApiBase } from "../FaceAuthModule/apiConfig";
import { FDSValidatedInput, FDSButton } from "../../reuseComponet/DesignSystem";

const API = getApiBase();

export default function VerifyOTP() {
  const route = useRoute();
  const navigation = useNavigation();
  const { email } = route.params;

  const [otp, setOtp] = useState("");
  const otpRef = useRef(null);

  const handleVerifyOTP = async () => {
    const validOtp = otpRef.current?.validate();
    if (!validOtp) return;

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

      <FDSValidatedInput
        ref={otpRef}
        label="OTP Code"
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter 6-digit OTP"
        keyboardType="number-pad"
        maxLength={6}
        validate={(v) => v && v.length === 6}
        errorMessage="OTP must be 6 digits"
      />

      <FDSButton
        title="Verify"
        onPress={handleVerifyOTP}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: "#F9FAFB" },
  title: { fontSize: 30, fontWeight: "700", color: "#111827", marginBottom: 10 },
  subtitle: { fontSize: 15, color: "#6B7280", marginBottom: 25, lineHeight: 20 },
});
