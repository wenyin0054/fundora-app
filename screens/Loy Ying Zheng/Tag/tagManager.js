import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getTagsLocal, addTagLocal, createTagTable, deleteTagLocal } from "../../../database/SQLite";
import AppHeader from "../../reuseComponet/header";
import db from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";

export default function TagManager({ route, navigation }) {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isEssential, setIsEssential] = useState(true);
  const [editingTag, setEditingTag] = useState(null);

  const { userId } = useUser(); 
  const { tag } = route.params || {};

  // 🧠 Load Tags
  const loadTags = async () => {
    try {
      await createTagTable();
      const data = await getTagsLocal();
      setTags(data);
    } catch (error) {
      console.error("❌ loadTags error:", error);
    }
  };

  // ⚙️ Preload tag if navigated from another screen
  useEffect(() => {
    if (tag) {
      setEditingTag(tag);
      setNewTag(tag.name);
      setIsEssential(tag.essentialityLabel === 1);
    }
  }, [tag]);

  useEffect(() => {
    loadTags();
  }, []);

  // ➕ Add or Update Tag
  const handleSaveTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) {
      Alert.alert("⚠️ Empty Name", "Please enter a tag name.");
      return;
    }

    try {
      if (editingTag) {
        await db.runAsync(
          `UPDATE tags SET name = ?, essentialityLabel = ? WHERE id = ?`,
          [trimmed, isEssential ? 1 : 0, editingTag.id]
        );
        Alert.alert("✅ Updated", "Tag updated successfully!");
      } else {
        await addTagLocal(userId, trimmed, isEssential ? 1 : 0);
        Alert.alert("✅ Added", "New tag added successfully!");
      }

      setNewTag("");
      setIsEssential(true);
      setEditingTag(null);
      loadTags();
    } catch (error) {
      Alert.alert("❌ Error", "Failed to save tag.");
      console.error("handleSaveTag error:", error);
    }
  };

  // ❌ Cancel edit
  const handleCancelEdit = () => {
    setEditingTag(null);
    setNewTag("");
    setIsEssential(true);
  };

  // 🗑️ Delete Tag
  const handleDeleteTag = (id) => {
    Alert.alert("Confirm Delete", "Are you sure to delete this tag?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTagLocal(id);
          await loadTags();
        },
      },
    ]);
  };

  // ✏️ Edit Mode
  const handleEdit = (tag) => {
    setEditingTag(tag);
    setNewTag(tag.name);
    setIsEssential(tag.essentialityLabel === 1);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Tags"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      {/* Add/Edit Section */}
      <View style={styles.inputSection}>
        <TextInput
          placeholder="Enter tag name"
          value={newTag}
          onChangeText={setNewTag}
          style={styles.input}
        />

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isEssential && styles.toggleButtonActive,
            ]}
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

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, { flex: editingTag ? 0.7 : 1 }]}
            onPress={handleSaveTag}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>
              {editingTag ? "Update Tag" : "Add Tag"}
            </Text>
          </TouchableOpacity>

          {editingTag && (
            <TouchableOpacity
              style={[styles.cancelButton, { flex: 0.3 }]}
              onPress={handleCancelEdit}
            >
              <Ionicons name="close-outline" size={18} color="#555" />
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
            onPress={() => handleEdit(item)} // 👈 tap card to edit
          >
            <View style={styles.leftBar(item.essentialityLabel)} />
            <View style={styles.tagInfo}>
              <Text style={styles.tagName}>{item.name}</Text>
              <Text style={styles.tagType}>
                {item.essentialityLabel === 1 ? "Essential" : "Non-Essential"}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handleEdit(item)}
                style={styles.iconButton}
              >
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteTag(item.id)}
                style={styles.iconButton}
              >
                <Ionicons name="trash-outline" size={18} color="#e53935" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tags yet. Add your first one!</Text>
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb", padding: 16 },
  inputSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  toggleButtonActive: { backgroundColor: "#8AD0AB" },
  toggleText: { color: "#2E5E4E", fontSize: 14 },
  toggleTextActive: { color: "#fff", fontWeight: "600" },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveButton: {
    flexDirection: "row",
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
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  cancelButtonText: { color: "#333", fontWeight: "500", marginLeft: 6 },
  tagCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    overflow: "hidden",
  },
  leftBar: (essentialityLabel) => ({
    width: 8,
    height: "100%",
    backgroundColor: essentialityLabel === 1 ? "#4CAF50" : "#E53935",
  }),
  tagInfo: { flex: 1, padding: 10 },
  tagName: { fontSize: 15, fontWeight: "600", color: "#333" },
  tagType: { fontSize: 13, color: "#777" },
  actionButtons: { flexDirection: "row", paddingHorizontal: 8 },
  iconButton: { marginHorizontal: 6 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
});
