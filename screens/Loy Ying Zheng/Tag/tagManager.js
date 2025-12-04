import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import {
  getTagsLocal,
  addTagLocal,
  deleteTagLocal,
  createTagTable,
} from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";
import ValidatedInput from "../../reuseComponet/ValidatedInput";

export default function TagManager({ route, navigation }) {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isEssential, setIsEssential] = useState(true);
  const [editingTag, setEditingTag] = useState(null);

  const { userId } = useUser();
  const tagInputRef = useRef(null);

  // Load initial tag list
  useEffect(() => {
    if (userId) loadTags();
  }, [userId]);

  // Pre-fill form when editing existing tag
  useEffect(() => {
    if (route.params?.tag) {
      const tag = route.params.tag;
      setEditingTag(tag);
      setNewTag(tag.name);
      setIsEssential(tag.essentialityLabel === 1);
    }
  }, [route.params]);

  const loadTags = async () => {
    try {
      await createTagTable();
      const data = await getTagsLocal(userId);
      setTags(data);
    } catch (error) {
      console.error("❌ loadTags error:", error);
    }
  };

  const handleSaveTag = async () => {
    const trimmed = newTag.trim();

    // 1️⃣ Empty validation
    if (!trimmed) {
      tagInputRef.current?.shake();
      tagInputRef.current?.setError(true);
      return Alert.alert("Missing Tag Name", "Please enter a tag name.");
    }

    // 2️⃣ Duplicate validation
    const lower = trimmed.toLowerCase();
    const existing = tags.map((t) => t.name.trim().toLowerCase());

    if (!editingTag && existing.includes(lower)) {
      tagInputRef.current?.shake();
      tagInputRef.current?.setError(true);
      return Alert.alert("Duplicate Tag", "This tag name already exists.");
    }

    try {
      if (editingTag) {
        // Update existing tag
        await addTagLocal(
          userId,
          trimmed,
          isEssential ? 1 : 0,
          editingTag.id,
          true // update mode
        );
        Alert.alert("Updated", "Tag updated successfully.");
      } else {
        // Create new tag
        await addTagLocal(userId, trimmed, isEssential ? 1 : 0);
        Alert.alert("Success", "Tag added successfully!");
      }

      setNewTag("");
      setIsEssential(true);
      setEditingTag(null);
      loadTags();
    } catch (err) {
      Alert.alert("Error", "Failed to save tag.");
      console.error("handleSaveTag error:", err);
    }
  };

  const handleDeleteTag = (id) => {
    Alert.alert("Delete Tag", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTagLocal(userId, id);
          loadTags();
        },
      },
    ]);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setNewTag(tag.name);
    setIsEssential(tag.essentialityLabel === 1);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Tags"
        showLeftButton
        onLeftPress={() => navigation.goBack()}
      />

      {/* Input Section */}
      <View style={styles.inputSection}>
        <ValidatedInput
          ref={tagInputRef}
          label={editingTag ? "Edit Tag Name" : "New Tag Name"}
          value={newTag}
          onChangeText={setNewTag}
          placeholder="Enter tag name"
          placeholderTextColor={"#c5c5c5ff"}
          validate={(v) => v.trim().length > 0}
          errorMessage="Tag name cannot be empty"
          icon={<Ionicons name="pricetag-outline" size={20} color="#6c757d" />}
        />

        {/* Essentiality Toggle */}
        <Text style={styles.label}>Essentiality</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isEssential && styles.toggleButtonActive]}
            onPress={() => setIsEssential(true)}
          >
            <Text
              style={[
                styles.toggleText,
                isEssential && styles.toggleTextActive,
              ]}
            >
              Essential
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              !isEssential && styles.toggleButtonActive,
            ]}
            onPress={() => setIsEssential(false)}
          >
            <Text
              style={[
                styles.toggleText,
                !isEssential && styles.toggleTextActive,
              ]}
            >
              Non-Essential
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveTag}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>
              {editingTag ? "Update Tag" : "Add Tag"}
            </Text>
          </TouchableOpacity>

          {editingTag && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingTag(null);
                setNewTag("");
                setIsEssential(true);
              }}
            >
              <Ionicons name="close-outline" size={18} color="#333" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tag List */}
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tagCard}
            onPress={() => handleEdit(item)}
          >
            <View style={styles.leftBar(item.essentialityLabel)} />

            <View style={styles.tagInfo}>
              <Text style={styles.tagName}>{item.name}</Text>
              <Text style={styles.tagType}>
                {item.essentialityLabel === 1
                  ? "Essential"
                  : "Non-Essential"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDeleteTag(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#e53935" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tags yet. Add one above.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
  inputSection: {
    backgroundColor: "#fff",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  label: { marginTop: 12, marginBottom: 6, fontSize: 14, fontWeight: "600" },
  toggleContainer: { flexDirection: "row", marginBottom: 16 },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    marginRight: 6,
    alignItems: "center",
  },
  toggleButtonActive: { backgroundColor: "#8AD0AB" },
  toggleText: { color: "#2E5E4E" },
  toggleTextActive: { color: "#fff", fontWeight: "600" },
  buttonRow: { flexDirection: "row", alignItems: "center" },
  saveButton: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "#8AD0AB",
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#ddd",
    paddingVertical: 10,
    marginLeft: 10,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  cancelButtonText: { color: "#333", marginLeft: 6 },
  tagCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    elevation: 2,
  },
  leftBar: (label) => ({
    width: 8,
    height: "100%",
    backgroundColor: label === 1 ? "#4CAF50" : "#E53935",
    borderRadius: 4,
  }),
  tagInfo: { flex: 1, marginLeft: 12 },
  tagName: { fontSize: 15, fontWeight: "600" },
  tagType: { fontSize: 13, color: "#777" },
  iconButton: { paddingRight: 8 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#888",
  },
});
