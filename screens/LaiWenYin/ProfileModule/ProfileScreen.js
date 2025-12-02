import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserById, updateUserProfile, logUserTable } from "../../../database/userAuth";
import { Picker } from "@react-native-picker/picker";

export default function ProfileScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [occupation, setOccupation] = useState("");
  const [goals, setGoals] = useState("");
  const [dailyQuiz, setDailyQuiz] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [budgetCategory, setBudgetCategory] = useState("Food & Groceries");
  const [userLevel, setUserLevel] = useState("");
  useEffect(() => {
    fetchUserData();
    logUserTable();
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload images.');
    }
  };

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const storedUser = await AsyncStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        const userFromDB = await getUserById(parsedUser.userId);
        if (userFromDB) {
          populateForm(userFromDB);
          // Load profile image if exists
          if (userFromDB.profileImage) {
            setProfileImage(userFromDB.profileImage);
          }
        } else {
          populateForm(parsedUser);
        }
      } else {
        Alert.alert("Error", "Please login first.");
        navigation.navigate("Login");
      }
    } catch (error) {
      console.error("Error loading user:", error);
      Alert.alert("Error", "Failed to load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (userData) => {
    setUserLevel(userData.levelOfExperience || "Beginner");
    setFullName(userData.username || "");
    setAge(userData.age ? userData.age.toString() : "");
    setIncome(userData.monthlyIncome ? `RM ${userData.monthlyIncome}` : "RM 0");
    setOccupation(userData.occupation || "");
    setGoals(
      userData.goals ||
      "Saving for a first home down payment, building an emergency fund, and investing in a retirement plan."
    );

    setBudgetCategory(userData.budgetCategory || "Food & Groceries");
    setDailyQuiz(Boolean(Number(userData.dailyQuiz)));

    console.log(dailyQuiz);

    setProfileImage(userData.profileImage || null);
  };



  const pickImage = async () => {
    if (!isEditing) return;

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const takePhoto = async () => {
    if (!isEditing) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo.");
    }
  };

  const handleSave = async () => {
    if (!currentUser) return Alert.alert("Error", "No user data found.");
    if (!fullName.trim())
      return Alert.alert("Error", "Please enter your full name.");

    setIsLoading(true);
    try {
      const incomeValue = income.replace("RM ", "").replace(/,/g, "");
      const ageValue = parseInt(age) || 0;

      await updateUserProfile(
        currentUser.userId,
        fullName.trim(),
        ageValue,
        parseFloat(incomeValue) || 0,
        goals.trim(),
        occupation.trim(),
        budgetCategory,
        dailyQuiz,
        profileImage // Save profile image URI
      );

      const updatedUser = {
        ...currentUser,
        username: fullName.trim(),
        age: ageValue,
        monthlyIncome: parseFloat(incomeValue) || 0,
        goals: goals.trim(),
        occupation: occupation.trim(),
        dailyQuiz: dailyQuiz,
        profileImage: profileImage,
      };

      await AsyncStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("currentUser");
          navigation.navigate("Login");
        },
      },
    ]);
  };

  const handleCancelEdit = () => {
    if (currentUser) populateForm(currentUser);
    setIsEditing(false);
  };

  const showImageOptions = () => {
    if (!isEditing) return;

    Alert.alert(
      "Change Profile Picture",
      "Choose an option",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (isLoading && !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#57C0A1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Experience Level */}
      <Text style={[
        styles.levelBadge,
        userLevel?.toLowerCase() === 'experienced user' ? styles.experiencedBadge : styles.beginnerBadge
      ]}>
        {userLevel ? `${userLevel}` : ' Beginner'}
      </Text>

      {/* Profile Image with Upload Option */}
      <View style={styles.profileImageContainer}>
        <TouchableOpacity onPress={showImageOptions} disabled={!isEditing}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require('../../../assets/default-avatar.png')
            }
            style={styles.profileImage}
          />
          {isEditing && (
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {isEditing && (
          <Text style={styles.editPhotoText}>Tap to change photo</Text>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name}>{fullName || "User Name"}</Text>

      {/* Personal Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Details</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          editable={isEditing}
        />

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          editable={isEditing}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Monthly Income (RM)</Text>
        <TextInput
          style={styles.input}
          value={income}
          onChangeText={setIncome}
          editable={isEditing}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Occupation</Text>
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          editable={isEditing}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Daily Quizzes</Text>
        <Switch
          value={dailyQuiz}
          onValueChange={setDailyQuiz}
          trackColor={{ false: "#ccc", true: "#57C0A1" }}
          thumbColor={dailyQuiz ? "#f4f3f4" : "#f4f3f4"}
          disabled={!isEditing}
        />
      </View>



      {/* Buttons */}
      {isEditing ? (
        <View style={styles.editButtonsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 10,
  },
  header: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 10,
  },
  levelBadge: {
    textAlign: "center",
    color: "rgba(4, 4, 4, 1)",
    fontWeight: "700",
    fontSize: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 10,
  },
  profileImageContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#57C0A1",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#57C0A1",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  editPhotoText: {
    marginTop: 8,
    fontSize: 12,
    color: "#57C0A1",
    fontWeight: "500",
  },
  name: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#444",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    fontSize: 15,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  editButton: {
    backgroundColor: "#57C0A1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#57C0A1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    borderColor: "#FF5A5F",
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  logoutText: {
    color: "#FF5A5F",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#57C0A1",
    fontSize: 16,
  },
  dropdownContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 15,
  },
  dropdown: {
    height: 50,
    paddingHorizontal: 10,
  },

});