import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { AntDesign, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AppHeader from "./reuseComponet/header";
import { useFocusEffect } from "@react-navigation/native";
import { initDB, getUserSummary } from "../database/SQLite";
import {getExperienceLevel} from "../database/userAuth";
import { useTipManager } from "./LaiWenYin/TutorialModule/TipManager";
import FinancialTipBanner from "./LaiWenYin/TutorialModule/FinancialTipBanner";
import tipData from '../assets/financialTipsData.json';

export default function DashboardScreen({ navigation }) {
  const [userSummary, setUserSummary] = useState({
    total_income: 0,
    total_expense: 0,
    total_balance: 0,
  });
  const getTip = (module, context, userLevel) => {
  return (
    tipData?.[module]?.[context]?.[userLevel] ||
    tipData?.[module]?.default?.[userLevel] ||
    "No tips available."
  );
};

  const [userLevel, setUserLevel] = useState('beginner'); 
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);

  const userId = "U000001"; // or however you store your current user
   const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);
   const loadUserLevel = async () => {
    try {
      const level = await getExperienceLevel(userId);
      if (level) {
        setUserLevel(level);
      }
    } catch (error) {
      console.error("Error loading user level:", error);
      setUserLevel('beginner');
    } finally {
      setIsLoadingLevel(false);
    }
  };
  useEffect(() => {
    loadUserLevel();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const loadSummary = async () => {
        const summary = await getUserSummary(userId);
        if (summary) setUserSummary(summary);
      };
      loadSummary();
    }, [userId])
  );

const showBalanceTip = () => {
    if (userSummary.total_balance < 0) {
      showTip('dashboard', 'balance');
    } else if (userSummary.total_balance > userSummary.total_income * 3) {
      showTip('dashboard', 'savings');
    } else {
      showTip('dashboard', 'balance');
    }
  };
  useEffect(() => {
    const loadSummary = async () => {
      await initDB();
       // For testing purposes, reset DB on load
      const summary = await getUserSummary(userId);
      if (summary) setUserSummary(summary);
    };
    loadSummary();
  }, []);
  
 const showSavingsTip = () => {
    showTip('dashboard', 'savings');
  };

  const showBillsTip = () => {
    showTip('dashboard', 'bills');
  };

  const showPredictionTip = () => {
    showTip('dashboard', 'prediction');
  };if (isLoadingLevel) {
    
    return (
      <View style={styles.container}>
        <AppHeader title="Dashboard" />
        <View style={styles.loadingContainer}>
          <Text>Loading your financial insights...</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <AppHeader title="Dashboard" />

      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance
            <TouchableOpacity onPress={showBalanceTip}>
              <Ionicons name="information-circle-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </Text>
          <Text style={styles.balanceAmount}>
            RM {userSummary.total_balance.toFixed(2)}
          </Text>

          <View style={styles.incomeExpenseRow}>
            <Text style={styles.incomeText}>
              🟢 Income: RM {userSummary.total_income.toFixed(2)}
            </Text>
            <Text style={styles.expenseText}>
              🔴 Expenses: RM {userSummary.total_expense.toFixed(2)}
            </Text>
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

        {/* Future Prediction Card */}
        <View style={styles.sectionCard}>
          <View style={styles.billsHeader}>
            <Text style={styles.sectionTitle}>Future Financial Outlook</Text>
         
          </View>

          <View style={styles.predictionItem}>
            <View style={styles.predictionIcon}>
              <Ionicons name="analytics-outline" size={20} color="#8AD0AB" />
            </View>
            <View style={styles.predictionContent}>
              <Text style={styles.predictionTitle}>Inflation Impact Analysis</Text>
              <Text style={styles.predictionSubtitle}>See how inflation affects your savings goals</Text>
            </View>
            <AntDesign name="right" size={16} color="#999" 
            onPress={() => { navigation.navigate('FuturePredictionScreen') }} />
          </View>

          <View style={styles.predictionItem}>
            <View style={styles.predictionIcon}>
              <MaterialCommunityIcons name="chart-timeline" size={20} color="#8AD0AB" />
            </View>
            <View style={styles.predictionContent}>
              <Text style={styles.predictionTitle}>Goal Projection</Text>
              <Text style={styles.predictionSubtitle}>Track progress towards your financial targets</Text>
            </View>
            <AntDesign name="right" size={16} color="#999"
            onPress={() => { navigation.navigate('GoalProjectionScreen') }} />
          </View>
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
          <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('AddGoal') }}>
            <MaterialCommunityIcons name="pig-variant-outline" size={24} color="#8AD0AB" />
            <Text style={styles.gridLabel}>Set Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('ExpenseAnalysis') }}>
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
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionContent: {
    flex: 1,
  },
  predictionTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    fontSize: 14,
  },
  predictionSubtitle: {
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
});
