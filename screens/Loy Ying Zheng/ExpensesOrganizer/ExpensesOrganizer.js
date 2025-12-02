import React, { useEffect, useState } from "react";
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
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import AppHeader from "../../reuseComponet/header.js";
import { useUser } from "../../reuseComponet/UserContext.js"; 


export default function ExpensesOrganizer({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState("All");
  const [essentialFilter, setEssentialFilter] = useState("Mix");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [filteredTransaction, setFilteredTransaction] = useState([]);
  const [dataForChart, setDataForChart] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  const { userId, isLoading: userLoading } = useUser(); 

  const handleFilterChange = async (filterType) => {
    if (!userId) return;
    
    setSelectedFilter(filterType);
    
    let data;
    if (filterType === "All") {
      data = await getExpensesLocal(userId);
      console.log(data);
    } else {
      const label = filterType.toLowerCase();
      data = await getExpensesByTypeLabelLocal(userId, label.toLowerCase());
    }
    
    setFilteredTransaction(data);
    setDataForChart(data); 
  };

  useEffect(() => {
    if (userId) {
      const loadData = async () => {
        await initDB();
        const all = await getExpensesLocal(userId);
        setFilteredTransaction(all);
        setDataForChart(all); 
      };
      loadData();
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      const fetchExpenses = async () => {
        if (!userId) return;
        
        try {
          setIsLoading(true);
          await initDB();
          const data = await getExpensesLocal(userId);
          setExpenses(data);
          setFilteredTransaction(data);
          setDataForChart(data); 
        } catch (error) {
          console.error("❌ Failed to fetch expenses:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchExpenses();
    }, [userId])
  );

  const filteredExpenses = Array.isArray(dataForChart)
    ? dataForChart.filter((item) => {
        if (essentialFilter === "Essential" && item.essentialityLabel !== 1)
          return false;
        if (essentialFilter === "Non-Essential" && item.essentialityLabel !== 0)
          return false;

        if (filter === "All") return true;
        if (filter === "Date" && selectedDate) {
          const expenseDate = item.date?.split("T")[0];
          const selectedDateFormatted = selectedDate.toISOString().split("T")[0];
          return expenseDate === selectedDateFormatted;
        }
        return item.tag === filter;
      })
    : [];


  let pieData = [];

  if (filter === "All") {
    const tags = [...new Set(filteredExpenses.map((item) => item.tag))];
    pieData = tags.map((tag, index) => {
      const total = filteredExpenses
        .filter((item) => item.tag === tag)
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        name: tag || "Untagged",
        amount: total,
        color: `hsl(${(index * 60) % 360}, 70%, 55%)`,
        legendFontColor: "#333",
        legendFontSize: 12,
      };
    });
  } else if (filter !== "All" && filter !== "Date" && filteredExpenses.length > 0) {
    const tagFiltered = filteredExpenses.filter((e) => e.tag === filter);
    const essentialAmount = tagFiltered
      .filter((e) => e.essentialityLabel === 1)
      .reduce((sum, e) => sum + e.amount, 0);
    const nonEssentialAmount = tagFiltered
      .filter((e) => e.essentialityLabel === 0)
      .reduce((sum, e) => sum + e.amount, 0);

    pieData = [
      {
        name: "Essential",
        amount: essentialAmount,
        color: "#6fd072ff",
        legendFontColor: "#333",
        legendFontSize: 13,
      },
      {
        name: "Non-Essential",
        amount: nonEssentialAmount,
        color: "#f05347ff",
        legendFontColor: "#333",
        legendFontSize: 13,
      },
    ].filter((d) => d.amount > 0);
  }

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  //top filter button
  const handleTopFilterChange = async (newFilter) => {
    setFilter(newFilter);
    if (newFilter !== filter && userId) {
      const allData = await getExpensesLocal(userId);
      setFilteredTransaction(allData);
      setDataForChart(allData);
      setSelectedFilter("All");
    }
  };

  
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

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

      {/* 🔹 Filter Bar - 修改 onPress */}
      <View style={styles.topFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filter === "All" ? styles.activeFilter : styles.inactiveFilter,
            ]}
            onPress={() => handleTopFilterChange("All")}
          >
            <Ionicons
              name="filter-outline"
              size={18}
              color={filter === "All" ? "#236a3b" : "#6c757d"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.filterText,
                filter === "All"
                  ? styles.activeFilterText
                  : styles.inactiveFilterText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterBtn,
              filter === "Date" ? styles.activeFilter : styles.inactiveFilter,
            ]}
            onPress={() => handleTopFilterChange("Date")}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={filter === "Date" ? "#236a3b" : "#6c757d"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.filterText,
                filter === "Date"
                  ? styles.activeFilterText
                  : styles.inactiveFilterText,
              ]}
            >
              Date
            </Text>
          </TouchableOpacity>

          {[...new Set(expenses.map((item) => item.tag))]
            .filter((tag) => tag && !/^\d{4}-\d{2}-\d{2}$/.test(tag))
            .map((tag, index) => (
              <TouchableOpacity
                key={tag || index}
                style={[
                  styles.filterBtn,
                  filter === tag ? styles.activeFilter : styles.inactiveFilter,
                ]}
                onPress={() => handleTopFilterChange(tag)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === tag
                      ? styles.activeFilterText
                      : styles.inactiveFilterText,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* 🔹 Essential Filter */}
      <View style={styles.essentialFilterContainer}>
        {["Mix", "Essential", "Non-Essential"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.essentialButton,
              essentialFilter === option && styles.essentialButtonActive,
            ]}
            onPress={() => setEssentialFilter(option)}
          >
            <Text
              style={[
                styles.essentialText,
                essentialFilter === option && styles.essentialTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔹 Main Scroll */}
      <ScrollView
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
      >

        {/* 📅 Date Picker */}
        {filter === "Date" && (
          <View style={{ marginVertical: 10 }}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.filterBtn}
            >
              <Text style={styles.filterText}>
                {selectedDate
                  ? selectedDate.toISOString().split("T")[0]
                  : "Select Date"}
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

        {/* 💰 Expense List with Filter */}
        <View style={styles.expenseListCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          {/* ✅ Filter Buttons */}
          <View style={styles.filterRow}>
            {["All", "Income", "Expenses", "Transaction"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterChange(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#8AD0AB" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={filteredTransaction}
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
                    onPress={() => {
                      console.log(item);
                      navigation.navigate("ExpenseDetail", { expense: item })
                    }

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
      <TouchableOpacity style={styles.floatButton} onPress={() => { navigation.navigate('AddExpense') }}>
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