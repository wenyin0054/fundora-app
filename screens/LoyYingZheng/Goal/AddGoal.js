import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../../reuseComponet/header";
import { addGoalLocal, initDB } from "../../../database/SQLite ";

export default function AddGoalScreen({ navigation }) {
  const [projectName, setProjectName] = useState("");
  const [savingAmount, setSavingAmount] = useState("");
  const [currentSaved, setCurrentSaved] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [remark, setRemark] = useState("");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const userId = "U0000001"; // placeholder for your logged-in user

  const handleSave = async () => {
    // basic validation
    if (!projectName || !savingAmount || !endDate) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }

    try {
      initDB(); // ensure DB is initialized

      // save to local DB
      await addGoalLocal(
        userId,
        projectName,
        remark,
        parseFloat(savingAmount),
        parseFloat(currentSaved || 0),
        endDate.toISOString().split("T")[0] // store as YYYY-MM-DD
      );

      console.log("💾 Goal saved locally!");
      Alert.alert("✅ Success", "Goal saved to local database!");
      navigation.goBack();
    } catch (error) {
      console.error("❌ Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Set Goal"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      <ScrollView style={styles.container}>
        {/* Project Name */}
        <Text style={styles.label}>Project Name</Text>
        <View style={styles.inputRow}>
          <Ionicons name="clipboard-outline" size={20} color="#6c757d" />
          <TextInput
            value={projectName}
            onChangeText={setProjectName}
            style={styles.input}
            placeholder="Enter goal name"
          />
        </View>

        {/* Saving Amount */}
        <Text style={styles.label}>Saving Amount (RM)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="cash-outline" size={20} color="#6c757d" />
          <TextInput
            value={savingAmount}
            onChangeText={setSavingAmount}
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        {/* Current Saved */}
        <Text style={styles.label}>Current Saved Amount (RM)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="wallet-outline" size={20} color="#6c757d" />
          <TextInput
            value={currentSaved}
            onChangeText={setCurrentSaved}
            style={styles.input}
            keyboardType="numeric"
          />
        </View>

        {/* Start Date */}
        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowStartPicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#6c757d" />
          <Text style={styles.dateText}>{startDate.toDateString().slice(4)}</Text>
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {/* End Date */}
        <Text style={styles.label}>End Date</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowEndPicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#6c757d" />
          <Text style={styles.dateText}>{endDate.toDateString().slice(4)}</Text>
        </TouchableOpacity>

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Remark */}
        <Text style={styles.label}>Remark</Text>
        <TextInput
          style={styles.textArea}
          value={remark}
          onChangeText={setRemark}
          multiline
        />

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 45,
    marginLeft: 8,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  dateText: {
    marginLeft: 10,
    color: "#333",
  },
  textArea: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    height: 90,
    textAlignVertical: "top",
    padding: 10,
    fontSize: 14,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#9cd8b3",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
