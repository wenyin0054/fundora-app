import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { initDB, getExpensesLocal, getExpensesByTypeLabelLocal } from "../../../database/SQLite.js";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AppHeader from "../../reuseComponet/header.js";
import { useUser } from "../../reuseComponet/UserContext.js";

export default function ExpensesOrganizer({ navigation }) {
  // ------------ MAIN STATES ------------
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState("All"); // All / Date / Tag
  const [essentialFilter, setEssentialFilter] = useState("Mix"); // Mix / Essential / Non-Essential
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All"); // All / Income / Expenses / Transaction
  const [isLoading, setIsLoading] = useState(false);

  const { userId, isLoading: userLoading } = useUser();

  // ------------ LOAD DATA ON FOCUS ------------
  useFocusEffect(
    React.useCallback(() => {
      const loadExpenses = async () => {
        if (!userId) return;
        try {
          setIsLoading(true);
          await initDB();
          const allExpenses = await getExpensesLocal(userId);
          setExpenses(allExpenses || []);
        } catch (err) {
          console.error("❌ Failed to fetch expenses:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadExpenses();
    }, [userId])
  );

  // ------------ TOP FILTER CHANGE ------------
  const handleTopFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (newFilter !== "Date") setSelectedDate(null);
  };

  // ------------ TYPE FILTER CHANGE ------------
  const handleTypeFilter = async (filterType) => {
    setTypeFilter(filterType);
  };

  // ------------ FINAL FILTER ENGINE (唯一入口) ------------
  const filteredExpenses = expenses.filter((item) => {
    // 1️⃣ Essential filter
    if (essentialFilter === "Essential" && item.essentialityLabel !== 1) return false;
    if (essentialFilter === "Non-Essential" && item.essentialityLabel !== 0) return false;

    // 2️⃣ Type filter
    if (typeFilter !== "All") {
      if (item.typeLabel.toLowerCase() !== typeFilter.toLowerCase()) return false;
    }

    // 3️⃣ Top filter: All / Date / Tag
    if (filter === "All") return true;

    if (filter === "Date" && selectedDate) {
      const expenseDate = item.date?.split("T")[0];
      const selectedDateFormatted = selectedDate.toISOString().split("T")[0];
      return expenseDate === selectedDateFormatted;
    }

    // Tag filter
    if (filter !== "All" && filter !== "Date") {
      return item.tag === filter;
    }

    return true;
  });

  // ------------ LOADING USER ------------
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  // ------------ USER NOT LOGGED IN ------------
  if (!userId) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Expenses Organizer"
          showLeftButton={true}
          leftIcon="menu"
          onLeftPress={() => navigation.openDrawer()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to view expenses</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Expenses Organizer"
        showLeftButton={true}
        leftIcon="menu"
        onLeftPress={() => navigation.openDrawer()}
      />

      {/* 🔹 Filter Bar */}
      <View style={styles.topFilterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {/* All */}
          <TouchableOpacity
            style={[styles.filterBtn, filter === "All" && styles.activeFilter]}
            onPress={() => handleTopFilterChange("All")}
          >
            <Ionicons name="filter-outline" size={18} color="#236a3b" style={{ marginRight: 6 }} />
            <Text style={styles.filterText}>All</Text>
          </TouchableOpacity>

          {/* Date */}
          <TouchableOpacity
            style={[styles.filterBtn, filter === "Date" && styles.activeFilter]}
            onPress={() => handleTopFilterChange("Date")}
          >
            <Ionicons name="calendar-outline" size={18} color="#236a3b" style={{ marginRight: 6 }} />
            <Text style={styles.filterText}>Date</Text>
          </TouchableOpacity>

          {/* Tags */}
          {[...new Set(expenses.map((item) => item.tag))]
            .filter((tag) => tag && !/^\d{4}-\d{2}-\d{2}$/.test(tag))
            .map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.filterBtn, filter === tag && styles.activeFilter]}
                onPress={() => handleTopFilterChange(tag)}
              >
                <Text style={styles.filterText}>{tag}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Essential Filter */}
      <View style={styles.essentialFilterContainer}>
        {["Mix", "Essential", "Non-Essential"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.essentialButton, essentialFilter === option && styles.essentialButtonActive]}
            onPress={() => setEssentialFilter(option)}
          >
            <Text style={[styles.essentialText, essentialFilter === option && styles.essentialTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Scroll */}
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* Date Picker */}
        {filter === "Date" && (
          <View style={{ marginVertical: 10 }}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.filterBtn}>
              <Text style={styles.filterText}>
                {selectedDate ? selectedDate.toISOString().split("T")[0] : "Select Date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}
          </View>
        )}

        {/* Expense List */}
        <View style={styles.expenseListCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          {/* TYPE FILTER */}
          <View style={styles.filterRow}>
            {["All", "Income", "Expenses", "Transaction"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.filterButton, typeFilter === t && styles.filterButtonActive]}
                onPress={() => handleTypeFilter(t)}
              >
                <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#8AD0AB" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={filteredExpenses}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: "#888", marginTop: 20 }}>
                  No transactions available
                </Text>
              }
              renderItem={({ item }) => {
                const isExpense = item.typeLabel.toLowerCase() === "expenses";
                const isIncome = item.typeLabel.toLowerCase() === "income";
                const color = isExpense ? "#E53935" : isIncome ? "#4CAF50" : "#2196F3";
                const sign = isExpense ? "-RM" : isIncome ? "+RM" : "RM";

                return (
                  <TouchableOpacity
                    style={styles.expenseCard}
                    onPress={() =>
                      navigation.navigate("ExpenseDetail", { expense: item })
                    }
                  >
                    <View style={[styles.colorBar, { backgroundColor: color }]} />
                    <View style={styles.expenseContent}>
                      <View>
                        <Text style={styles.expenseTitle}>{item.payee}</Text>
                        <Text style={styles.expenseDate}>{item.date}</Text>
                      </View>
                      <Text style={[styles.expenseAmount, { color }]}>
                        {sign} {(parseFloat(item.amount) || 0).toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatButton}
        onPress={() => navigation.navigate("AddExpense")}
      >
        <AntDesign name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
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
  topFilterWrapper: { marginTop: 10, marginBottom: 5 },
  filterContainer: { paddingHorizontal: 10, alignItems: "center" },
  mainScroll: { paddingHorizontal: 16, paddingVertical: 10, flexGrow: 1 },
  filterBtn: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: "#fff",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilter: { backgroundColor: "#8AD0AB" },
  filterText: { fontSize: 14, color: "#333" },
  activeFilterText: { color: "#fff" },
  inactiveFilter: { backgroundColor: "#fff", borderColor: "#e0e0e0" },
  essentialFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  essentialButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  essentialButtonActive: { backgroundColor: "#8AD0AB" },
  essentialText: { color: "#2E5E4E", fontSize: 14 },
  essentialTextActive: { color: "#fff", fontWeight: "600" },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  expenseListCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  colorBar: {
    width: 6,
    height: "100%",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  expenseContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  expenseTitle: { fontSize: 15, color: "#333", fontWeight: "500" },
  expenseDate: { fontSize: 12, color: "#888" },
  expenseAmount: { fontSize: 15, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },

  filterButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },

  filterButtonActive: {
    backgroundColor: "#2E5E4E",
  },

  filterText: {
    color: "#333",
    fontWeight: "500",
  },

  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  floatButton: {
    position: "absolute",
    bottom: 23,
    right: 20,
    backgroundColor: "#8AD0AB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});