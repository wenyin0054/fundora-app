import React, { useState, useEffect } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { getSavingMethods, initDB } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";

export default function SavingMethodListScreen({ navigation }) {
  const [savingMethods, setSavingMethods] = useState([]);
  const { userId } = useUser(); 

  useFocusEffect(
    useCallback(() => {
      loadSavingMethods();
    }, [])
  );

  const loadSavingMethods = async () => {
    try {
      await initDB();
      const methods = await getSavingMethods(userId);
      setSavingMethods(methods);
    } catch (error) {
      console.error("❌ Error loading saving methods:", error);
    }
  };

  const handleMethodPress = (method) => {
    if (method.is_default) {
      Alert.alert(
        "Default Method",
        "This is a default saving method and cannot be edited.",
        [{ text: "OK" }]
      );
    } else {
      navigation.navigate("SavingMethodDetail", {
        method: method,
      });
    }
  };

  const getRiskStars = (riskLevel) => {
    return "⭐".repeat(riskLevel) + "☆".repeat(5 - riskLevel);
  };

  const getLiquidityBars = (liquidityLevel) => {
    return "💧".repeat(liquidityLevel) + "○".repeat(5 - liquidityLevel);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Saving Methods"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Available Saving Methods</Text>

        {/* Default Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Default Methods</Text>
          {savingMethods
            .filter(method => method.is_default)
            .map(method => (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, styles.defaultCard]}
                onPress={() => handleMethodPress(method)}
              >
                <View style={styles.methodHeader}>
                  <Text style={styles.methodIcon}>{method.icon_name}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.method_name}</Text>
                    <Text style={styles.methodType}>{method.method_type}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={16} color="#999" />
                </View>

                <View style={styles.methodDetails}>
                  <Text style={styles.detailText}>
                    📈 Return: {method.expected_return}%
                  </Text>
                  <Text style={styles.detailText}>
                    🎯 Risk: {getRiskStars(method.risk_level)}
                  </Text>
                  <Text style={styles.detailText}>
                    💰 Liquidity: {getLiquidityBars(method.liquidity_level)}
                  </Text>
                </View>

                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>

        {/* Custom Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Your Custom Methods</Text>
          {savingMethods
            .filter(method => !method.is_default)
            .map(method => (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodCard, styles.customCard]}
                onPress={() => handleMethodPress(method)}
              >
                <View style={styles.methodHeader}>
                  <Text style={styles.methodIcon}>{method.icon_name}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.method_name}</Text>
                    <Text style={styles.methodType}>{method.method_type}</Text>
                  </View>
                  <Ionicons name="create-outline" size={16} color="#2E5E4E" />
                </View>

                <View style={styles.methodDetails}>
                  <Text style={styles.detailText}>
                    📈 Return: {method.expected_return}%
                  </Text>
                  <Text style={styles.detailText}>
                    🎯 Risk: {getRiskStars(method.risk_level)}
                  </Text>
                  <Text style={styles.detailText}>
                    💰 Liquidity: {getLiquidityBars(method.liquidity_level)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

          {savingMethods.filter(method => !method.is_default).length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="add-circle-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No custom methods yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first custom saving method
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add New Method Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddSavingMethod")}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Saving Method</Text>
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E5E4E",
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 12,
  },
  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  defaultCard: {
    borderColor: "#E3F1E7",
    position: "relative",
  },
  customCard: {
    borderColor: "#8AD0AB",
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E5E4E",
  },
  methodType: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
    marginTop: 2,
  },
  methodDetails: {
    marginLeft: 36, // align with method name
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  defaultBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3F1E7",
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#2E5E4E",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});