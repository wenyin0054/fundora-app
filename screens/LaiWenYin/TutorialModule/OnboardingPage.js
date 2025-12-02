import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {completeOnboarding } from "../../../database/userAuth";
const { width } = Dimensions.get("window");

export default function OnboardingScreen({ navigation }) {
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
  const handleGetStarted = async () => {
    try {
      await completeOnboarding(currentUser.userId);
      navigation.replace("MainApp");
    } catch (error) {
      console.log("Error saving onboarding flag:", error);
    }
  };
 
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../../assets/financialstart.jpg')}
          style={styles.image}
        />
        <View style={styles.textContainer}>
          <Text style={styles.heading}>Your Financial Journey Starts Here</Text>
          <Text style={styles.subtitle}>
            Welcome to Fundora, your personal finance companion. We help you
            track income, manage expenses, and achieve your savings goals
            effortlessly.
          </Text>
        </View>
      </View>

      {/* ✅ Pagination Dots */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, { backgroundColor: "#57C0A1" }]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* ✅ Buttons */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => navigation.navigate("OnboardingPage2")}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleGetStarted}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
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
    width: 342, // Fixed width
    height: 462, // Fixed height
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
    resizeMode: "cover",
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
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
});