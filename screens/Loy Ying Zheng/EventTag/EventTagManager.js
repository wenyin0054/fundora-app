import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  deleteEventTagLocal,
  getEventTagsLocal,
  addEventTagLocal,
  createEventTagTable,
  updateEventTagLocal,
} from "../../../database/SQLite";
import AppHeader from "../../reuseComponet/header";
import { useUser } from "../../reuseComponet/UserContext"; // Import useUser

export default function EventTagManager({ route, navigation }) {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [description, setDescription] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { userId, isLoading: userLoading } = useUser(); // Use useUser to get userId
  const { tag } = route.params || {};

  // 🧠 Load Tags
  const loadTags = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      await createEventTagTable();
      const data = await getEventTagsLocal(userId);
      setTags(data);
    } catch (error) {
      console.error("❌ loadTags error:", error);
      Alert.alert("Error", "Failed to load event tags");
    } finally {
      setIsLoading(false);
    }
  };

  // ⚙️ Preload tag if navigated from another screen
  useEffect(() => {
    if (tag) {
      setEditingTag(tag);
      setNewTag(tag.name);
      setDescription(tag.description || "");
    }
  }, [tag]);

  useEffect(() => {
    if (userId) {
      loadTags();
    }
  }, [userId]);

  // ➕ Add or Update Tag
  const handleSaveTag = async () => {
    const trimmedName = newTag.trim();

    if (!trimmedName) {
      Alert.alert("⚠️ Empty Name", "Please enter a tag name.");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    try {
      setIsLoading(true);
      if (editingTag) {
        await updateEventTagLocal(editingTag.id, trimmedName, description.trim());
        Alert.alert("✅ Updated", "Tag updated successfully!");
      } else {
        await addEventTagLocal(userId, trimmedName, description.trim());
        Alert.alert("✅ Added", "New tag added successfully!");
      }

      setNewTag("");
      setDescription("");
      setEditingTag(null);
      await loadTags();
    } catch (error) {
      Alert.alert("❌ Error", "Failed to save tag.");
      console.error("handleSaveTag error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ Delete Tag
  const handleDeleteTag = (id) => {
    Alert.alert("Confirm Delete", "Are you sure to delete this tag?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEventTagLocal(id);
            await loadTags();
          } catch (error) {
            Alert.alert("Error", "Failed to delete tag");
          }
        },
      },
    ]);
  };

  // ✏️ Edit Tag
  const handleEdit = (tag) => {
    setEditingTag(tag);
    setNewTag(tag.name);
    setDescription(tag.description || "");
  };

  // ❌ Cancel Edit
  const handleCancelEdit = () => {
    setEditingTag(null);
    setNewTag("");
    setDescription("");
  };

  // Loading state handling
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  // User not logged in handling
  if (!userId) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Manage Event Tags"
          showLeftButton={true}
          onLeftPress={() => navigation.goBack()}
          showBell={false}
          showProfile={false}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to manage event tags</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Event Tags"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      {/* Add/Edit Section */}
      <View style={styles.inputSection}>
        <TextInput
          placeholder="Enter tag name"
          placeholderTextColor={"#c5c5c5ff"}
          value={newTag}
          onChangeText={setNewTag}
          style={styles.input}
          maxLength={50}
        />

        <TextInput
          placeholder="Enter description (optional)"
          placeholderTextColor={"#c5c5c5ff"}
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.saveButton, 
              { flex: editingTag ? 0.7 : 1 },
              (isLoading || !newTag.trim()) && styles.saveButtonDisabled
            ]}
            onPress={handleSaveTag}
            disabled={isLoading || !newTag.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {editingTag ? "Update Tag" : "Add Tag"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {editingTag && (
            <TouchableOpacity
              style={[styles.cancelButton, { flex: 0.3 }]}
              onPress={handleCancelEdit}
              disabled={isLoading}
            >
              <Ionicons name="close-outline" size={18} color="#555" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tag List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#8AD0AB" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tagCard}
              onPress={() => handleEdit(item)}
            >
              <View style={styles.tagInfo}>
                <Text style={styles.tagName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.tagDesc}>{item.description}</Text>
                ) : (
                  <Text style={styles.tagDescEmpty}>No description</Text>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.iconButton}
                >
                  <Ionicons name="pencil-outline" size={18} color="#236a3b" />
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
            <Text style={styles.emptyText}>No event tags yet. Add your first one!</Text>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f9f9fb", 
    padding: 16 
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
  inputSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
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
    shadowColor: "#8AD0AB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
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
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "600", 
    marginLeft: 6 
  },
  cancelButtonText: { 
    color: "#333", 
    fontWeight: "500", 
    marginLeft: 6 
  },
  tagCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    padding: 12,
  },
  tagInfo: { 
    flex: 1, 
    paddingHorizontal: 5 
  },
  tagName: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#333" 
  },
  tagDesc: { 
    fontSize: 13, 
    color: "#555", 
    marginTop: 4 
  },
  tagDescEmpty: { 
    fontSize: 13, 
    color: "#aaa", 
    fontStyle: "italic", 
    marginTop: 4 
  },
  actionButtons: {
    flexDirection: "row",
    alignSelf: "center",
    paddingHorizontal: 8,
  },
  iconButton: { 
    marginHorizontal: 6 
  },
  emptyText: { 
    textAlign: "center", 
    color: "#888", 
    marginTop: 20 
  },
});