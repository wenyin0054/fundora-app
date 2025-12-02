import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { addTagLocal, getTagsLocal } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext"; 

export default function AddTag({ navigation, route }) {
  const [tagName, setTagName] = useState("");
  const [essentiality, setEssentiality] = useState(null);
  const [existingTags, setExistingTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { userId, isLoading: userLoading } = useUser(); 
  const { onTagAdded } = route.params || {};

  useEffect(() => {
    if (userId) {
      fetchTags();
    }
  }, [userId]);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const tags = await getTagsLocal(userId);
      setExistingTags(tags.map(t => t.name.toLowerCase()));
    } catch (error) {
      console.error("Error fetching tags:", error);
      Alert.alert("Error", "Failed to load existing tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!tagName || essentiality === null) {
      Alert.alert("Missing info", "Please fill in all fields.");
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
        `The tag "${tagName}" already exists. Do you want to manage existing tags?`,
        [
          { text: "No", onPress: () => console.log("Enter unique name"), style: "cancel" },
          { text: "Yes", onPress: () => navigation.navigate("TagManagerScreen") }
        ]
      );
      return;
    }

    try {
      await addTagLocal(userId, tagName, essentiality);
      Alert.alert("✅ Success", "Tag added successfully!");
      if (onTagAdded) {
        onTagAdded(tagName);
      }
      navigation.goBack();
    } catch (error) {
      console.error("❌ Add tag error:", error);
      Alert.alert("Error", "Failed to add tag. Try again.");
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
          title="Add New Tag"
          showLeftButton={true}
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to add tags</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add New Tag"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Tag Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter tag name (e.g. Food)"
          value={tagName}
          onChangeText={setTagName}
        />

        <Text style={styles.label}>Essentiality</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.optionBtn, essentiality === 1 && styles.optionActive]}
            onPress={() => setEssentiality(1)}
          >
            <Text style={[styles.optionText, essentiality === 1 && styles.optionTextActive]}>
              Essential
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, essentiality === 0 && styles.optionActive]}
            onPress={() => setEssentiality(0)}
          >
            <Text style={[styles.optionText, essentiality === 0 && styles.optionTextActive]}>
              Non-Essential
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[
            styles.saveBtn, 
            (isLoading || !tagName || essentiality === null) && styles.saveBtnDisabled
          ]} 
          onPress={handleAddTag}
          disabled={isLoading || !tagName || essentiality === null}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Save Tag</Text>
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
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 6 
  },
  optionBtn: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionActive: { 
    backgroundColor: "#8AD0AB" 
  },
  optionText: { 
    color: "#2E5E4E", 
    fontSize: 14 
  },
  optionTextActive: { 
    color: "#fff", 
    fontWeight: "600" 
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#8AD0AB",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
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