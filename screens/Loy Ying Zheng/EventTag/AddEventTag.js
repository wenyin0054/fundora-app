import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import {
  addEventTagLocal,
  getEventTagsLocal,
  initDB,
  createEventTagTable,
} from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext"; 

export default function AddEventTag({ navigation }) {
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [existingTags, setExistingTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { userId, isLoading: userLoading } = useUser(); 

  useEffect(() => {
    if (userId) {
      fetchEventTags();
    }
  }, [userId]);

  const fetchEventTags = async () => {
    try {
      setIsLoading(true);
      // ✅ Make sure DB and table exist
      await initDB();
      await createEventTagTable();

      // ✅ Load all existing tags to check for duplicates
      const tags = await getEventTagsLocal(userId);
      setExistingTags(tags.map((t) => t.name.toLowerCase()));
    } catch (error) {
      console.error("❌ Error fetching event tags:", error);
      Alert.alert("Error", "Failed to load existing event tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEventTag = async () => {
    if (!tagName.trim()) {
      Alert.alert("Missing Info", "Please enter an event tag name.");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    const duplicate = existingTags.includes(tagName.trim().toLowerCase());
    if (duplicate) {
      Alert.alert(
        "Tag Exists",
        `The event tag "${tagName}" already exists.\nWould you like to manage it instead?`,
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            onPress: () => navigation.navigate("EventTagList"), // ✅ Direct user to tag list/manager
          },
        ]
      );
      return;
    }

    try {
      setIsLoading(true);
      await addEventTagLocal(userId, tagName.trim(), description.trim());
      Alert.alert("✅ Success", "Event tag added successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("❌ AddEventTag error:", error);
      Alert.alert("Error", "Failed to add event tag. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 加载状态处理
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  // 用户未登录处理
  if (!userId) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Add Event Tag"
          showLeftButton={true}
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to add event tags</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Event Tag"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Event Tag Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event tag name (e.g. Birthday, Trip)"
          value={tagName}
          onChangeText={setTagName}
          maxLength={50}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholder="Enter a short description (e.g. Family trip expenses)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        <TouchableOpacity 
          style={[
            styles.saveBtn, 
            (isLoading || !tagName.trim()) && styles.saveBtnDisabled
          ]} 
          onPress={handleAddEventTag}
          disabled={isLoading || !tagName.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Save Event Tag</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f9f9fb" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginTop: 12, 
    color: "#333" 
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#8AD0AB",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#8AD0AB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
  },
  saveText: { 
    color: "#fff", 
    fontWeight: "600", 
    marginLeft: 6 
  },
});