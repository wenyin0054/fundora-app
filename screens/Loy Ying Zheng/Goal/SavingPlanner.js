import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AppHeader from "../../reuseComponet/header";
import { getGoalsLocal } from "../../../database/SQLite";
import MotivationBanner from "./MotivationBar";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from '@react-navigation/native';
import { useUser } from "../../reuseComponet/UserContext";

// ------------------ Savings Planner Screen ------------------

export default function SavingsPlanner() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState([]);

  const { userId } = useUser();

  // Load goals from local DB
  const loadGoals = async () => {
    try {

      const results = await getGoalsLocal(userId);

      const mapped = results.map((g) => {
        const deadlineInfo = getDeadlineStatus(g.deadline);

        return {
          id: g.id.toString(),
          title: g.goalName,
          desc: g.description,
          saved: parseFloat(g.currentAmount),
          target: parseFloat(g.targetAmount),
          due: g.deadline,
          isOverdue: deadlineInfo.isOverdue,
          overdueMonths: deadlineInfo.overdueMonths,
          monthsRemaining: deadlineInfo.monthsRemaining,
          suggested: calculateSuggestedSaving(g.currentAmount, g.targetAmount, g.deadline),
        };
      });

      setGoals(mapped);
    } catch (error) {
      console.error("❌ Error loading goals:", error);
    }
  };

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const renderProgressBar = (progress) => (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { flex: progress }]} />
      <Text style={styles.progressLable}>{(progress * 100).toFixed(1)}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Savings Planner"
        showLeftButton={true}
        leftIcon="menu"
        onLeftPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <ScrollView style={styles.scrollContent}>
        <Text style={styles.header}>Your Savings Goals</Text>

        {/* Goals List */}
        {goals.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#666", marginVertical: 20 }}>
            No goals yet. Add one below!
          </Text>
        ) : (
          goals.map((goal) => {
            const progress = goal.target ? goal.saved / goal.target : 0;
            return (
              <View
                key={goal.id}
                style={[
                  styles.card,
                  goal.isOverdue && styles.cardOverdue
                ]}
              >
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalDesc}>{goal.desc}</Text>
                <Text style={styles.saved}>
                  Saved: RM{goal.saved.toLocaleString()} / RM{goal.target.toLocaleString()}
                </Text>
                {renderProgressBar(progress)}

                {progress >= 1 && (
                  <TouchableOpacity
                    style={styles.withdrawPrompt}
                    onPress={() => navigation.navigate("GoalDetail", { goal })}
                  >
                    <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                    <Text style={styles.withdrawPromptText}>Goal completed! Tap to withdraw funds</Text>
                  </TouchableOpacity>
                )}
                {goal.isOverdue && (
                  <View style={styles.overdueCard}>
                    <Ionicons name="warning" size={18} color="#B91C1C" />
                    <Text style={styles.overdueCardText}>
                      Your goal deadline has passed. Consider updating your target date
                      or increasing monthly savings.
                    </Text>
                  </View>
                )}

                {!goal.isOverdue && (
                  <Text style={styles.due}>
                    Due Date: {goal.due} ({goal.monthsRemaining} months left)
                  </Text>
                )}
                {!goal.isOverdue && (
                  <Text style={styles.suggested}>
                    Suggested Saving: RM{goal.suggested} per month
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.navigate("GoalDetail", { goal })}
                >
                  <Text style={styles.btnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Motivational Message */}
        {/* Reminders */}
        <View>
          <MotivationBanner />
        </View>

        {/* Add New Goal */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddGoal")} // ✅ go to Add Goal screen
        >
          <Text style={styles.addBtnText}>+ Add New Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ---------------- Helper Function ----------------
function getDeadlineStatus(deadline) {
  const now = new Date();
  const end = new Date(deadline);

  if (isNaN(end)) {
    return { isOverdue: false, overdueMonths: 0, monthsRemaining: 0 };
  }

  // --------------- overdue check ---------------
  if (end < now) {
    // deadline passed → overdue 
    // // calculate how many months overdue
    const yDiff = now.getFullYear() - end.getFullYear();
    const mDiff = now.getMonth() - end.getMonth();
    let overdueMonths = yDiff * 12 + mDiff;

    // If today has exceeded the deadline, an additional month will be counted (more accurately).
    if (now.getDate() > end.getDate()) overdueMonths += 1;

    return {
      isOverdue: true,
      overdueMonths,
      monthsRemaining: 0
    };
  }

  // --------------- deadline  ---------------
  // Calculate the remaining months
  const yDiff = end.getFullYear() - now.getFullYear();
  const mDiff = end.getMonth() - now.getMonth();
  let monthsRemaining = yDiff * 12 + mDiff;

  if (end.getDate() > now.getDate()) monthsRemaining += 1;

  return {
    isOverdue: false,
    overdueMonths: 0,
    monthsRemaining
  };
}


function calculateSuggestedSaving(currentAmount, targetAmount, deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const monthsDiff = Math.max(
    1,
    (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  );
  const remaining = targetAmount - currentAmount;
  return remaining > 0 ? Math.round(remaining / monthsDiff) : 0;
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalDesc: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  saved: {
    fontSize: 14,
    marginBottom: 4,
    color: "#333",
  },
  due: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
  suggested: {
    fontSize: 13,
    color: "#444",
    marginBottom: 8,
  },
  btn: {
    width: 109,
    height: 42,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee1e6",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  btnText: {
    color: "black",
    fontWeight: "600",
  },
  progressBar: {
    flexDirection: "row",
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    marginVertical: 6,
  },
  progressFill: {
    backgroundColor: "#8AD0AB",
  },
  progressLable: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
    color: "black",
    fontWeight: "600",
    fontFamily:
      Platform.OS === "android"
        ? "Inter_600SemiBold"
        : "HelveticaNeue-Medium",
  },
  messageCard: {
    backgroundColor: "#eafaf1",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  messageTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13,
    color: "#333",
  },
  reminderCard: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  reminderText: {
    fontSize: 13,
    color: "#856404",
  },
  addBtn: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Add in GoalDetailScreen styles
  completedSection: {
    backgroundColor: "#E8F5E8",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
    borderStyle: "dashed",
  },
  completedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 10,
    textAlign: "center",
  },
  withdrawAllButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  withdrawAllText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  withdrawPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  withdrawPromptText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  overdueBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: "flex-start",
  },

  overdueText: {
    color: "#B91C1C",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },

  overdueCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    marginBottom: 8,
  },

  overdueCardText: {
    color: "#7F1D1D",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  cardOverdue: {
    backgroundColor: "#FEF2F2",      // Light red background
    borderWidth: 1.5,
    borderColor: "#DC2626",          // Dark red border
    shadowOpacity: 0.02,             // Shadow weakened (fits warning UI)
  },

  overdueHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FECACA",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
  },

  overdueHeaderText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },

});
