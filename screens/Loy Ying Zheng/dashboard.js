import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { AntDesign, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AppHeader from "../reuseComponet/header.js";
import { useFocusEffect, DrawerActions } from "@react-navigation/native";
import {
  initDB,
  getUserSummary,
  checkDueBillsAndGenerateReminders,
  getBillsLocal,
  getGoalsLocal,
  initDefaultSavingMethods,
} from "../../database/SQLite.js";
import Icon from 'react-native-vector-icons/Feather';
import { useTipManager } from "../LaiWenYin/TutorialModule/TipManager.js";
import FinancialTipBanner from "../LaiWenYin/TutorialModule/FinancialTipBanner.js";
import { useUser } from "../reuseComponet/UserContext.js";
import { processPeriodicExpenses } from "../Loy Ying Zheng/ExpensesOrganizer/PeriodicExpensesManager.js"
import { processPeriodicBills } from "../Loy Ying Zheng/Bills/processPeriodicBills.js"
import guessEmoji from "./emojiHelper.js";


export default function DashboardScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [userSummary, setUserSummary] = useState({
    total_income: 0,
    total_expense: 0,
    total_balance: 0,
  });

  const { userId, userLevel, isLoading: userLoading } = useUser();
  const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);

  useFocusEffect(
    useCallback(() => {
      const refreshDashboard = async () => {
        try {
          if (!userId) return;

          console.log("🔄 Dashboard Focused — refreshing all data");
          await processPeriodicExpenses(userId);
          await checkDueBillsAndGenerateReminders(userId);
          await processPeriodicBills(userId);
          await loadAllData();
          await loadGoals();
          const summary = await getUserSummary(userId);
          if (summary) setUserSummary(summary);

        } catch (err) {
          console.error("❌ Dashboard refresh error:", err);
        }
      };

      refreshDashboard();

      // Cleanup
      return () => {
        console.log("📌 Dashboard unfocused");
      };

    }, [userId])
  );


  // Load bills
  const loadAllData = async () => {
    try {
      if (!userId) return;
      await initDB();
      await initDefaultSavingMethods(userId);
      const bills = await getBillsLocal(userId);
      setBills(bills);
    } catch (err) {
      console.error("❌ loadAllData error:", err);
    }
  };

  // Load goals from SQLite
  const loadGoals = async () => {
    try {
      if (!userId) return;
      setLoadingGoals(true);
      await initDB();
      const data = await getGoalsLocal(userId);

      const formatted = data.map(goal => ({
        id: goal.id,
        emoji: guessEmoji(goal.goalName),
        title: goal.goalName,
        amount: `RM ${goal.currentAmount ?? 0} / ${goal.targetAmount ?? 0}`,
      }));

      setGoals(formatted);
    } catch (err) {
      console.error("❌ loadGoals error:", err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const showBalanceTip = () => {
    if (userSummary.total_balance < 0) {
      showTip('dashboard', 'balance');
    } else if (userSummary.total_balance > userSummary.total_income * 3) {
      showTip('dashboard', 'savings');
    } else {
      showTip('dashboard', 'balance');
    }
  };

  const showPredictionTip = () => {
    showTip('dashboard', 'prediction');
  };

  const showQuickActionTip = () => {
    showTip('dashboard', 'quickActions');
  };

  //loading state
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
      <View style={styles.errorContainer}>
        <AppHeader title="Dashboard" />
        <View style={styles.errorContent}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to view your dashboard</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Dashboard"
        showLeftButton={true}
        leftIcon="menu"
        onLeftPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <TouchableOpacity onPress={showBalanceTip} style={styles.infoIconTouchable}>
              <Ionicons name="information-circle-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceWrapper}>
            <Text style={styles.balanceAmount}>
              {showBalance
                ? `RM ${userSummary.total_balance.toFixed(2)}`
                : "RM ****"}
            </Text>

            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Icon
                name={showBalance ? "eye" : "eye-off"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

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

          {loadingGoals ? (
            <ActivityIndicator size="large" color="#8AD0AB" />
          ) : goals.length === 0 ? (
            <Text>No goals found. Set one to get started!</Text>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <Text style={styles.goalText}>
                  {goal.emoji} {goal.title}
                </Text>
                <Text style={styles.goalAmount}>{goal.amount}</Text>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Bills */}
        <View style={styles.sectionCard}>
          <View style={styles.billsHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {bills.slice(0, 3).map((bill, index) => (
            <View key={index} style={styles.billItem}>
              <View>
                <Text style={styles.billName}>
                  {bill.category ? `${bill.category} ` : ""}{bill.billName}
                </Text>
                <Text style={styles.billDue}>
                  {`Due ${new Date(bill.dueDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}`}
                </Text>
              </View>
              <Text style={styles.billAmount}>{`RM ${bill.amount.toFixed(2)}`}</Text>
            </View>
          ))}
        </View>

        {/* Future Prediction Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Future Financial Outlook</Text>
            <TouchableOpacity onPress={showPredictionTip} style={styles.infoIconTouchable}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.predictionItem}
            onPress={() => { navigation.navigate('FuturePredictionScreen') }}
          >
            <View style={styles.predictionIcon}>
              <Ionicons name="analytics-outline" size={20} color="#4CAF50" />
            </View>
            <View style={styles.predictionContent}>
              <Text style={styles.predictionTitle}>Inflation Impact Analysis</Text>
              <Text style={styles.predictionSubtitle}>See how inflation affects your savings goals</Text>
            </View>
            <AntDesign name="right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.predictionItem}
            onPress={() => { navigation.navigate('GoalProjectionScreen') }}
          >
            <View style={styles.predictionIcon}>
              <MaterialCommunityIcons name="chart-timeline" size={20} color="#4CAF50" />
            </View>
            <View style={styles.predictionContent}>
              <Text style={styles.predictionTitle}>Goal Projection</Text>
              <Text style={styles.predictionSubtitle}>Track progress towards your financial targets</Text>
            </View>
            <AntDesign name="right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity onPress={showQuickActionTip} style={styles.infoIconTouchable}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('ScanReceipt') }}>
              <AntDesign name="scan" size={24} color="#8AD0AB" />
              <Text style={styles.gridLabel}>Scan Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('AddExpense') }}>
              <MaterialIcons name="attach-money" size={24} color="#4CAF50" />
              <Text style={styles.gridLabel}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('AddGoal') }}>
              <MaterialCommunityIcons name="pig-variant-outline" size={24} color="#4CAF50" />
              <Text style={styles.gridLabel}>Set Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridButton} onPress={() => { navigation.navigate('ExpenseAnalysis') }}>
              <Ionicons name="analytics-outline" size={24} color="#4CAF50" />
              <Text style={styles.gridLabel}>View Analysis</Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "Inter_500Medium",
  },
  balanceWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginVertical: 8,
    fontFamily: "Inter_700Bold",
  },
  incomeExpenseRow: {
    flexDirection: "column",
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
    color: "#333",
    fontFamily: "Inter_600SemiBold",
  },
  infoIconTouchable: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
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
    fontSize: 14,
    marginLeft: 8,
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
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  gridLabel: {
    marginTop: 8,
    fontFamily: "Inter_500Medium",
    color: "#333",
    fontSize: 14,
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
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionContent: {
    flex: 1,
  },
  predictionTitle: {
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    fontSize: 14,
  },
  predictionSubtitle: {
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  // 新增的加载和错误样式
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f9f9fb',
  },
  errorContent: {
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
    fontFamily: 'Inter_600SemiBold',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },
  loginButton: {
    backgroundColor: '#8AD0AB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});