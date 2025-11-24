import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function GoalDetailScreen({ navigation }) {
  const [projectName, setProjectName] = useState("Dream Home Down Payment");
  const [savingAmount, setSavingAmount] = useState("50000");
  const [currentSaved, setCurrentSaved] = useState("32500");
  const [startDate, setStartDate] = useState(new Date(2023, 1, 9));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 31));
  const [remark, setRemark] = useState(
    "Saving for a down payment on our first home."
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = () => {
    const goalData = {
      projectName,
      savingAmount,
      currentSaved,
      startDate,
      endDate,
      remark,
    };
    console.log("💾 Goal updated:", goalData);
    alert("✅ Changes saved successfully!");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Savings Planner</Text>

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
        <Text style={styles.dateText}>
          {startDate.toDateString().slice(4)}
        </Text>
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
        <Text style={styles.saveText}>Save Change</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 10,
    color: "#2e2e2e",
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
