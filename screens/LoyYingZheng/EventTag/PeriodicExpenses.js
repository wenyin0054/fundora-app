import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { getEventTagsLocal, deleteEventTagLocal, initDB } from "../../../database/SQLite ";
import { useFocusEffect } from "@react-navigation/native";


export default function EventTagList({ navigation }) {
  const [eventTags, setEventTags] = useState([]);

  // 🔄 Load Event Tags
  const loadEventTags = async () => {
    try {
      await initDB();
      const data = await getEventTagsLocal();
      setEventTags(data);
    } catch (error) {
      console.error("❌ Failed to load event tags:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadEventTags();
    }, [])
  );

  // 🗑️ Delete Event Tag
  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Event Tag",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEventTagLocal(id);
              await loadEventTags(); // refresh list
            } catch (error) {
              console.error("❌ Failed to delete event tag:", error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Event Tags"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      <View style={styles.card}>
        {eventTags.length === 0 ? (
          <Text style={styles.emptyText}>No event tags found.</Text>
        ) : (
          <FlatList
            data={eventTags}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <View style={styles.eventRow}>
                <TouchableOpacity
                  style={styles.leftBarContainer}
                  onPress={() =>
                    navigation.navigate("EventTagManager", { eventTag: item })
                  }
                >
                  <View
                    style={[
                      styles.leftBar,
                      { backgroundColor: "#4CAF50" },
                    ]}
                  />
                  <View>
                    <Text style={styles.eventTitle}>{item.name}</Text>
                    <Text style={styles.eventDescription}>
                      {item.description || "No description"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 🗑️ Trash Bin Button */}
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#d9534f" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate("AddEventTag")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addText}>Add Event Tag</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
    alignItems: "center",
  },
  leftBarContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  leftBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: 10,
  },
  eventTitle: { fontSize: 15, color: "#333", fontWeight: "500" },
  eventDescription: { fontSize: 12, color: "#888" },
  deleteBtn: { paddingHorizontal: 10 },
  emptyText: { textAlign: "center", color: "#aaa", paddingVertical: 30 },
  addBtn: {
    flexDirection: "row",
    backgroundColor: "#236a3b",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
});
