import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import AppHeader from "./reuseComponet/header";

export default function BillTracker() {
  const [income, setIncome] = useState("5000");
  const [debt, setDebt] = useState("1500");
  const [dsrResult, setDsrResult] = useState(null);

  const calculateDSR = () => {
    const grossIncome = parseFloat(income);
    const monthlyDebt = parseFloat(debt);

    if (!grossIncome || grossIncome <= 0) {
      setDsrResult("⚠️ Please enter a valid income amount.");
      return;
    }

    const dsr = ((monthlyDebt / grossIncome) * 100).toFixed(1);
    const status = dsr < 40 ? "Healthy ✅" : "Risky ⚠️";

    setDsrResult(`Your DSR: ${dsr}%\nStatus: ${status}`);
  };

  const addBill = () => {
    Alert.alert("Add Bill", "Feature to add new bills coming soon!");
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Bill & DSR Tracker" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🔔 Reminders Section */}
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardText}>💳 Credit Card bill overdue!</Text>
          </View>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardText}>🏠 Rent payment due in 3 days</Text>
          </View>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* 📅 Upcoming Bills Section */}
        <Text style={styles.sectionTitle}>Upcoming Bills</Text>
        <View style={styles.upcomingCard}>
          {[
            { name: "🏠 Rent", amount: 1200.0 },
            { name: "💳 Credit Card", amount: 350.5 },
            { name: "💡 Electricity", amount: 90.2 },
          ].map((bill, index) => (
            <View key={index} style={styles.billRow}>
              <Text style={styles.billLabel}>{bill.name}</Text>
              <Text style={styles.billAmount}>RM {bill.amount.toFixed(2)}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addBill}>
            <Text style={styles.addBtnText}>+ Add New Bill</Text>
          </TouchableOpacity>
        </View>

        {/* 🧮 DSR Calculator Section */}
        <Text style={styles.sectionTitle}>DSR Calculator</Text>
        <View style={styles.dsrCard}>
          <TextInput
            style={styles.input}
            placeholder="Monthly Gross Income (RM)"
            keyboardType="numeric"
            value={income}
            onChangeText={setIncome}
          />
          <TextInput
            style={styles.input}
            placeholder="Monthly Debt Payments (RM)"
            keyboardType="numeric"
            value={debt}
            onChangeText={setDebt}
          />
          <TouchableOpacity style={styles.calcBtn} onPress={calculateDSR}>
            <Text style={styles.calcBtnText}>Calculate DSR</Text>
          </TouchableOpacity>

          {dsrResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{dsrResult}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Inter_400Regular",
  },
  btn: {
    backgroundColor: "#8AD0AB",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  upcomingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  billLabel: {
    fontSize: 15,
    color: "#333",
    fontFamily: "Inter_500Medium",
  },
  billAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E53935",
    fontFamily: "Inter_600SemiBold",
  },
  addBtn: {
    backgroundColor: "#8AD0AB",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_500Medium",
  },
  dsrCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
    backgroundColor: "#fdfdfd",
    fontFamily: "Inter_400Regular",
  },
  calcBtn: {
    backgroundColor: "#8AD0AB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  calcBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  resultCard: {
    backgroundColor: "#f1f8f4",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  resultText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
});
