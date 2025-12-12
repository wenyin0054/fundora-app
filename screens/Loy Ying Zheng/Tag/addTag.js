import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { addTagLocal, getTagsLocal } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";
import {
  FDSCard,
  FDSValidatedInput,
  FDSButton,
  FDSLabel,
  FDSColors
} from "../../reuseComponet/DesignSystem";

export default function AddTag({ navigation, route }) {
  const [tagName, setTagName] = useState("");
  const [essentiality, setEssentiality] = useState(null);
  const [existingTags, setExistingTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const tagNameRef = useRef(null);
  const { userId, isLoading: userLoading } = useUser();
  const { onTagAdded } = route.params || {};

  // Load existing tags once user is available
  useEffect(() => {
    if (userId) loadExistingTags();
  }, [userId]);

  const loadExistingTags = async () => {
    try {
      setIsLoading(true);
      const tags = await getTagsLocal(userId);

      // Lowercase existing tags for quick duplicate detection
      setExistingTags(tags.map((t) => t.name.trim().toLowerCase()));
    } catch (error) {
      Alert.alert("Error", "Failed to load existing tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async () => {
    const trimmed = tagName.trim();

    // 1️⃣ Empty check
    if (!trimmed) {
      tagNameRef.current?.shake();
      tagNameRef.current?.setError(true);
      return;
    }

    // 2️⃣ Duplicate check
    if (existingTags.includes(trimmed.toLowerCase())) {
      tagNameRef.current?.shake();
      tagNameRef.current?.setError(true);
      return Alert.alert(
        "Tag Exists",
        `The tag "${tagName}" already exists.`
      );
    }

    // 3️⃣ Essentiality missing
    if (essentiality === null) {
      Alert.alert("Missing Info", "Please select Essential or Non-Essential.");
      return;
    }


    try {
      await addTagLocal(userId, trimmed, essentiality);

      Alert.alert("Success", "Tag added successfully!");
      if (onTagAdded) onTagAdded(trimmed);

      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Failed to add tag.");
    }
  };

  // Loading state (user)
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  // Not logged in
  if (!userId) {
    return (
      <View style={styles.container}>
        <AppHeader title="Add New Tag" showLeftButton onLeftPress={() => navigation.goBack()} />
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
      <AppHeader title="Add New Tag" showLeftButton onLeftPress={() => navigation.goBack()} />

      <FDSCard>
        {/* Validated Input */}
        <FDSValidatedInput
          ref={tagNameRef}
          label="Tag Name"
          value={tagName}
          onChangeText={setTagName}
          placeholder="Enter tag name (e.g. Food)"
          validate={(v) => v && v.trim().length > 0}
          errorMessage="Tag name cannot be empty"
          icon={<Ionicons name="pricetag-outline" size={18} color={FDSColors.textGray} />}
        />

        {/* Essentiality Selector */}
        <Text style={styles.label}>Essentiality</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.optionBtn, essentiality === 1 && styles.optionActive]}
            onPress={() => setEssentiality(1)}
          >
            <Text
              style={[
                styles.optionText,
                essentiality === 1 && styles.optionTextActive,
              ]}
            >
              Essential
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, essentiality === 0 && styles.optionActive]}
            onPress={() => setEssentiality(0)}
          >
            <Text
              style={[
                styles.optionText,
                essentiality === 0 && styles.optionTextActive,
              ]}
            >
              Non-Essential
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <FDSButton
          title="Save Tag"
          icon="save-outline"
          disabled={!tagName.trim() || essentiality === null}
          onPress={handleAddTag}
        />
      </FDSCard>
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
  saveBtnDisabled: { backgroundColor: "#ccc", opacity: 0.6 },
  saveText: { color: "#fff", fontWeight: "600", marginLeft: 6 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontSize: 20, fontWeight: "700", marginTop: 10 },
  errorMessage: { fontSize: 14, color: "#777" },
});
