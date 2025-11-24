import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { getGoalsLocal, getExpensesLocal } from "../database/SQLite";
import { Ionicons } from "@expo/vector-icons";

export default function MotivationBanner() {
  const [motivation, setMotivation] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    const loadInsights = async () => {
      const goals = await getGoalsLocal();
      const expenses = await getExpensesLocal();

      if (!goals || goals.length === 0) {
        setMotivation("🌱 Every journey begins with a single step");
        setRecommendation("Create your first saving goal today!");
        return;
      }

      const totalGoals = goals.length;
      const completed = goals.filter(
        (g) => parseFloat(g.currentAmount) >= parseFloat(g.targetAmount)
      ).length;
      const avgProgress =
        goals.reduce(
          (sum, g) =>
            sum + (parseFloat(g.currentAmount) / parseFloat(g.targetAmount)),
          0
        ) / totalGoals;

      const now = new Date();
      const recent = expenses.some((e) => {
        const date = new Date(e.date);
        return (now - date) / (1000 * 60 * 60 * 24) < 14;
      });
      const inactive = !recent;

      if (completed === totalGoals && totalGoals > 0) {
        setMotivation("🏁 You’ve mastered financial discipline!");
        setRecommendation("Set new investment or long-term growth goals.");
      } else if (inactive) {
        setMotivation("⏰ Haven’t checked in lately?");
        setRecommendation("Take a quick look at your recent expenses and adjust your goals.");
      } else if (avgProgress < 0.3) {
        setMotivation("🚀 Small steps build big futures");
        setRecommendation("Focus on fewer goals and increase your contribution this week.");
      } else if (avgProgress < 0.7) {
        setMotivation("💪 You’re building steady momentum");
        setRecommendation("Try reducing non-essential spending to boost progress.");
      } else if (avgProgress < 1) {
        setMotivation("✨ You’re almost there!");
        setRecommendation("Plan your celebration — and maybe set a new challenge!");
      } else {
        setMotivation("🌟 Visionary and consistent");
        setRecommendation("Diversify into investments or emergency funds next.");
      }

      // 🧠 Optional reflection
      const reflections = [
        "What’s one habit that helped you save more this month?",
        "Is there one expense you could trim next week?",
        "How would achieving this goal make your life easier?",
      ];
      if (Math.random() < 0.4) {
        setReflection(reflections[Math.floor(Math.random() * reflections.length)]);
      }
    };

    loadInsights();
  }, []);

  return (
    <View style={styles.container}>
      {/* Motivation Card */}
      <View style={styles.messageCard}>
        <View style={styles.row}>
          <Ionicons name="leaf-outline" size={20} color="#3C7A5D" />
          <Text style={styles.messageTitle}>Motivation</Text>
        </View>
        <Text style={styles.messageText}>{motivation}</Text>
      </View>

      {/* Recommendation Card */}
      <View style={styles.reminderCard}>
        <View style={styles.row}>
          <Ionicons name="bulb-outline" size={20} color="#856404" />
          <Text style={styles.reminderTitle}>Recommended Next Step</Text>
        </View>
        <Text style={styles.reminderText}>{recommendation}</Text>
      </View>

      {/* Reflection Prompt */}
      {reflection ? (
        <View style={styles.reflectionCard}>
          <Text style={styles.reflectionLabel}>💭 Reflection</Text>
          <Text style={styles.reflectionText}>{reflection}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  // 🌿 Motivation card
  messageCard: {
    backgroundColor: "#EAFBF3",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#7AD0A4",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  messageTitle: {
    fontWeight: "700",
    color: "#2E5E4E",
    marginLeft: 6,
  },
  messageText: {
    fontSize: 14,
    color: "#2F473D",
    lineHeight: 20,
  },

  // 🎯 Recommendation card
  reminderCard: {
    backgroundColor: "#FFF8E1",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#FFD24C",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reminderTitle: {
    fontWeight: "700",
    color: "#7C5C00",
    marginLeft: 6,
  },
  reminderText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },

  // 💭 Reflection prompt
  reflectionCard: {
    backgroundColor: "#F4F6F8",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#C0C0C0",
  },
  reflectionLabel: {
    fontWeight: "700",
    color: "#3E3E3E",
    marginBottom: 4,
  },
  reflectionText: {
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
  },
});
