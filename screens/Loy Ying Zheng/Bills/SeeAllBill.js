import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { getBillsLocal, checkDueBillsAndGenerateReminders } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";

export default function SeeAllBills({ navigation }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useUser();

  const loadBills = async () => {
    if (!userId) return;
    
    try {
      // Check for due bills and update statuses before loading
      await checkDueBillsAndGenerateReminders(userId, false); // false to prevent alerts
      
      const data = await getBillsLocal(userId);
      setBills(data);
    } catch (error) {
      console.error("❌ loadBills error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadBills);
    return unsubscribe;
  }, [navigation, userId]);

  const getStatusTag = (status) => {
    switch (status) {
      case "Paid":
        return { label: "Paid", color: "#9cd8b3" };
      case "Overdue":
        return { label: "Overdue", color: "#FF6B6B" };
      case "DueSoon":
        return { label: "Due Soon", color: "#FFA500" };
      case "Upcoming":
      default:
        return { label: "Upcoming", color: "#FFC107" };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8AD0AB" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9f9fb" }}>
      <AppHeader
        title="All Bills"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {bills.length === 0 ? (
          <Text style={styles.emptyText}>No bills found.</Text>
        ) : (
          bills.map((bill) => {
            const status = getStatusTag(bill.status || "Upcoming");
            return (
              <TouchableOpacity
                key={bill.id}
                style={styles.billCard}
                onPress={() => navigation.navigate("BillDetail", { bill })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.billTitle}>{bill.billName}</Text>
                  <Text style={styles.billDate}>
                    <Ionicons name="calendar-outline" size={14} color="#777" />{" "}
                    {bill.dueDate}
                  </Text>
                  <Text style={styles.billCategory}>{bill.category}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.billAmount}>RM {bill.amount.toFixed(2)}</Text>
                  <View style={[styles.statusTag, { backgroundColor: status.color }]}>
                    <Text style={styles.statusText}>{status.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add New Bill Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddBill")}
      >
        <Text style={styles.addButtonText}>+ Add New Bill</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  billCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  billDate: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },
  billCategory: {
    fontSize: 13,
    color: "#8AD0AB",
    marginTop: 2,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#8AD0AB",
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 30,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 30,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
