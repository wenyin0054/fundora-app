import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "./reuseComponet/header";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { updateGoalLocal, deleteGoalLocal } from "../database/SQLite";

export default function GoalDetailScreen({ route, navigation }) {
  const { goal } = route.params;

  const [goalName, setGoalName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const progress =
    parseFloat(targetAmount) > 0
      ? Math.min(parseFloat(currentAmount) / parseFloat(targetAmount), 1)
      : 0;

  useEffect(() => {
    if (goal) {
      setGoalName(goal.goalName || goal.title || "");
      setDescription(goal.description || goal.desc || "");
      setTargetAmount(goal.targetAmount?.toString() || goal.target?.toString() || "");
      setCurrentAmount(goal.currentAmount?.toString() || goal.saved?.toString() || "");
      setDeadline(goal.deadline ? new Date(goal.deadline + "T00:00:00") : new Date());
    }
  }, [goal]);


  const handleSave = async () => {
    if (!goalName || !targetAmount || !currentAmount || !deadline) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      await updateGoalLocal(
        goal.id,
        goalName,
        description,
        parseFloat(targetAmount),
        parseFloat(currentAmount),
        deadline.toISOString().split("T")[0]
      );
      Alert.alert("Success", "Goal updated successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("❌ updateGoalLocal error:", error);
      Alert.alert("Error", "Failed to save goal. Check console for details.");
    }
  };

  // 🗑️ Delete function
  const handleDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoalLocal(goal.id);
              Alert.alert("Deleted", "Goal has been deleted successfully.");
              navigation.goBack();
            } catch (error) {
              console.error("❌ deleteGoalLocal error:", error);
              Alert.alert("Error", "Failed to delete goal.");
            }
          },
        },
      ]
    );
  };

  const renderProgressBar = (progress) => (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { flex: progress }]} />
      <Text style={styles.progressLable}>{(progress * 100).toFixed(1)}%</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Goal Detail"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.card}>
            {renderProgressBar(progress)}
            <Text style={[styles.label, { alignSelf: "center" }]}>Goal Progress</Text>

            {/* Goal Name */}
            <Text style={styles.label}>Goal Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="clipboard-outline" size={20} color="#6c757d" />
              <TextInput
                value={goalName}
                onChangeText={setGoalName}
                style={styles.input}
                placeholder="Enter goal name"
              />
            </View>

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Target Amount */}
            <Text style={styles.label}>Target Amount (RM)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={20} color="#6c757d" />
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                style={styles.input}
                keyboardType="numeric"
              />
            </View>

            {/* Current Amount */}
            <Text style={styles.label}>Current Saved Amount (RM)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="wallet-outline" size={20} color="#6c757d" />
              <TextInput
                value={currentAmount}
                onChangeText={setCurrentAmount}
                style={styles.input}
                keyboardType="numeric"
              />
            </View>

            {/* Deadline */}
            <Text style={styles.label}>Deadline</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#6c757d" />
              <Text style={styles.dateText}>{deadline.toDateString().slice(4)}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (date) setDeadline(date);
                }}
              />
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  label: { fontSize: 14, color: "#555", marginBottom: 5, marginTop: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: { flex: 1, height: 45, marginLeft: 8 },
  textArea: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    height: 90,
    textAlignVertical: "top",
    padding: 10,
    fontSize: 14,
    color: "#333",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  dateText: { marginLeft: 10, color: "#333" },
  saveButton: {
    backgroundColor: "#9cd8b3",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25,
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  deleteText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContainer: { padding: 20 },
  progressBar: {
    flexDirection: "row",
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    marginVertical: 6,
  },
  progressFill: { backgroundColor: "#8AD0AB" },
  progressLable: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
    color: "black",
    fontWeight: "600",
    fontFamily:
      Platform.OS === "android"
        ? "Inter_600SemiBold"
        : "HelveticaNeue-Medium",
  },
});
