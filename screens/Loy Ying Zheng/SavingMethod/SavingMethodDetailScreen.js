import React, { useState } from "react";
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
import { updateSavingMethod, deleteSavingMethod, initDB } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";

export default function SavingMethodDetailScreen({ navigation, route }) {
  const { method, onMethodUpdated } = route.params;

  const [methodName, setMethodName] = useState(method.method_name);
  const [methodType, setMethodType] = useState(method.method_type);
  const [riskLevel, setRiskLevel] = useState(method.risk_level);
  const [liquidityLevel, setLiquidityLevel] = useState(method.liquidity_level);
  const [expectedReturn, setExpectedReturn] = useState(method.expected_return.toString());
  const [colorCode, setColorCode] = useState(method.color_code);
  const [iconName, setIconName] = useState(method.icon_name);

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

const handleUpdateMethod = async () => {
  console.log("🔥 Updating saving method...");

  // 1️⃣ VALIDATION (STRICT & COMPLETE)
  if (!methodName || !methodName.trim()) {
    Alert.alert("Missing Name", "Please enter a method name.");
    return;
  }

  if (!methodType) {
    Alert.alert("Missing Type", "Please select a method type.");
    return;
  }

  if (riskLevel < 1 || riskLevel > 5) {
    Alert.alert("Invalid Risk Level", "Risk level must be between 1 and 5.");
    return;
  }

  if (liquidityLevel < 1 || liquidityLevel > 5) {
    Alert.alert("Invalid Liquidity Level", "Liquidity level must be between 1 and 5.");
    return;
  }

  if (!validateAmount(expectedReturn, "Expected Return")) return;

  const parsedReturn = parseFloat(expectedReturn);

  if (!colorCode) {
    Alert.alert("Missing Color", "Please pick a method color.");
    return;
  }

  if (!iconName) {
    Alert.alert("Missing Icon", "Please select an icon.");
    return;
  }

  if (!userId) {
    Alert.alert("Error", "User not logged in.");
    return;
  }

  // 2️⃣ NEW DATA OBJECT (after validation)
  const updatedData = {
    method_name: methodName.trim(),
    method_type: methodType,
    risk_level: riskLevel,
    liquidity_level: liquidityLevel,
    expected_return: parsedReturn,
    color_code: colorCode,
    icon_name: iconName,
  };

  // 3️⃣ ORIGINAL DATA OBJECT
  const originalData = {
    method_name: method.method_name,
    method_type: method.method_type,
    risk_level: method.risk_level,
    liquidity_level: method.liquidity_level,
    expected_return: method.expected_return,
    color_code: method.color_code,
    icon_name: method.icon_name,
  };

  // 4️⃣ CHECK IF ANYTHING CHANGED
  const isSame = JSON.stringify(updatedData) === JSON.stringify(originalData);

  if (isSame) {
    Alert.alert("No Changes", "You didn't modify any field.");
    return;
  }

  // 5️⃣ UPDATE DB
  try {
    await initDB();

    const success = await updateSavingMethod(userId, method.id, updatedData);

    if (success) {
      Alert.alert("Success", "Saving method updated successfully!");
      navigation.goBack();
    } else {
      Alert.alert("Error", "Failed to update saving method.");
    }

  } catch (error) {
    console.error("❌ updateSavingMethod error:", error);
    Alert.alert("Error", "Failed to update saving method.");
  }
};


  const handleDeleteMethod = () => {
    Alert.alert(
      "Delete Saving Method",
      `Are you sure you want to delete "${methodName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDeleteMethod,
        },
      ]
    );
  };

  const confirmDeleteMethod = async () => {
    try {
      await initDB();
      await deleteSavingMethod(userId, method.id);

      Alert.alert("✅ Success", "Saving method deleted successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("❌ Error deleting saving method:", error);
      if (error.message.includes("existing accounts")) {
        Alert.alert(
          "Cannot Delete",
          "This saving method has associated accounts. Please delete or reassign those accounts first."
        );
      } else {
        Alert.alert("Error", "Failed to delete saving method. Please try again.");
      }
    }
  };

  const getRiskDescription = (level) => {
    const descriptions = ["Very Low", "Low", "Medium", "High", "Very High"];
    return descriptions[level - 1] || "Medium";
  };

  const getLiquidityDescription = (level) => {
    const descriptions = ["Very Low", "Low", "Medium", "High", "Very High"];
    return descriptions[level - 1] || "Medium";
  };

  const hasChanges = () => {
    return (
      methodName !== method.method_name ||
      methodType !== method.method_type ||
      riskLevel !== method.risk_level ||
      liquidityLevel !== method.liquidity_level ||
      expectedReturn !== method.expected_return.toString() ||
      colorCode !== method.color_code ||
      iconName !== method.icon_name
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Saving Method"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.card}>
          {/* Method Name */}
          <Text style={styles.label}>Method Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Cryptocurrency, Real Estate, Bonds"
            value={methodName}
            onChangeText={setMethodName}
          />

          {/* Method Type */}
          <Text style={styles.label}>Method Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={methodType}
              onValueChange={setMethodType}
              style={styles.picker}
            >
              {methodTypes.map(type => (
                <Picker.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </Picker>
          </View>

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
            maximumTrackTinctColor="#E3F1E7"
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
            maximumTrackTinctColor="#E3F1E7"
            thumbTintColor="#4CAF50"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Low Liquidity</Text>
            <Text style={styles.sliderLabel}>High Liquidity</Text>
          </View>

          {/* Expected Return */}
          <Text style={styles.label}>Expected Annual Return (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5.0"
            value={expectedReturn}
            onChangeText={setExpectedReturn}
            keyboardType="numeric"
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.updateButton, !hasChanges() && styles.disabledButton]}
              onPress={handleUpdateMethod}
              disabled={!hasChanges()}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.updateButtonText}>Update Method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteMethod}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Method</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  buttonContainer: {
    marginTop: 20,
  },
  updateButton: {
    flexDirection: "row",
    backgroundColor: "#2E5E4E",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});