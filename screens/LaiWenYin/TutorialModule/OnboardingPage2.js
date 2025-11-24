import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Alert, Dimensions 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateUserExperienceLevel,completeOnboarding } from "../../../database/userAuth";

const { width } = Dimensions.get("window");

export default function OnboardingPage2({ navigation }) {
  const [selected, setSelected] = useState("Beginner");
  const [isLoading, setIsLoading] = useState(false);
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

  // Handle "Next"
  const handleNext = async () => {
    if (!currentUser?.userId) {
      Alert.alert("Error", "User not found. Please log in again.");
      navigation.navigate("Login");
      return;
    }

    try {
      setIsLoading(true);
      console.log("💾 Saving experience level:", selected, "for user:", currentUser.userId);

      await updateUserExperienceLevel(currentUser.userId, selected);

      console.log("✅ Experience level saved successfully");
      navigation.navigate("OnboardingPage3");
    } catch (error) {
      console.error("Error saving experience level:", error);
      Alert.alert("Error", "Failed to save your selection. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
const handleSkip = async () => {
  try {
    console.log("⏭️ Skipping onboarding - marking as completed");
   await completeOnboarding(currentUser.userId);
    navigation.replace("MainTabs");
  } catch (error) {
    console.log("Error during skip:", error);
    navigation.replace("MainTabs");
  }
};
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../../assets/financialstart.jpg')}
          style={styles.image}
        />

        <View style={styles.textContainer}>
          <Text style={styles.heading}>Are You Beginner or Experienced User?</Text>
          
          <TouchableOpacity 
            style={[styles.option, selected === "Beginner" && styles.optionSelected]} 
            onPress={() => setSelected("Beginner")}
          >
            <Ionicons
              name={selected === "Beginner" ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={selected === "Beginner" ? "#57C0A1" : "#777"}
            />
            <Text style={[styles.optionText, selected === "Beginner" && styles.optionTextSelected]}>
              Beginner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.option, selected === "Experienced User" && styles.optionSelected]} 
            onPress={() => setSelected("Experienced User")}
          >
            <Ionicons
              name={selected === "Experienced User" ? "radio-button-on" : "radio-button-off"}
              size={22}
              color={selected === "Experienced User" ? "#57C0A1" : "#777"}
            />
            <Text style={[styles.optionText, selected === "Experienced User" && styles.optionTextSelected]}>
              Experienced User
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={[styles.dot, { backgroundColor: "#57C0A1" }]} />
        <View style={styles.dot} />
      </View>

      {/* Buttons */}
      <TouchableOpacity 
        style={[styles.nextButton, isLoading && styles.nextButtonDisabled]} 
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.nextButtonText}>{isLoading ? "Saving..." : "Next"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
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
    alignItems: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  optionSelected: {
    backgroundColor: "#E8F5F0",
  },
  optionText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#4B5563",
  },
  optionTextSelected: {
    color: "#57C0A1",
    fontWeight: "600",
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
  nextButtonDisabled: {
    backgroundColor: "#80D3B8",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  skipButton: {
    backgroundColor: "#F9FAFB",
    width: width * 0.85,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#111827",
    fontWeight: "500",
    fontSize: 16,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
  },
});