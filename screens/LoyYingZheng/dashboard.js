import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { AntDesign, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AppHeader from "../reuseComponet/header.js";

export default function DashboardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <AppHeader title="Dashboard" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>RM 7,890.50</Text>

          <View style={styles.incomeExpenseRow}>
            <Text style={styles.incomeText}>🟢 Income: RM 3,200.00</Text>
            <Text style={styles.expenseText}>🔴 Expenses: RM 1,450.75</Text>
          </View>
        </View>

        {/* Monthly Savings Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>This Month's Savings Goals</Text>
          {[
            { emoji: "🏠", title: "Dream Home Down Payment", amount: "RM 129" },
            { emoji: "💰", title: "Emergency Fund", amount: "RM 119" },
            { emoji: "🚗", title: "New Car", amount: "RM 209" },
          ].map((goal, index) => (
            <View key={index} style={styles.goalItem}>
              <Text style={styles.goalText}>
                {goal.emoji} {goal.title}
              </Text>
              <Text style={styles.goalAmount}>{goal.amount}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Bills */}
        <View style={styles.sectionCard}>
          <View style={styles.billsHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {[
            { name: "🏠 Rent", amount: "RM 1,200.00", due: "Due 1 May" },
            { name: "💡 Electricity", amount: "RM 85.50", due: "Due 7 May" },
            { name: "🌐 Internet", amount: "RM 60.00", due: "Due 15 May" },
          ].map((bill, index) => (
            <View key={index} style={styles.billItem}>
              <View>
                <Text style={styles.billName}>{bill.name}</Text>
                <Text style={styles.billDue}>{bill.due}</Text>
              </View>
              <Text style={styles.billAmount}>{bill.amount}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Quick Actions</Text>
        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('ScanReceipt') }}>
            <AntDesign name="scan" size={24} color="#8AD0AB" />
            <Text style={styles.gridLabel}>Scan Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('AddExpense') }}>
            <MaterialIcons name="attach-money" size={24} color="#8AD0AB" />
            <Text style={styles.gridLabel}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('SetGoal') }}>
            <MaterialCommunityIcons name="pig-variant-outline" size={24} color="#8AD0AB" />
            <Text style={styles.gridLabel}>Set Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton}>
            <Ionicons name="analytics-outline" size={24} color="#8AD0AB" />
            <Text style={styles.gridLabel}>View Analysis</Text>
          </TouchableOpacity>
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
  container: {
    backgroundColor: "#f9f9fb",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  balanceCard: {
    backgroundColor: "#8AD0AB",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "Inter_500Medium",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginVertical: 8,
    fontFamily: "Inter_700Bold",
  },
  incomeExpenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  incomeText: {
    color: "#e8fff0",
    fontFamily: "Inter_500Medium",
  },
  expenseText: {
    color: "#ffeaea",
    fontFamily: "Inter_500Medium",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#333",
    fontFamily: "Inter_600SemiBold",
  },
  goalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f3f6fa",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  goalText: {
    fontFamily: "Inter_500Medium",
    color: "#333",
  },
  goalAmount: {
    fontFamily: "Inter_600SemiBold",
    color: "#4CAF50",
  },
  billsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  billName: {
    fontFamily: "Inter_500Medium",
    color: "#333",
  },
  billDue: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#888",
  },
  billAmount: {
    fontFamily: "Inter_600SemiBold",
    color: "#E53935",
  },
  viewAll: {
    color: "#8AD0AB",
    fontFamily: "Inter_600SemiBold",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  gridButton: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 15,
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gridLabel: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    color: "#333",
  },
  floatButton: {
    position: "absolute",
    bottom: 120,
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
