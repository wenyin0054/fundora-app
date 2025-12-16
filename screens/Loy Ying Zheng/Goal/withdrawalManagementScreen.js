import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { FDSValidatedInput } from "../../reuseComponet/DesignSystem";
import { useUser } from "../../reuseComponet/UserContext";
import {
  getPendingWithdrawals,
  getAllWithdrawals,
  confirmWithdrawal,
  cancelWithdrawal,
  processMaturedAllocations,
  deleteWithdrawalHistory
} from "../../../database/SQLite";
import { FDSButton } from "../../reuseComponet/DesignSystem";

export default function WithdrawalManagementScreen({ navigation }) {
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [confirmedAmount, setConfirmedAmount] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(null); // '2025-12'
  const confirmedAmountRef = useRef(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const { userId } = useUser();

  const loadData = async () => {
    try {
      const pending = await getPendingWithdrawals(userId);
      const all = await getAllWithdrawals(userId);
      setPendingWithdrawals(pending);
      setAllWithdrawals(all);
    } catch (error) {
      console.error("❌ Load withdrawal data error:", error);
      Alert.alert("Error", "Failed to load withdrawal data");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      processMaturedAllocations(userId).catch(console.error);
    }, [])
  );

  const handleConfirmWithdrawal = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setConfirmedAmount(withdrawal.withdrawal_amount.toString());
    setModalVisible(true);
  };


  const confirmWithdrawalAction = async () => {
    const amountValid = confirmedAmountRef.current?.validate();

    if (!amountValid) {
      return;
    }

    try {
      await confirmWithdrawal(userId, selectedWithdrawal.id, parseFloat(confirmedAmount));
      setModalVisible(false);
      await loadData();
      Alert.alert("Success", "Withdrawal confirmed successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to confirm withdrawal");
      console.error("❌ Confirm withdrawal error:", error);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    Alert.alert(
      "Cancel Withdrawal",
      "Are you sure you want to cancel this withdrawal?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await cancelWithdrawal(userId, withdrawalId);
              await loadData();
              Alert.alert("Success", "Withdrawal cancelled");
            } catch (error) {
              Alert.alert("Error", "Failed to cancel withdrawal");
            }
          }
        }
      ]
    );
  };

  const handleDeleteWithdrawal = (withdrawalId) => {
    Alert.alert(
      "Delete Record",
      "This will permanently remove the withdrawal history. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteWithdrawalHistory(userId, withdrawalId);
            await loadData();
          }
        }
      ]
    );
  };
  const filteredWithdrawals = allWithdrawals.filter(w => {
    if (selectedGoalId && w.goalId !== selectedGoalId) return false;

    if (w.status === 'pending') return false;

    if (selectedMonth) {
      const month = w.withdrawal_date.slice(0, 7);
      if (month !== selectedMonth) return false;
    }

    return true;
  });

  const uniqueGoals = Array.from(
    new Map(
      allWithdrawals
        .filter(w => w.goalId && w.goalName)
        .map(w => [w.goalId, w.goalName])
    )
  ).map(([id, name]) => ({ id, name }));


  const selectedGoalName =
    selectedGoalId
      ? uniqueGoals.find(g => g.id === selectedGoalId)?.name
      : null;


  const renderWithdrawalItem = (withdrawal, isPending = false) => (
    <View key={withdrawal.id} style={styles.withdrawalItem}>
      <View style={styles.withdrawalHeader}>
        <Text style={styles.goalName}>{withdrawal.goalName}</Text>
        <Text style={styles.accountInfo}>
          {withdrawal.institution_name} - {withdrawal.account_name}
        </Text>
      </View>

      <View style={styles.amountSection}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Principal:</Text>
          <Text style={styles.amountValue}>RM {withdrawal.principal_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Interest:</Text>
          <Text style={[styles.amountValue, styles.interestText]}>
            RM {withdrawal.interest_amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Withdrawal Amount:</Text>
          <Text style={styles.amountValue}>RM {withdrawal.withdrawal_amount.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.dateText}>
        Requested: {new Date(withdrawal.withdrawal_date).toLocaleDateString()}
      </Text>

      {withdrawal.confirmed_date && (
        <Text style={styles.dateText}>
          Confirmed: {new Date(withdrawal.confirmed_date).toLocaleDateString()}
        </Text>
      )}

      {isPending && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleConfirmWithdrawal(withdrawal)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelWithdrawal(withdrawal.id)}
          >
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {withdrawal.status === 'completed' && (
        <View style={[styles.statusBadge, styles.completedBadge]}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      )}

      {withdrawal.status === 'cancelled' && (
        <View style={[styles.statusBadge, styles.cancelledBadge]}>
          <Text style={styles.statusText}>Cancelled</Text>
        </View>
      )}

      {withdrawal.status !== 'pending' && (
        <View style={{ marginTop: 12 }}>
          <FDSButton
            title="Delete record"
            mode="danger"
            icon="trash-outline"
            onPress={() => handleDeleteWithdrawal(withdrawal.id)}
          />
        </View>

      )}


    </View>
  );

const handleCycleGoalFilter = () => {
  if (uniqueGoals.length === 0) return;

  // If currently "All Goals", select first goal
  if (selectedGoalId === null) {
    setSelectedGoalId(uniqueGoals[0].id);
    return;
  }

  // Find current index
  const currentIndex = uniqueGoals.findIndex(
    g => g.id === selectedGoalId
  );

  // If not found or last → reset to All Goals
  if (currentIndex === -1 || currentIndex === uniqueGoals.length - 1) {
    setSelectedGoalId(null);
  } else {
    setSelectedGoalId(uniqueGoals[currentIndex + 1].id);
  }
};

  return (
    <View style={styles.container}>
      <AppHeader
        title="Withdrawal Management"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "pending" && styles.activeTab]}
          onPress={() => setSelectedTab("pending")}
        >
          <Text style={[styles.tabText, selectedTab === "pending" && styles.activeTabText]}>
            Pending ({pendingWithdrawals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "history" && styles.activeTab]}
          onPress={() => setSelectedTab("history")}
        >
          <Text style={[styles.tabText, selectedTab === "history" && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === "pending" && (
          <>
            {pendingWithdrawals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-circle" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No pending withdrawals</Text>
              </View>
            ) : (
              pendingWithdrawals.map(withdrawal => renderWithdrawalItem(withdrawal, true))
            )}
          </>
        )}

        {selectedTab === "history" && (
          <>
            {/* FILTER BAR */}
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={styles.filterChip}
                onPress={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
              >
                <Text style={styles.filterText}>
                  {selectedMonth ? selectedMonth : "All Months"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterChip}
                onPress={handleCycleGoalFilter}
              >
                <Text style={styles.filterText}>
                  {selectedGoalName || "All Goals"}
                </Text>
              </TouchableOpacity>

              {(selectedMonth || selectedGoalId) && (
                <TouchableOpacity
                  style={[styles.filterChip, styles.clearChip]}
                  onPress={() => {
                    setSelectedMonth(null);
                    setSelectedGoalId(null);
                  }}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* HISTORY LIST */}
            {filteredWithdrawals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No withdrawal history</Text>
              </View>
            ) : (
              filteredWithdrawals.map(w =>
                renderWithdrawalItem(w, false)
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Withdrawal</Text>

            {selectedWithdrawal && (
              <>
                <Text style={styles.modalText}>
                  Goal: {selectedWithdrawal.goalName}
                </Text>
                <Text style={styles.modalText}>
                  Account: {selectedWithdrawal.institution_name} - {selectedWithdrawal.account_name}
                </Text>
                <Text style={styles.modalText}>
                  Original Amount: RM {selectedWithdrawal.withdrawal_amount.toFixed(2)}
                </Text>

                <FDSValidatedInput
                  ref={confirmedAmountRef}
                  label="Confirmed Amount"
                  value={confirmedAmount}
                  editable={false}
                  selectTextOnFocus={false}
                  placeholder="Confirmed amount"
                  keyboardType="numeric"
                  validate={(v) => {
                    const amount = parseFloat(v);
                    return v && !isNaN(amount) && amount > 0;
                  }}
                  errorMessage="Amount must be > 0"
                  inputStyle={{
                    backgroundColor: "#F2F2F2",
                    color: "#888"
                  }}
                />
                <Text style={{
                  fontSize: 12,
                  color: "#666",
                  marginTop: 4
                }}>
                  To change the amount, please cancel this withdrawal and enter the correct
                  amount in the fund allocation or withdraw funds step.
                </Text>



                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelModalButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmModalButton]}
                    onPress={confirmWithdrawalAction}
                  >
                    <Text style={styles.modalButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#8AD0AB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  withdrawalItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  withdrawalHeader: {
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  accountInfo: {
    fontSize: 14,
    color: "#666",
  },
  amountSection: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
  },
  amountValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  interestText: {
    color: "#4CAF50",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  updateButton: {
    backgroundColor: "#2196F3",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  completedBadge: {
    backgroundColor: "#E8F5E8",
  },
  cancelledBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    marginVertical: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelModalButton: {
    backgroundColor: "#ccc",
  },
  confirmModalButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: "#9E9E9E",
  },
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 6,
  },
  filterText: {
    fontSize: 12,
    color: "#333",
  },
  clearChip: {
    backgroundColor: "#F44336",
  },
  clearText: {
    color: "#fff",
    fontSize: 12,
  },

});