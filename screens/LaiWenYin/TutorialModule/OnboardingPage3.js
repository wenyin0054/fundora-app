import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { updateUserOnboardingInfo,completeOnboarding } from "../../../database/userAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function OnboardingPage3({ navigation }) {
  const [incomeRange, setIncomeRange] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [occupation, setOccupation] = useState("");
  const [customOccupation, setCustomOccupation] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user from AsyncStorage when screen opens
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("currentUser");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          console.log("✅ Loaded current user:", parsedUser);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    fetchUser();
  }, []);

  const mapIncomeRangeToValue = (range) => {
  switch (range) {
    case "<2000": return 1500;
    case "2000-4000": return 3000;
    case "4001-6000": return 5000;
    case "6001-8000": return 7000;
    case ">8000": return 9000;
    default: return 0;
  }
};

const handleFinish = async () => {
  const finalOccupation =
    occupation === "Other" ? customOccupation.trim() : occupation;

  if (!incomeRange || !ageRange || !finalOccupation) {
    Alert.alert("Missing Info", "Please fill in all the fields.");
    return;
  }

  if (!currentUser?.userId) {
    Alert.alert("Error", "User not found. Please log in again.");
    return;
  }

  try {
    console.log("💾 Saving onboarding info for userId:", currentUser.userId);

    // Convert income range → numeric REAL value
    const numericIncome = mapIncomeRangeToValue(incomeRange);

    await updateUserOnboardingInfo(
      currentUser.userId,
      ageRange,
      numericIncome,
      finalOccupation
    );

    // Mark onboarding as completed
    await completeOnboarding(currentUser.userId);

    Alert.alert("✅ Success", "Your information has been saved!");
    navigation.replace("MainApp");
  } catch (error) {
    console.error("Error saving onboarding info:", error);
    Alert.alert("Error", "Failed to save your details. Please try again.");
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.textContainer}>
          <Text style={styles.heading}>Fill In Details</Text>

          {/* AGE PICKER */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age Range</Text>
            <Picker
              selectedValue={ageRange}
              style={styles.picker}
              onValueChange={(value) => setAgeRange(value)}
            >
              <Picker.Item label="Select age range" value="" />
              <Picker.Item label="18 - 25" value="18-25" />
              <Picker.Item label="26 - 35" value="26-35" />
              <Picker.Item label="36 - 45" value="36-45" />
              <Picker.Item label="46 - 55" value="46-55" />
              <Picker.Item label="56 and above" value="56+" />
            </Picker>
          </View>

          {/* INCOME PICKER */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Monthly Income (RM)</Text>
            <Picker
              selectedValue={incomeRange}
              style={styles.picker}
              onValueChange={(value) => setIncomeRange(value)}
            >
              <Picker.Item label="Select income range" value="" />
              <Picker.Item label="Below RM2000" value="<2000" />
              <Picker.Item label="RM2000 - RM4000" value="2000-4000" />
              <Picker.Item label="RM4001 - RM6000" value="4001-6000" />
              <Picker.Item label="RM6001 - RM8000" value="6001-8000" />
              <Picker.Item label="Above RM8000" value=">8000" />
            </Picker>
          </View>

          {/* OCCUPATION PICKER */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Occupation</Text>
            <Picker
              selectedValue={occupation}
              style={styles.picker}
              onValueChange={(value) => setOccupation(value)}
            >
              <Picker.Item label="Select occupation" value="" />
              <Picker.Item label="Student" value="Student" />
              <Picker.Item label="Employed" value="Employed" />
              <Picker.Item label="Self-employed" value="Self-employed" />
              <Picker.Item label="Unemployed" value="Unemployed" />
              <Picker.Item label="Retired" value="Retired" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          {/* IF OTHER, SHOW TEXT INPUT */}
          {occupation === "Other" && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Please specify</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your occupation"
                placeholderTextColor={"#c5c5c5ff"}
                value={customOccupation}
                onChangeText={setCustomOccupation}
              />
            </View>
          )}
        </View>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, { backgroundColor: "#57C0A1" }]} />
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.nextButton} onPress={handleFinish}>
        <Text style={styles.nextButtonText}>Finish</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#F9FEFC",
    borderRadius: 16,
    paddingBottom: 20,
    marginTop: 20,
    width: width * 0.9,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  textContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334056",
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: "#9CA3AF",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#F3F4F6",
    height: 60,
    color: "#111827",
  },
  picker: {
    height: 50,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
  },
  nextButton: {
    backgroundColor: "#57C0A1",
    width: width * 0.85,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});