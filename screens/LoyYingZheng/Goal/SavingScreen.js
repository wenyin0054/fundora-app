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
import { getGoalsLocal } from "../../../database/SQLite ";

// ------------------ Savings Planner Screen ------------------

export default function SavingsPlanner() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState([]);

  // Load goals from local DB
  const loadGoals = async () => {
    try {
      const results = await getGoalsLocal();
      const mapped = results.map((g) => ({
        id: g.id.toString(),
        title: g.goalName,
        desc: g.description,
        saved: parseFloat(g.currentAmount),
        target: parseFloat(g.targetAmount),
        due: g.deadline,
        suggested: calculateSuggestedSaving(g.currentAmount, g.targetAmount, g.deadline),
      }));
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
      <AppHeader title="Savings Planner" />
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
              <View key={goal.id} style={styles.card}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalDesc}>{goal.desc}</Text>
                <Text style={styles.saved}>
                  Saved: RM{goal.saved.toLocaleString()} / RM{goal.target.toLocaleString()}
                </Text>
                {renderProgressBar(progress)}
                <Text style={styles.due}>Due Date: {goal.due}</Text>
                <Text style={styles.suggested}>
                  Suggested Saving: RM{goal.suggested} per month
                </Text>
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
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>💡 Motivational Message</Text>
          <Text style={styles.messageText}>
            Every penny saved is a step closer to your dreams.
          </Text>
          <Text style={styles.messageText}>
            Keep up the great work, your future self will thank you!
          </Text>
        </View>

        {/* Reminders */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderText}>
            🔔 Recommended: Check if you’ve skipped your goals yet.
          </Text>
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
});
