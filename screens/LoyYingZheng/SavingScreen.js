import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ProgressBarAndroid, 
  Platform,
} from "react-native";
import AppHeader from "./reuseComponet/header.js";

export default function SavingsPlanner() {
  const goals = [
    {
      id: "1",
      title: "Dream Home Down Payment",
      desc: "Saving for a down payment on our first home.",
      saved: 32500,
      target: 50000,
      due: "2025-12-31",
      suggested: 1231,
    },
    {
      id: "2",
      title: "Emergency Fund",
      desc: "Building a safety net for unexpected expenses.",
      saved: 7800,
      target: 10000,
      due: "2024-09-30",
      suggested: 191,
    },
    {
      id: "3",
      title: "New Car",
      desc: "Saving up for a new, more reliable vehicle.",
      saved: 3500,
      target: 12000,
      due: "2026-06-30",
      suggested: 202,
    },
  ];

  const renderProgressBar = (progress) => {
    return (
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <Text style={styles.progressLable}>{(progress * 100).toFixed(1)}%</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Savings Planner" />
      <ScrollView style={styles.scrollContent}>

        {/* Goals List */}
        {goals.map((goal) => {
          const progress = goal.saved / goal.target;
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
              <TouchableOpacity style={styles.btn}>
                <Text style={styles.btnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          );
        })}

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
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add New Goal</Text>
        </TouchableOpacity>
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
    paddingTop: 20, 
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    alignmentSelf: "center",
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
    color: "#black",
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
