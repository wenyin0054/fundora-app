import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../../reuseComponet/header";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useUser } from "../../reuseComponet/UserContext";
import {
  updateGoalLocal,
  deleteGoalLocal,
  updateUserSummaryOnEdit,
  getGoalFundAllocations,
  createWithdrawalRecord,
  getSavingAccounts,
  hasPendingWithdrawal,
} from "../../../database/SQLite";
import ValidatedInput from "../../reuseComponet/ValidatedInput";
import { Animated } from "react-native";



export default function GoalDetailScreen({ route, navigation }) {
  const { goal } = route.params;

  const [goalName, setGoalName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [progress, setProgress] = useState(0);

  const [fundAllocations, setFundAllocations] = useState([]);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");


  const [deadlineError, setDeadlineError] = useState(false);
  const deadlineShake = useRef(new Animated.Value(0)).current;

  const triggerDeadlineShake = () => {
    deadlineShake.setValue(0);
    Animated.sequence([
      Animated.timing(deadlineShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(deadlineShake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(deadlineShake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(deadlineShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };


  const nameRef = useRef();
  const amountRef = useRef();


  const { userId } = useUser();

  const loadGoalData = useCallback(async () => {
    if (!goal) return;

    setGoalName(goal.goalName || goal.title || "");
    setDescription(goal.description || goal.desc || "");
    setTargetAmount(goal.targetAmount?.toString() || goal.target?.toString() || "");
    setCurrentAmount(goal.currentAmount?.toString() || goal.saved?.toString() || "0");
    setDeadline(goal.deadline ? new Date(goal.deadline + "T00:00:00") : new Date());

    const current = parseFloat(goal.currentAmount?.toString() || goal.saved?.toString() || "0");
    const target = parseFloat(goal.targetAmount?.toString() || goal.target?.toString() || "0");
    setProgress(target > 0 ? Math.min(current / target, 1) : 0);

    try {
      const [allocations, accounts] = await Promise.all([
        getGoalFundAllocations(userId, goal.id),
        getSavingAccounts(userId),
      ]);

      // 修正：基於實際利率計算利息收益，並檢查待處理提取
      const allocationsWithCurrentValue = await Promise.all(
        allocations.map(async (allocation) => {
          const principal = allocation.allocated_amount || 0;
          const interestRate = allocation.interest_rate || 0;
          const startDate = allocation.allocation_date ? new Date(allocation.allocation_date) : new Date();
          const currentDate = new Date();

          // 計算經過的時間（年）
          const timeInYears = (currentDate - startDate) / (1000 * 60 * 60 * 24 * 365);

          // 計算當前價值：本金 * (1 + 利率)^時間
          let currentValue = principal;
          let interestEarned = 0;

          if (interestRate > 0 && timeInYears > 0) {
            currentValue = principal * Math.pow(1 + interestRate / 100, timeInYears);
            interestEarned = currentValue - principal;
          }

          // 檢查是否有待處理的提取請求
          const hasPending = await hasPendingWithdrawal(userId, allocation.id);

          return {
            ...allocation,
            current_value: parseFloat(currentValue.toFixed(2)),
            interest_earned: parseFloat(interestEarned.toFixed(2)),
            interest_rate: interestRate,
            has_pending_withdrawal: hasPending  // 添加這個標記
          };
        })
      );

      console.log("📊 Allocations with current value:", allocationsWithCurrentValue);
      setFundAllocations(allocationsWithCurrentValue);
    } catch (error) {
      console.error("❌ loadGoalData error:", error);
    }
  }, [goal]);

  useFocusEffect(
    useCallback(() => {
      loadGoalData();
    }, [loadGoalData])
  );



  const onUpdate = async () => {
    // -------- 1️⃣ No Changes Check --------
    const oldDeadline = goal.deadline;
    const currentDeadline = deadline.toISOString().split("T")[0];

    const noChange =
      goalName === goal.goalName &&
      targetAmount === goal.targetAmount.toString() &&
      currentDeadline === oldDeadline;

    if (noChange) {
      return Alert.alert("No Changes", "You didn't modify any information.");
    }

    // -------- 2️⃣ Validate Inputs --------
    // Goal Name
    if (!nameRef.current.validate()) return;

    // Target Amount
    if (!amountRef.current.validate()) return;

    // -------- 3️⃣ Validate Deadline (future only) --------
    const today = new Date();
    const picked = new Date(deadline);

    if (picked <= today) {
      setDeadlineError(true);
      triggerDeadlineShake();
      return Alert.alert("Invalid Deadline", "Please choose a future date.");
    }

    setDeadlineError(false);

    // -------- 4️⃣ Save to DB --------
    try {
      await updateGoalLocal(
        userId,
        goal.id,
        goalName.trim(),
        description.trim(),
        parseFloat(targetAmount),
        parseFloat(currentAmount),
        currentDeadline
      );

      Alert.alert("Success", "Goal updated successfully!");
      navigation.goBack();

    } catch (err) {
      console.error("❌ Failed to update goal:", err);
      Alert.alert("Error", "Failed to update this goal.");
    }
  };



  const handleDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoalLocal(userId, goal.id);
              Alert.alert("Deleted", "Goal has been deleted successfully.");
              navigation.goBack();
            } catch (error) {
              console.error("❌ deleteGoalLocal error:", error);
              Alert.alert("Error", "Failed to delete goal.");
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = (allocation) => {
    setSelectedAllocation(allocation);
    setWithdrawAmount(allocation.current_value?.toString() || allocation.allocated_amount.toString());
    setWithdrawModalVisible(true);
  };

  const handleWithdrawAll = () => {
    if (fundAllocations.length === 0) {
      Alert.alert("No Funds", "This goal has no allocated funds to withdraw.");
      return;
    }

    const totalAmount = fundAllocations.reduce((sum, allocation) =>
      sum + allocation.current_value, 0
    );

    Alert.alert(
      "Withdraw All Funds",
      `Do you want to withdraw all RM${totalAmount.toFixed(2)} from this goal?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw All",
          onPress: () => {
            fundAllocations.forEach(allocation => {
              const amount = allocation.current_value;
              const principal = allocation.allocated_amount;
              const interest = allocation.interest_earned;

              createWithdrawalRecord(
                userId,
                goal.id,
                allocation.id,
                amount,
                principal,
                interest,
                `Full withdrawal from ${allocation.account_name}`
              ).catch(console.error);
            });

            Alert.alert(
              "Withdrawal Requests Created",
              `${fundAllocations.length} withdrawal requests have been created. Please go to Withdrawal Management to confirm.`,
              [
                {
                  text: "Go to Management",
                  onPress: () => navigation.navigate('WithdrawalManagement')
                },
                {
                  text: "Stay Here",
                  style: "cancel"
                }
              ]
            );
          }
        }
      ]
    );
  };

  // 智能返回顯示文本的函數
  const calculateReturnDisplay = (principal, finalAmount, startDateStr) => {
    const startDate = new Date(startDateStr);
    const currentDate = new Date();
    const timeInDays = Math.max((currentDate - startDate) / (1000 * 60 * 60 * 24), 0.1); // 最少0.1天避免除以0
    const timeInYears = timeInDays / 365;

    const absoluteReturn = ((finalAmount - principal) / principal) * 100;

    // 根據時間長度決定顯示方式
    if (timeInDays < 7) {
      // 少於7天：顯示絕對收益率
      return `${absoluteReturn.toFixed(2)}%`;
    } else if (timeInDays < 30) {
      // 7-30天：顯示絕對收益率 + 天數
      return `${absoluteReturn.toFixed(2)}% (${timeInDays.toFixed(0)} days)`;
    } else {
      // 超過30天：顯示年化收益率
      const annualReturn = (Math.pow(finalAmount / principal, 1 / timeInYears) - 1) * 100;
      return `${annualReturn.toFixed(2)}% annually`;
    }
  };

  const confirmWithdrawal = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid withdrawal amount");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const principal = selectedAllocation.allocated_amount;

    // 計算實際收益（可能為負數）
    const actualProfit = amount - principal;
    const profitPercentage = ((actualProfit / principal) * 100).toFixed(2);

    // 計算持有時間
    const startDate = new Date(selectedAllocation.allocation_date);
    const currentDate = new Date();
    const timeInDays = Math.max((currentDate - startDate) / (1000 * 60 * 60 * 24), 0.1);
    const timeInYears = timeInDays / 365;

    try {
      // 只創建提取記錄，不更新其他表
      const result = await createWithdrawalRecord(
        userId,
        goal.id,
        selectedAllocation.id,
        amount,
        principal,
        actualProfit,
        `Withdrawal from ${selectedAllocation.account_name}`
      );

      if (result && result.success) {
        setWithdrawModalVisible(false);

        // 顯示計算結果
        const profitText = actualProfit >= 0 ?
          `Profit: +RM ${actualProfit.toFixed(2)} (+${profitPercentage}%)` :
          `Loss: -RM ${Math.abs(actualProfit).toFixed(2)} (-${Math.abs(parseFloat(profitPercentage))}%)`;

        Alert.alert(
          "Withdrawal Request Created",
          `Your withdrawal request has been created successfully.\n\n${profitText}\nHeld for: ${timeInDays.toFixed(1)} days`,
          [
            {
              text: "Go to Management",
              onPress: () => navigation.navigate('WithdrawalManagement')
            },
            {
              text: "Stay Here",
              style: "cancel"
            }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to create withdrawal request");
      }
    } catch (error) {
      console.error("❌ confirmWithdrawal error:", error);
      Alert.alert("Error", "Failed to create withdrawal request");
    }
  };

  // 計算預覽組件
  const renderCalculationPreview = () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || !selectedAllocation) return null;

    const startDate = new Date(selectedAllocation.allocation_date);
    const currentDate = new Date();
    const timeInDays = Math.max((currentDate - startDate) / (1000 * 60 * 60 * 24), 0.1);
    const amount = parseFloat(withdrawAmount);
    const principal = selectedAllocation.allocated_amount;

    return (
      <View style={[
        styles.calculationPreview,
        amount < principal && styles.negativeCalculation
      ]}>
        <Text style={styles.calculationTitle}>Calculation Preview:</Text>

        <View style={styles.calculationRow}>
          <Text style={styles.calculationLabel}>Principal:</Text>
          <Text style={styles.calculationValue}>
            RM {principal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.calculationRow}>
          <Text style={styles.calculationLabel}>Withdrawal:</Text>
          <Text style={styles.calculationValue}>
            RM {amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.calculationRow}>
          <Text style={styles.calculationLabel}>Profit/Loss:</Text>
          <Text style={[
            styles.calculationValue,
            amount >= principal ? styles.positiveText : styles.negativeText
          ]}>
            {amount >= principal ? '+' : ''}
            RM {(amount - principal).toFixed(2)}
          </Text>
        </View>

        {/* 顯示計算的收益率 */}
        {(amount !== principal) && (
          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>
              {timeInDays < 30 ? "Return:" : "Annual Return:"}
            </Text>
            <Text style={[
              styles.calculationValue,
              amount >= principal ? styles.positiveText : styles.negativeText
            ]}>
              {calculateReturnDisplay(principal, amount, selectedAllocation.allocation_date)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderProgressBar = (progress) => (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { flex: progress }]} />
      <Text style={styles.progressLable}>{(progress * 100).toFixed(1)}%</Text>
    </View>
  );

  const renderFundAllocation = (allocation) => (
    <View key={allocation.id} style={styles.allocationItem}>
      <View style={styles.allocationHeader}>
        <Text style={styles.allocationAccount}>
          {allocation.icon_name} {allocation.institution_name} - {allocation.account_name}
        </Text>
        <Text style={styles.allocationAmount}>
          RM {allocation.current_value.toFixed(2)}
        </Text>
      </View>

      <View style={styles.allocationDetails}>
        <Text style={styles.allocationDetail}>
          Principal: RM {allocation.allocated_amount.toFixed(2)}
        </Text>
        <Text style={[styles.allocationDetail, styles.profitText]}>
          Interest Earned: +RM {allocation.interest_earned.toFixed(2)}
        </Text>
        <Text style={styles.allocationDetail}>
          Return: {allocation.interest_rate || 0}%
        </Text>
        {allocation.maturity_date && (
          <Text style={styles.allocationDetail}>
            Matures: {new Date(allocation.maturity_date).toLocaleDateString()}
          </Text>
        )}

        {/* Display the extraction status */}
        {allocation.has_pending_withdrawal && (
          <View style={styles.pendingWithdrawalBadge}>
            <Ionicons name="time-outline" size={12} color="#FF9800" />
            <Text style={styles.pendingWithdrawalText}>
              Withdrawal Requested
            </Text>
          </View>
        )}
      </View>

      {/* Display different buttons based on the extraction status */}
      {allocation.has_pending_withdrawal ? (
        <TouchableOpacity
          style={[styles.withdrawButton, styles.withdrawButtonDisabled]}
          disabled={true}
        >
          <Ionicons name="lock-closed-outline" size={16} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdrawal Requested</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => handleWithdraw(allocation)}
        >
          <Ionicons name="cash-outline" size={16} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Goal Detail"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.card}>
            {renderProgressBar(progress)}
            <Text style={[styles.label, { alignSelf: "center" }]}>Goal Progress</Text>

            {progress >= 1 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedText}>🎉 Goal Completed! 🎉</Text>
                <TouchableOpacity
                  style={styles.withdrawAllButton}
                  onPress={() => handleWithdrawAll()}
                >
                  <Ionicons name="trophy-outline" size={20} color="#fff" />
                  <Text style={styles.withdrawAllText}>Withdraw All Funds</Text>
                </TouchableOpacity>
              </View>
            )}

            <ValidatedInput
              label="Goal Name"
              value={goalName}
              onChangeText={setGoalName}
              placeholder="Enter goal name"
              placeholderTextColor={"#c5c5c5ff"}
              validate={(v) => v.trim().length >= 2}
              errorMessage="Goal name must be at least 2 characters"
              ref={nameRef}
            />


            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <ValidatedInput
              label="Target Amount (RM)"
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              validate={(v) => {
                const num = parseFloat(v);
                if (isNaN(num)) return false;
                return num >= parseFloat(currentAmount);
              }}
              errorMessage={`Amount must be ≥ RM ${currentAmount}`}
              ref={amountRef}
            />


            <Text style={styles.label}>Current Saved Amount (RM)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="wallet-outline" size={20} color="#6c757d" />
              <TextInput
                value={Number(currentAmount).toFixed(2)}
                style={styles.input}
                editable={false}
                showSoftInputOnFocus={false}
              /> 
            </View>


            {/* 資金分配部分 */}
            {fundAllocations.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Fund Allocations</Text>
                {fundAllocations.map(renderFundAllocation)}

                <TouchableOpacity
                  style={styles.manageWithdrawalsButton}
                  onPress={() => navigation.navigate('WithdrawalManagement')}
                >
                  <Ionicons name="list-outline" size={16} color="#fff" />
                  <Text style={styles.manageWithdrawalsText}>Manage Withdrawals</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Deadline</Text>
            <Animated.View
              style={[
                styles.dateInput,
                deadlineError && { borderColor: "#ff6b6b", borderWidth: 2 },
                { transform: [{ translateX: deadlineShake }] }
              ]}
            >
              <TouchableOpacity onPress={() => setShowPicker(true)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={18} color="#6c757d" />
                <Text style={styles.dateText}>{deadline.toDateString().slice(4)}</Text>
              </TouchableOpacity>
            </Animated.View>


            {showPicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (date) setDeadline(date);
                }}
              />
            )}

            <TouchableOpacity style={styles.saveButton} onPress={onUpdate}>
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete Goal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>

      {/* 提取模態框 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>

            {selectedAllocation && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Account:</Text>
                  <Text style={styles.modalValue}>
                    {selectedAllocation.institution_name} - {selectedAllocation.account_name}
                  </Text>
                </View>

                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Principal:</Text>
                  <Text style={styles.modalValue}>
                    RM {selectedAllocation.allocated_amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Current Value:</Text>
                  <Text style={styles.modalValue}>
                    RM {selectedAllocation.current_value.toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Withdrawal Amount:</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder={`Enter actual amount (max: RM ${selectedAllocation.current_value.toFixed(2)})`}
                  placeholderTextColor={"#c5c5c5ff"}
                />

                {/* 實時計算顯示 */}
                {renderCalculationPreview()}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setWithdrawModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={confirmWithdrawal}
                  >
                    <Text style={styles.modalButtonText}>Request Withdrawal</Text>
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
  scrollContainer: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 14, color: "#555", marginBottom: 5, marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  input: { flex: 1, height: 45, marginLeft: 8 },
  textArea: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    height: 90,
    textAlignVertical: "top",
    padding: 10,
    fontSize: 14,
    color: "#333",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  dateText: { marginLeft: 10, color: "#333" },
  progressBar: {
    flexDirection: "row",
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    marginVertical: 6,
  },
  progressFill: { backgroundColor: "#8AD0AB" },
  progressLable: {
    position: "absolute",
    textAlign: "center",
    width: "100%",
    color: "black",
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#9cd8b3",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15
  },
  deleteText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  // 資金分配樣式
  allocationItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#8AD0AB",
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  allocationAccount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  allocationAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E5E4E",
  },
  allocationDetails: {
    marginBottom: 8,
  },
  allocationDetail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  profitText: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  withdrawButton: {
    backgroundColor: "#FF9800",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  manageWithdrawalsButton: {
    backgroundColor: "#2196F3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  manageWithdrawalsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },

  // 模態框樣式
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
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  modalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  modalValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    marginVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },

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

  pendingWithdrawalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pendingWithdrawalText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
    marginLeft: 4,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },

  // 計算預覽樣式
  calculationPreview: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  negativeCalculation: {
    backgroundColor: '#FFEBEE',
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E5E4E',
    marginBottom: 8,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calculationLabel: {
    fontSize: 12,
    color: '#666',
  },
  calculationValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  positiveText: {
    color: '#4CAF50',
  },
  negativeText: {
    color: '#F44336',
  },
});