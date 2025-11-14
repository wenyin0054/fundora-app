import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../reuseComponet/header";
import { getTagsLocal, addTagLocal } from "../../../database/SQLite ";

export default function TagList({ navigation }) {
  const [tags, setTags] = useState([]);

  const loadTags = async () => {
    const data = await getTagsLocal();
    setTags(data);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadTags);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AppHeader title="Tags List" 
      showLeftButton={true}
      onLeftPress={() => navigation.goBack()} 
      showBell={false}
      showProfile={false}
      />
      <View style={styles.card}>
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (            
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("TagManagerScreen", { tag: item })}
            >
              
              <View style={styles.tagInfo}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: item.essentialityLabel === 1 ? "#6fd072" : "#f05347" },
                  ]}
                />
                <Text style={styles.tagName}>{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#999" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tags found. Add one below!</Text>
          }
        />
      </View>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate("AddTag")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addText}>Add Tag</Text>
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
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tagInfo: { flexDirection: "row", alignItems: "center" },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  tagName: { fontSize: 15, color: "#333" },
  emptyText: { textAlign: "center", color: "#aaa", marginVertical: 20 },
  addBtn: {
    flexDirection: "row",
    backgroundColor: "#8AD0AB",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
});
