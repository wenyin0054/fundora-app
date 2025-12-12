import React, { useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { addSavingMethod, initDB } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";
import { useRef } from "react";
import {
  FDSCard,
  FDSValidatedInput,
  FDSValidatedPicker,
  FDSLabel,
  FDSButton,
  FDSColors
} from "../../reuseComponet/DesignSystem";

export default function AddSavingMethodScreen({ navigation, route }) {
  const [methodName, setMethodName] = useState("");
  const [methodType, setMethodType] = useState("investment");
  const [riskLevel, setRiskLevel] = useState(3);
  const [liquidityLevel, setLiquidityLevel] = useState(3);
  const [expectedReturn, setExpectedReturn] = useState("5.0");
  const [colorCode, setColorCode] = useState("#4CAF50");
  const [iconName, setIconName] = useState("📊");
  const nameRef = useRef(null);
  const typeRef = useRef(null);
  const returnRef = useRef(null);
  const { userId } = useUser();

  const methodTypes = [
    { value: "bank", label: "Bank" },
    { value: "investment", label: "Investment" },
    { value: "physical", label: "Physical" },
    { value: "digital", label: "Digital" },
    { value: "cash", label: "Cash" },
    { value: "other", label: "Other" },
  ];

  const iconOptions = [
    "🏦", "🥇", "📈", "📊", "💵", "📱", "💎", "🏠", "🚀", "💰",
    "💳", "🌱", "🛡️", "🎯", "⭐", "🔥", "💧", "🌊", "🎲", "🔒"
  ];

  const colorOptions = [
    "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336",
    "#00BCD4", "#8BC34A", "#FFC107", "#795548", "#607D8B"
  ];

  // 使用 useFocusEffect 來重置表單
  useFocusEffect(
    useCallback(() => {
      // 當頁面獲得焦點時，重置表單狀態
      setMethodName("");
      setMethodType("investment");
      setRiskLevel(3);
      setLiquidityLevel(3);
      setExpectedReturn("5.0");
      setColorCode("#4CAF50");
      setIconName("📊");

      return () => {
        // 可選的清理函數
      };
    }, [])
  );

  const validateAmount = (value, fieldName = "Amount") => {
    if (!value || value === "") {
      triggerShake();
      Alert.alert(`Missing ${fieldName}`, `Please enter ${fieldName.toLowerCase()}.`);
      return false;
    }

    if (isNaN(value)) {
      triggerShake();
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be numeric.`);
      return false;
    }

    const num = parseFloat(value);
    if (num <= 0) {
      triggerShake();
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be greater than 0.`);
      return false;
    }

    if (num > 9999999999999999) {
      triggerShake();
      Alert.alert(
        `Invalid ${fieldName}`,
        `${fieldName} cannot exceed 9,999,999,999,999,999.`
      );
      return false;
    }

    return true;
  };

  const handleAddMethod = async () => {
    console.log("🔥 Adding Saving Method...");

    let valid = true;
    if (!nameRef.current?.validate()) valid = false;
    if (!typeRef.current?.validate()) valid = false;
    if (!returnRef.current?.validate()) valid = false;

    if (!valid) {
      console.log("❌ Validation failed — cannot save");
      return;
    }

    //  Validate Risk Level (1–5)
    if (riskLevel < 1 || riskLevel > 5) {
      Alert.alert("Invalid Risk Level", "Risk level must be between 1 and 5.");
      return;
    }

    //  Validate Liquidity Level (1–5)
    if (liquidityLevel < 1 || liquidityLevel > 5) {
      Alert.alert("Invalid Liquidity Level", "Liquidity level must be between 1 and 5.");
      return;
    }

    const parsedReturn = parseFloat(expectedReturn);

    //  Validate Color Code
    if (!colorCode) {
      Alert.alert("Missing Color", "Please pick a color for the method.");
      return;
    }

    // Validate Icon
    if (!iconName) {
      Alert.alert("Missing Icon", "Please select an icon.");
      return;
    }

    //  Validate Logged-in User
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    try {
      await initDB();

      await addSavingMethod(userId, {
        method_name: methodName.trim(),
        method_type: methodType,
        risk_level: riskLevel,
        liquidity_level: liquidityLevel,
        expected_return: parsedReturn,
        color_code: colorCode,
        icon_name: iconName,
        is_default: 0, // custom method
      });

      Alert.alert("Success", "Saving method added successfully!");
      navigation.goBack();

    } catch (error) {
      console.error("❌ Error adding saving method:", error);
      Alert.alert("Error", "Failed to add saving method. Please try again.");
    }
  };


  const getRiskDescription = (level) => {
    const descriptions = [
      "Very Low", "Low", "Medium", "High", "Very High"
    ];
    return descriptions[level - 1] || "Medium";
  };

  const getLiquidityDescription = (level) => {
    const descriptions = [
      "Very Low", "Low", "Medium", "High", "Very High"
    ];
    return descriptions[level - 1] || "Medium";
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Saving Method"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollContainer}>
        <FDSCard>
          {/* Method Name */}
          <FDSValidatedInput
            ref={nameRef}
            label="Method Name"
            value={methodName}
            onChangeText={setMethodName}
            placeholder="e.g., Cryptocurrency, Real Estate, Bonds"
            validate={(v) => v && v.trim().length > 0}
            errorMessage="Method name is required"
            icon={<Ionicons name="document-text-outline" size={18} color={FDSColors.textGray} />}
          />

          {/* Method Type */}
          <FDSValidatedPicker
            ref={typeRef}
            label="Method Type"
            value={methodType}
            validate={(v) => !!v}
            errorMessage="Please select a method type"
            icon={<Ionicons name="options-outline" size={18} color={FDSColors.textGray} />}
          >
            <Picker
              selectedValue={methodType}
              onValueChange={(v) => setMethodType(v)}
              style={{ position: "absolute", opacity: 0, width: "100%" }}
            >
              {methodTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </FDSValidatedPicker>

          {/* Risk Level */}
          <Text style={styles.label}>
            Risk Level: {getRiskDescription(riskLevel)} ({riskLevel}/5)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={riskLevel}
            onValueChange={setRiskLevel}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#E3F1E7"
            thumbTintColor="#FF6B6B"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Low Risk</Text>
            <Text style={styles.sliderLabel}>High Risk</Text>
          </View>

          {/* Liquidity Level */}
          <Text style={styles.label}>
            Liquidity Level: {getLiquidityDescription(liquidityLevel)} ({liquidityLevel}/5)
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={liquidityLevel}
            onValueChange={setLiquidityLevel}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#E3F1E7"
            thumbTintColor="#4CAF50"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Low Liquidity</Text>
            <Text style={styles.sliderLabel}>High Liquidity</Text>
          </View>

          {/* Expected Return */}
          <FDSValidatedInput
            ref={returnRef}
            label="Expected Annual Return (%)"
            value={expectedReturn}
            onChangeText={setExpectedReturn}
            keyboardType="numeric"
            validate={(v) => v && !isNaN(v) && parseFloat(v) > 0}
            errorMessage="Please enter a valid return percentage"
            icon={<Ionicons name="trending-up-outline" size={18} color={FDSColors.textGray} />}
            placeholder="e.g. 5.0"
          />


          {/* Icon Selection */}
          <Text style={styles.label}>Select Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
            {iconOptions.map(icon => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconOption,
                  iconName === icon && styles.iconOptionSelected
                ]}
                onPress={() => setIconName(icon)}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color Selection */}
          <Text style={styles.label}>Select Color</Text>
          <View style={styles.colorGrid}>
            {colorOptions.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  colorCode === color && styles.colorOptionSelected
                ]}
                onPress={() => setColorCode(color)}
              />
            ))}
          </View>

          {/* Preview */}
          <Text style={styles.label}>Preview</Text>
          <View style={[styles.previewCard, { borderLeftColor: colorCode }]}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewIcon}>{iconName}</Text>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{methodName || "Your Method"}</Text>
                <Text style={styles.previewType}>
                  {methodTypes.find(t => t.value === methodType)?.label || "Type"}
                </Text>
              </View>
            </View>
            <View style={styles.previewDetails}>
              <Text style={styles.previewDetail}>
                📈 Return: {expectedReturn || "0"}%
              </Text>
              <Text style={styles.previewDetail}>
                🎯 Risk: {"⭐".repeat(riskLevel) + "☆".repeat(5 - riskLevel)}
              </Text>
              <Text style={styles.previewDetail}>
                💰 Liquidity: {"💧".repeat(liquidityLevel) + "○".repeat(5 - liquidityLevel)}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <FDSButton
            title="Save Saving Method"
            icon="save-outline"
            onPress={handleAddMethod}
          />

        </FDSCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E3F1E7",
  },
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3F1E7",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  slider: {
    height: 40,
    marginVertical: 8,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#666",
  },
  iconScroll: {
    marginBottom: 16,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionSelected: {
    borderColor: "#8AD0AB",
    backgroundColor: "#E3F1E7",
  },
  iconText: {
    fontSize: 20,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#333",
    transform: [{ scale: 1.1 }],
  },
  previewCard: {
    backgroundColor: "#F8FDF9",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  previewIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E5E4E",
  },
  previewType: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
    marginTop: 2,
  },
  previewDetails: {
    marginLeft: 36,
  },
  previewDetail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#2E5E4E",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});