import React, { useState, useEffect } from "react";
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
import { useUser } from "../../reuseComponet/UserContext";
import {
  getPendingWithdrawals,
  getAllWithdrawals,
  confirmWithdrawal,
  cancelWithdrawal,
  updateAllocationCurrentValue,
  processMaturedAllocations
} from "../../../database/SQLite";

export default function WithdrawalManagementScreen({ navigation }) {
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [confirmedAmount, setConfirmedAmount] = useState("");

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
    if (!confirmedAmount || isNaN(confirmedAmount)) {
      Alert.alert("Error", "Please enter a valid amount");
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
            +RM {withdrawal.interest_amount.toFixed(2)}
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
    </View>
  );

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
            {allWithdrawals.filter(w => w.status !== 'pending').length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No withdrawal history</Text>
              </View>
            ) : (
              allWithdrawals
                .filter(withdrawal => withdrawal.status !== 'pending')
                .map(withdrawal => renderWithdrawalItem(withdrawal, false))
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

                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter confirmed amount"
                  placeholderTextColor={"#c5c5c5ff"}
                  keyboardType="numeric"
                  value={confirmedAmount}
                  onChangeText={setConfirmedAmount}
                />

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

});