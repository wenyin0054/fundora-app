import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "../../reuseComponet/UserContext";
import { Ionicons } from "@expo/vector-icons";
import {
  getSavingMethods,
  getSavingAccounts,
  getGoalFundAllocations,
  getGoalsLocal,
  initDB,
} from "../../../database/SQLite";
import { DeviceEventEmitter } from "react-native";

export default function SavingManagementDrawer(props) {
  const [savingMethods, setSavingMethods] = useState([]);
  const [savingAccounts, setSavingAccounts] = useState([]);
  const [fundAllocations, setFundAllocations] = useState([]);
  const [goals, setGoals] = useState([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);

  const { userId } = useUser();

  const loadSavingData = async () => {
    try {
      await initDB();
     

      const methods = await getSavingMethods(userId);
      const accounts = await getSavingAccounts(userId);
      const allocations = await getGoalFundAllocations(userId);
      const goalsData = await getGoalsLocal(userId);

      setSavingMethods(methods);
      setSavingAccounts(accounts);
      setFundAllocations(allocations);
      setGoals(goalsData);

      // Calculate total investment and current value
      const invested = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
      const current = allocations.reduce((sum, alloc) => sum + (alloc.current_value || alloc.allocated_amount), 0);

      setTotalInvested(invested);
      setTotalCurrentValue(current);
    } catch (error) {
      console.error("❌ Load saving data error:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSavingData();
    }, [])
  );

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("savingDataUpdated", loadSavingData);
    return () => listener.remove();
  }, []);

  const getMethodStats = (methodId) => {
    const methodAccounts = savingAccounts.filter(acc => acc.method_id === methodId);
    const methodAllocations = fundAllocations.filter(alloc =>
      methodAccounts.some(acc => acc.id === alloc.account_id)
    );

    const totalAllocated = methodAllocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    const totalCurrent = methodAllocations.reduce((sum, alloc) => sum + (alloc.current_value || alloc.allocated_amount), 0);
    const accountCount = methodAccounts.length;

    return { totalAllocated, totalCurrent, accountCount };
  };

  const getRiskStars = (riskLevel) => {
    return "⭐".repeat(riskLevel) + "☆".repeat(5 - riskLevel);
  };

  const getLiquidityBars = (liquidityLevel) => {
    return "💧".repeat(liquidityLevel) + "○".repeat(5 - liquidityLevel);
  };

  const handleAddSavingMethod = () => {
    props.navigation.navigate("AddSavingMethod", {
      onMethodAdded: loadSavingData
    });
  };

  const handleViewMethodDetail = (method) => {
    props.navigation.navigate("SavingMethodDetail", {
      method: method,
      onMethodUpdated: loadSavingData
    });
  };

  const handleViewAllocations = () => {
    props.navigation.navigate("WithdrawalManagement");
  };

  const renderMethodCard = (method) => {
    const stats = getMethodStats(method.id);
    const profit = stats.totalCurrent - stats.totalAllocated;
    const profitPercentage = stats.totalAllocated > 0 ? (profit / stats.totalAllocated * 100) : 0;

    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.methodCard, { borderLeftColor: method.color_code }]}
        onPress={() => handleViewMethodDetail(method)}
      >
        <View style={styles.methodHeader}>
          <View style={styles.methodIconContainer}>
            <Text style={styles.methodIcon}>{method.icon_name}</Text>
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>{method.method_name}</Text>
            <Text style={styles.methodType}>{method.method_type}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </View>

        <View style={styles.methodStats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Invested:</Text>
            <Text style={styles.statValue}>RM{stats.totalAllocated.toFixed(2)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Current Value:</Text>
            <Text style={[styles.statValue, profit >= 0 ? styles.profitText : styles.lossText]}>
              RM{stats.totalCurrent.toFixed(2)}
            </Text>
          </View>
          {stats.totalAllocated > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Return:</Text>
              <Text style={[styles.statValue, profit >= 0 ? styles.profitText : styles.lossText]}>
                {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ({profitPercentage.toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.methodDetails}>
          <Text style={styles.detailText}>
            📈 Expected: {method.expected_return}%
          </Text>
          <Text style={styles.detailText}>
            🎯 Risk: {getRiskStars(method.risk_level)}
          </Text>
          <Text style={styles.detailText}>
            💰 Liquidity: {getLiquidityBars(method.liquidity_level)}
          </Text>
          <Text style={styles.detailText}>
            🏦 Accounts: {stats.accountCount}
          </Text>
        </View>

        {method.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      <DrawerItemList {...props} />

      {/* Saving Management Section */}
      <View style={styles.savingContainer}>
        <Text style={styles.sectionTitle}>💰 Saving Management</Text>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
            <Text style={styles.summaryLabel}>Total Invested</Text>
            <Text style={styles.summaryValue}>RM{totalInvested.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="trending-up-outline" size={20} color="#2196F3" />
            <Text style={styles.summaryLabel}>Current Value</Text>
            <Text style={styles.summaryValue}>RM{totalCurrentValue.toFixed(2)}</Text>
          </View>
        </View>

        {/* Total Return */}
        <View style={styles.returnCard}>
          <Text style={styles.returnLabel}>Total Return</Text>
          <Text style={[
            styles.returnValue,
            totalCurrentValue >= totalInvested ? styles.positiveReturn : styles.negativeReturn
          ]}>
            {totalCurrentValue >= totalInvested ? '+' : ''}
            {(totalCurrentValue - totalInvested).toFixed(2)}
            ({totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested * 100).toFixed(1) : 0}%)
          </Text>
        </View>

        {/* Saving Methods */}
        <View style={styles.methodsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>Saving Methods</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSavingMethod}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.methodsList} nestedScrollEnabled={true}>
            {savingMethods.map(renderMethodCard)}

            {savingMethods.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No saving methods yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your first saving method to start tracking investments
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionSubtitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewAllocations}
          >
            <Ionicons name="list-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>View All Withdrawals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => props.navigation.navigate("SavingMethodList")}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Manage Methods</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingBottom: 20
  },
  savingContainer: {
    borderTopWidth: 1,
    borderTopColor: "#d6e8de",
    marginTop: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#2E5E4E",
    fontSize: 16,
    marginBottom: 15,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  returnCard: {
    backgroundColor: "#F8FDF9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3F1E7",
  },
  returnLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  returnValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  positiveReturn: {
    color: "#4CAF50",
  },
  negativeReturn: {
    color: "#F44336",
  },
  methodsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#8AD0AB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  methodsList: {
    maxHeight: 300,
  },
  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  methodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  methodIcon: {
    fontSize: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  methodType: {
    fontSize: 11,
    color: "#666",
    textTransform: "capitalize",
    marginTop: 2,
  },
  methodStats: {
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
  },
  statValue: {
    fontSize: 11,
    fontWeight: "500",
  },
  profitText: {
    color: "#4CAF50",
  },
  lossText: {
    color: "#F44336",
  },
  methodDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 10,
    color: "#888",
    marginRight: 12,
    marginBottom: 2,
  },
  defaultBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 8,
    color: "#999",
    fontWeight: "500",
  },
  actionsSection: {
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#2E5E4E",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
});