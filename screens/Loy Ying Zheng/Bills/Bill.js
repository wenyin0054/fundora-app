// src/screens/BillTracker.js
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import AppHeader from "../../reuseComponet/header";
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { DrawerActions } from '@react-navigation/native';
import { useUser } from "../../reuseComponet/UserContext";
import {
  initDB,
  getBillsLocal,
  getRemindersLocal,
  deleteReminderLocal,
  checkDueBillsAndGenerateReminders
} from "../../../database/SQLite";
import FinancialTipBanner from "../../LaiWenYin/TutorialModule/FinancialTipBanner";
import { useTipManager } from "../../LaiWenYin/TutorialModule/TipManager.js";
import { Ionicons } from '@expo/vector-icons';

export default function BillTracker({ navigation }) {
  const [income, setIncome] = useState("");
  const [dsrResult, setDsrResult] = useState(null);
  const [bills, setBills] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [commitment, setCommitment] = useState(0);
  const [autoCommitment, setAutoCommitment] = useState(0);
  const { userId, userLevel, isLoading: userLoading } = useUser();
  const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);



  const showDSRtips = () => {
    showTip('billTracker', 'dsrCalculator');
  };
  const showRemindertips = () => {
    showTip('billTracker', 'reminders');
  };

  const showGrossIncomeTip = () => {
    showTip('billTracker', 'dsrCalculator.grossIncome');
  };
  const showCommitmentsTip = () => {
    showTip('billTracker', 'dsrCalculator.monthlyCommitments');
  };
  const showDSRRatioTip = () => {
    showTip('billTracker', 'dsrCalculator.dsrRatio');
  };
  const showEligibilityTip = () => {
    showTip('billTracker', 'dsrCalculator.eligibilityStatus');
  };

  const showAutoAssignTip = () => {
    showTip('billTracker', 'autoAssignCommitments');
  };
  const showSeeAllTip = () => {
    showTip('billTracker', 'seeAllBills');
  };
  const showBillStatusesTip = () => {
    showTip('billTracker', 'billStatuses');
  };
  const showEmptyRemindersTip = () => {
    showTip('billTracker', 'emptyReminders');
  };
  const showEmptyBillsTip = () => {
    showTip('billTracker', 'emptyBills');
  };

  const loadCommitmentFromDB = async () => {
    try {
      // Assume getBillsLocal returns all bills; apply commitment filtering
      const bills = await getBillsLocal(userId);

      // Filter bills that are marked as commitment (your DB must include `isCommitment` field)
      const commitmentBills = bills.filter(b => b.isCommitment);

      // Calculate total commitment amount
      const total = commitmentBills.reduce(
        (sum, b) => sum + parseFloat(b.amount || 0),
        0
      );

      setCommitment(total.toString()); // Store as string so it's compatible with TextInput
    } catch (err) {
      console.error("❌ loadCommitmentFromDB error:", err);
    }
  };

  const loadAllData = async () => {
    try {
      await initDB();
      await loadCommitmentFromDB();
      await checkDueBillsAndGenerateReminders(userId); // Check for due bills and generate reminders
      const b = await getBillsLocal(userId);
      const r = await getRemindersLocal(userId);

      setBills(b);
      setReminders(r);

      // Reload bills after checking due dates to update status
      const updatedBills = await getBillsLocal(userId);
      setBills(updatedBills);
    } catch (err) {
      console.error("❌ loadAllData error:", err);
    }
  };

  useEffect(() => {
    // initial load
    loadAllData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );


  // DSR calculation uses monthly debts computed from DB
  const calculateDSR = () => {
    if (!income || !commitment) {
      Alert.alert("Missing Information", "Please enter both income and commitments.");
      return;
    }

    const incomeNum = parseFloat(income);
    const commitNum = parseFloat(commitment);

    if (incomeNum <= 0) {
      Alert.alert("Invalid Input", "Income must be greater than zero.");
      return;
    }

    const dsr = ((commitNum / incomeNum) * 100).toFixed(1);

    // Interpret score
    let label = "";
    let advice = [];

    if (dsr < 30) {
      label = "Excellent — Strong Loan Eligibility";
      advice = [
        "You qualify for most loan products.",
        "You may consider refinancing to optimize your portfolio.",
        "Maintain stable spending to retain this score."
      ];
    } else if (dsr < 50) {
      label = "Good — Eligible for Standard Loans";
      advice = [
        "Your financial health is stable.",
        "Avoid increasing long-term commitments.",
        "Consider reducing small debts to improve DSR further."
      ];
    } else if (dsr < 60) {
      label = "Moderate — Limited Loan Options";
      advice = [
        "Reduce non-essential commitments.",
        "Consolidate credit card debts if possible.",
        "Avoid taking new loans temporarily."
      ];
    } else {
      label = "High Risk — Loan Approval Unlikely";
      advice = [
        "Prioritize reducing debt immediately.",
        "Avoid applying for any major loans now.",
        "Consider restructuring or extending loan tenure."
      ];
    }

    // Simple future simulation
    const simulatedDsr = (
      ((commitNum - 200) / incomeNum) *
      100
    ).toFixed(1);

    setDsrResult({
      value: dsr,
      label,
      simulated: simulatedDsr,
      advice,
    });
  };



  const refreshReminders = async () => {
    try {
      const r = await getRemindersLocal(userId);
      setReminders(r);
      await checkDueBillsAndGenerateReminders(userId, false); // Also check for due bills

      // Reload bills to update status
      const updatedBills = await getBillsLocal(userId);
      setBills(updatedBills);
    } catch (err) {
      console.error("❌ refreshReminders error:", err);
    }
  };


  const renderReminderCard = (rem, idx) => {
    const handleDelete = async () => {
      Alert.alert(
        "Delete Reminder",
        "Are you sure you want to remove this reminder?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteReminderLocal(userId, rem.id);
              await refreshReminders(); // reload after delete
            }
          }
        ]
      );
    };

    return (
      <View key={rem.id || idx} style={styles.reminderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reminderTitle}>{rem.message}</Text>
          <Text style={styles.reminderDate}>
            {rem.reminderDate || ""}
          </Text>
        </View>

        <TouchableOpacity style={styles.reminderBtn} onPress={handleDelete}>
          <Text style={styles.reminderBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };


  // group upcoming bills (we'll show next 3)
  const upcoming = bills.slice(0, 3);
  console.log(upcoming);


  return (
    <View style={styles.container}>
      <AppHeader
        title="Bill & DSR Tracker"
        showLeftButton={true}
        leftIcon="menu"
        onLeftPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >

        <ScrollView
          contentContainerStyle={styles.scrollContent}
        >
          {/* Reminders */}
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Reminder</Text>
              <TouchableOpacity onPress={showRemindertips} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {reminders.length === 0 ? (
              <View style={styles.emptyStateRow}>
                <Text style={styles.emptyHint}>No reminders. You're all caught up! 🎉</Text>
                <TouchableOpacity onPress={showEmptyRemindersTip} style={styles.infoIconTouchable}>
                  <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : (
              Object.values(
                reminders.reduce((acc, r) => {
                  if (
                    !acc[r.billId] ||
                    new Date(r.reminderDate) > new Date(acc[r.billId].reminderDate)
                  ) {
                    acc[r.billId] = r;
                  }
                  return acc;
                }, {})
              )
                .sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate))
                .slice(0, 2)
                .map((r, idx) => renderReminderCard(r, idx))
            )}
          </View>


          {/* Upcoming Bills */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>Upcoming Bills</Text>
              <TouchableOpacity onPress={showBillStatusesTip} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={showSeeAllTip} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate && navigation.navigate("SeeAllBill")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.upcomingCard}>
            {upcoming.length === 0 ? (
              <View style={styles.emptyStateRow}>
                <Text style={styles.emptyHint}>No upcoming bills — add one below.</Text>
                <TouchableOpacity onPress={showEmptyBillsTip} style={styles.infoIconTouchable}>
                  <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : (
              upcoming.map((b) => {

                const status = b.status || "Upcoming";
                const isOverdue = status === "Overdue";
                const isDueSoon = status === "DueSoon";

                return (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.billRow}
                    onPress={() => navigation.navigate("BillDetail", { bill: b })}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.billLabel}>{b.billName}</Text>
                      <Text style={styles.billMeta}>{formatDate(b.dueDate)}</Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[styles.billAmount, isOverdue && styles.overdueAmount]}
                      >
                        RM {b.amount.toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.tag,
                          isOverdue
                            ? styles.tagOverdue
                            : isDueSoon
                              ? styles.tagDueSoon
                              : styles.tagUpcoming,
                        ]}
                      >
                        <Text style={styles.tagText}>{status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate && navigation.navigate("AddBill")}>
              <Text style={styles.addBtnText}>+ Add New Bill</Text>
            </TouchableOpacity>
          </View>

          {/* DSR Calculator */}
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>DSR Calculator</Text>

            <TouchableOpacity onPress={showDSRtips} style={styles.infoIconTouchable}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.dsrCard}>
            {/* Income Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Monthly Gross Income (RM)"
                placeholderTextColor={"#c5c5c5ff"}
                keyboardType="numeric"
                value={income}
                onChangeText={setIncome}
              />
              <TouchableOpacity onPress={showGrossIncomeTip} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>


            {/* Expense Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                value={autoCommitment > 0 ? autoCommitment.toString() : ""}
                placeholder="Monthly Commitments (RM)"
                placeholderTextColor={"#c5c5c5ff"}
                onChangeText={text => {
                  const numericValue = Number(text.replace(/[^0-9]/g, ""));
                  if (!isNaN(numericValue)) setCommitment(numericValue);
                }}
              />
              <TouchableOpacity onPress={showCommitmentsTip} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Auto-assign Button */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.autoCalcBtn, { flex: 1 }]}
                onPress={() => {
                  setAutoCommitment(commitment);
                }}
              >
                <Text style={styles.calcBtnText}>
                  Auto-assign Total Commitments
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={showAutoAssignTip} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>


            <TouchableOpacity style={styles.calcBtn} onPress={calculateDSR}>
              <Text style={styles.calcBtnText}>Calculate DSR</Text>
            </TouchableOpacity>

            {dsrResult && (
              <View style={styles.resultCard}>
                {/* Main DSR Result */}
                <View style={styles.resultHeader}>
                  <Text style={styles.dsrValue}>{dsrResult.value}%</Text>
                  <TouchableOpacity onPress={showDSRRatioTip} style={styles.infoIconTouchable}>
                    <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.resultHeader}>
                  <Text style={styles.dsrLabel}>{dsrResult.label}</Text>
                  <TouchableOpacity onPress={showEligibilityTip} style={styles.infoIconTouchable}>
                    <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Future Simulation */}
                <View style={styles.simulationBox}>
                  <Text style={styles.simTitle}>Future Outcome Simulation</Text>
                  <Text style={styles.simDesc}>
                    If you reduce your monthly commitments by RM 200,
                    your DSR may drop to{" "}
                    <Text style={styles.simHighlight}>{dsrResult.simulated}%</Text>
                    , improving loan eligibility.
                  </Text>
                </View>

                {/* Recommendations */}
                <View style={styles.adviceBox}>
                  <Text style={styles.adviceTitle}>Personalized Advice</Text>
                  {dsrResult.advice.map((item, index) => (
                    <Text key={index} style={styles.adviceItem}>• {item}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAwareScrollView>
      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />
    </View>
  );
}

// helper
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  infoIconTouchable: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  seeAll: {
    color: "#2E8B57",
    fontWeight: "600",
    fontSize: 13,
  },

  // Reminders
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderTitle: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  reminderBtn: {
    backgroundColor: "#7C6EE8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  reminderBtnText: {
    color: "#fff",
    fontWeight: "600",
  },

  // Upcoming card
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  billLabel: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  billMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  billAmount: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "700",
  },
  overdueAmount: {
    color: "#EF4444",
  },
  tag: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  tagUpcoming: {
    backgroundColor: "#6EE7B7",
  },
  tagDueSoon: {
    backgroundColor: "#F59E0B",
  },
  tagOverdue: {
    backgroundColor: "#EF4444",
  },

  addBtn: {
    backgroundColor: "#34D399",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // DSR
  dsrCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  input: {
    backgroundColor: "#F7F7F7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  calcBtn: {
    backgroundColor: "#34D399",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },

  autoCalcBtn: {
    backgroundColor: "#4A6CF7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },



  calcBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  resultCard: {
    marginTop: 14,
    padding: 16,
    backgroundColor: "#F2F5FF",
    borderRadius: 12,
  },

  dsrValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2A44D5",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dsrLabel: {
    fontSize: 16,
    marginTop: 4,
    color: "#333",
    marginBottom: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  simulationBox: {
    backgroundColor: "#E7EDFF",
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },

  simTitle: {
    fontWeight: "600",
    fontSize: 15,
  },

  simDesc: {
    fontSize: 13,
    color: "#444",
    marginTop: 4,
  },

  simHighlight: {
    color: "#2A44D5",
    fontWeight: "700",
  },

  adviceBox: {
    backgroundColor: "#FFF5E1",
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },

  adviceTitle: {
    fontWeight: "600",
    marginBottom: 6,
  },

  adviceItem: {
    fontSize: 13,
    color: "#664400",
    marginBottom: 4,
  },

});
