import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { getEventTagsLocal, addEventTagLocal, createEventTagTable, initDB } from "../../../database/SQLite ";

export default function AddEventTag({ navigation }) {
  const [tagName, setTagName] = useState("");
  const [description, setDescription] = useState("");
  const [existingTags, setExistingTags] = useState([]);
  const userId = "U000001"; // 🔒 Replace with real user ID later

  useEffect(() => {
    const fetchEventTags = async () => {
      try {
        // ✅ Make sure DB and table exist
        await initDB();
        await createEventTagTable();

        // ✅ Load all existing tags to check for duplicates
        const tags = await getEventTagsLocal();
        setExistingTags(tags.map((t) => t.name.toLowerCase()));
      } catch (error) {
        console.error("❌ Error fetching event tags:", error);
      }
    };
    fetchEventTags();
  }, []);

  const handleAddEventTag = async () => {
    if (!tagName.trim()) {
      Alert.alert("Missing Info", "Please enter an event tag name.");
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
      await addEventTagLocal(userId, tagName.trim(), description.trim());
      Alert.alert("✅ Success", "Event tag added successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("❌ AddEventTag error:", error);
      Alert.alert("Error", "Failed to add event tag. Try again.");
    }
  };

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
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholder="Enter a short description (e.g. Family trip expenses)"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleAddEventTag}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>Save Event Tag</Text>
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
