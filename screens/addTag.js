import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "./reuseComponet/header";
import { addTagLocal, getTagsLocal } from "../database/SQLite"; // Assume getTagsLocal fetches all existing tags

export default function AddTag({ navigation }) {
  const [tagName, setTagName] = useState("");
  const [essentiality, setEssentiality] = useState(null);
  const [existingTags, setExistingTags] = useState([]);
  const userId = "U000001"; // Replace with actual user ID logic

  useEffect(() => {
    // Load existing tags from DB
    const fetchTags = async () => {
      try {
        const tags = await getTagsLocal(userId); // returns array of { id, name, essentialityLabel }
        setExistingTags(tags.map(t => t.name.toLowerCase()));
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };
    fetchTags();
  }, []);

  const handleAddTag = async () => {
    if (!tagName || essentiality === null) {
      Alert.alert("Missing info", "Please fill in all fields.");
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
      navigation.goBack();
    } catch (error) {
      console.error("❌ Add tag error:", error);
      Alert.alert("Error", "Failed to add tag. Try again.");
    }
  };

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

        <TouchableOpacity style={styles.saveBtn} onPress={handleAddTag}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>Save Tag</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
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
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, color: "#333" },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    fontSize: 14,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
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
  optionActive: { backgroundColor: "#8AD0AB" },
  optionText: { color: "#2E5E4E", fontSize: 14 },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#8AD0AB",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  saveText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
});
