import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../../reuseComponet/header";
import { addGoalLocal, initDB, isGoalNameDuplicate } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";
import {
  FDSCard,
  FDSValidatedInput,
  FDSLabel,
  FDSButton,
  FDSColors
} from "../../reuseComponet/DesignSystem";


export default function AddGoalScreen({ navigation }) {
  const [projectName, setProjectName] = useState("");
  const [savingAmount, setSavingAmount] = useState("");
  const [currentSaved, setCurrentSaved] = useState("0");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [remark, setRemark] = useState("");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const goalNameRef = useRef(null);
  const savingAmountRef = useRef(null);

  const { userId } = useUser();

  // -----------------------------------------
  // SAVE GOAL
  // -----------------------------------------
  const handleSave = async () => {
    console.log("🔥 Saving goal...");

    // Local input validation (from ValidatedInput)
    const validGoalName = goalNameRef.current?.validate();
    const validAmount = savingAmountRef.current?.validate();

    if (!validGoalName || !validAmount) {
      return; // error already shown
    }

    // Duplicate name check
    const isDuplicate = await isGoalNameDuplicate(userId, projectName.trim());
    if (isDuplicate) {
      goalNameRef.current?.shake();
      goalNameRef.current?.setError(true);
      return Alert.alert("Duplicate Goal Name", "A goal with this name already exists.");
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return Alert.alert(
        "Invalid End Date",
        "End Date must be later than the Start Date."
      );
    }


    // User selection validation
    if (!endDate) {
      return Alert.alert("Missing End Date", "Please select your goal end date.");
    }

    if (!userId) {
      return Alert.alert("Error", "User not logged in");
    }

    try {
      await initDB();

      await addGoalLocal(
        userId,
        projectName.trim(),                // goal name
        remark || "",                      // remark
        parseFloat(savingAmount),          // target amount
        parseFloat(currentSaved || 0),     // current saved
        endDate.toISOString().split("T")[0] // YYYY-MM-DD
      );

      console.log("💾 Goal saved!");
      Alert.alert("Success", "Goal saved successfully!");
      navigation.goBack();

    } catch (error) {
      console.error("❌ Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal. Please try again.");
    }
  };
  const formatDateDMY = (date) => {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};


  // -----------------------------------------
  // RENDER UI
  // -----------------------------------------
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
        <FDSCard>
          {/* Project Name */}
          <FDSValidatedInput
            ref={goalNameRef}
            label="Project Name"
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Enter goal name"
            validate={(v) => v && v.trim().length > 0}
            errorMessage="Goal name cannot be empty"
            icon={<Ionicons name="clipboard-outline" size={18} color={FDSColors.textGray} />}
          />


          {/* Saving Amount */}
          <FDSValidatedInput
            ref={savingAmountRef}
            label="Saving Amount (RM)"
            value={savingAmount}
            onChangeText={setSavingAmount}
            placeholder="Enter target amount"
            keyboardType="numeric"
            validate={(v) => v && !isNaN(v) && Number(v) > 0}
            errorMessage="Please enter a valid amount"
            icon={<Ionicons name="cash-outline" size={18} color={FDSColors.textGray} />}
          />

          {/* Start Date */}
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#6c757d" />
<Text style={styles.dateText}>{formatDateDMY(startDate)}</Text>
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
            <Text style={styles.dateText}>{formatDateDMY(endDate)}</Text>
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
            placeholder="Optional"
            placeholderTextColor={"#c5c5c5ff"}
          />

          {/* Save Button */}
          <FDSButton
            title="Save Goal"
            icon="save-outline"
            onPress={handleSave}
          />
        </FDSCard>
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
    height: 100,
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
