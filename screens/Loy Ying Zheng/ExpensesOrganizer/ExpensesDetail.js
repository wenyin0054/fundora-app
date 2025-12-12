import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  Platform,
  Animated,
  Vibration,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AddSavingAccountModal from "./AddSavingAccountModal";
import {
  updateExpenseLocal,
  deleteExpenseLocal,
  updateGoalAmount,
  getUserSummary,
  updateUserSummaryOnEdit,
  updateUserSummaryOnDelete,
  updateUserSummaryOnAdd,
  getTagsLocal,
  getEventTagsLocal,
  getActiveEventTagsLocal,
  getGoalsLocal,
  initDB,
  getSavingMethods,
  getSavingAccounts,
  allocateFundToGoal,
  getGoalFundAllocations,
  recalculateMonthlyIncomeSnapshot
} from "../../../database/SQLite";
import AppHeader from "../../reuseComponet/header";
import { useUser } from "../../reuseComponet/UserContext";
import {
  FDSCard,
  FDSLabel,
  FDSValidatedInput,
  FDSValidatedPicker,
  FDSButton,
  FDSColors
} from "../../reuseComponet/DesignSystem";

export default function ExpenseDetail({ route, navigation }) {
  const { expense } = route.params;

  useEffect(() => {
    if (expense) {
      console.log("🧾 Expense Details from DB:");
      console.log(
        "ID:", expense.id,
        "\nUser ID:", expense.userId,
        "\nPayee:", expense.payee,
        "\nAmount:", expense.amount,
        "\nDate:", expense.date,
        "\nTag:", expense.tag,
        "\nEvent Tag:", expense.eventTag,
        "\nPayment Type:", expense.paymentType,
        "\nIs Periodic:", expense.isPeriodic,
        "\nType:", expense.type,
        "\nType Label:", expense.typeLabel,
        "\nEssentiality Label:", expense.essentialityLabel,
        "\nGoal ID:", expense.goalId,
        "\nPeriod Interval:", expense.periodInterval,
        expense
      );
    } else {
      console.log("⚠️ No expense data found in route.params");
    }
  }, [expense]);

  // ---------- STATE ----------
  const [payee, setPayee] = useState(expense.payee || "");
  const [amount, setAmount] = useState(expense.amount ? expense.amount.toString() : "0");
  const [date, setDate] = useState(new Date(expense.date || Date.now()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tag, setTag] = useState(expense.tag || "");
  const [eventTag, setEventTag] = useState(expense.eventTag || "");
  const [paymentType, setPaymentType] = useState(expense.paymentType || "");
  const [isPeriodic, setIsPeriodic] = useState(Boolean(expense.isPeriodic));
  const [periodInterval, setPeriodInterval] = useState(expense.periodInterval || 0);
  const [essentialityLabel, setEssentialityLabel] = useState(expense.essentialityLabel || 0);
  const [allocateToGoal, setAllocateToGoal] = useState(expense.goalId != null);
  const [dbReady, setDbReady] = useState(false);

  const options = ["Expenses", "Income", "Transaction"];
  const [selectedOption, setSelectedOption] = useState(dbToUiType(expense.typeLabel));
  const periodType = ["Yearly", "Monthly"];
  const [selectedPeriodType, setSelectedPeriodType] = useState(expense.type || "null");

  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(expense.goalId);
  const [savingMethods, setSavingMethods] = useState([]);
  const [selectedSavingMethod, setSelectedSavingMethod] = useState(null);
  const [savingAccounts, setSavingAccounts] = useState([]);
  const [savingAccountError, setSavingAccountError] = useState(false);
  const [selectedSavingAccount, setSelectedSavingAccount] = useState(null);
  const [showSavingAccountModal, setShowSavingAccountModal] = useState(false);

  const [userSummary, setUserSummary] = useState({
    total_income: 0,
    total_expense: 0,
    total_balance: 0,
  });

  const [tags, setTags] = useState([]);
  const [activeEventTags, setActiveEventTags] = useState([]);

  const { userId } = useUser();

  // ---------- ERROR STATES ----------
  const [payeeError, setPayeeError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [tagError, setTagError] = useState(false);
  const [paymentTypeError, setPaymentTypeError] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [savingMethodError, setSavingMethodError] = useState(false);

  // ---------- ANIMATED SHAKE ----------
  const payeeShake = useRef(new Animated.Value(0)).current;
  const amountShake = useRef(new Animated.Value(0)).current;
  const tagShake = useRef(new Animated.Value(0)).current;
  const paymentTypeShake = useRef(new Animated.Value(0)).current;
  const goalShake = useRef(new Animated.Value(0)).current;

  const runShake = (animRef) => {
    if (!animRef) return;
    animRef.setValue(0);
    Animated.sequence([
      Animated.timing(animRef, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate(50);
  };

  // ---------- CONSTANT TAGS ----------
  const paymentTypeData = [
    { id: "1", name: "Cash" },
    { id: "2", name: "Credit Card" },
    { id: "3", name: "Debit Card" },
    { id: "4", name: "E-Wallet" },
    { id: "5", name: "Bank Transfer" },
    { id: "6", name: "PayPal" },
    { id: "7", name: "Cryptocurrency" },
    { id: "8", name: "Gift Card" },
  ];

  const DEFAULT_TAGS = [
    { name: "Food & Drinks", essentialityLabel: 1 },
    { name: "Groceries", essentialityLabel: 1 },
    { name: "Transport", essentialityLabel: 2 },
    { name: "Fuel", essentialityLabel: 2 },
    { name: "Shopping", essentialityLabel: 3 },
    { name: "Telco", essentialityLabel: 3 },
    { name: "Utilities", essentialityLabel: 1 },
    { name: "Entertainment", essentialityLabel: 3 },
    { name: "Pharmacy", essentialityLabel: 1 },
    { name: "Healthcare", essentialityLabel: 1 },
    { name: "Bills", essentialityLabel: 1 },
    { name: "E-Wallet", essentialityLabel: 2 },
    { name: "Miscellaneous", essentialityLabel: 3 },
  ];

  // ---------- INIT DB & LOAD DATA ----------
  useEffect(() => {
    const init = async () => {
      console.log("🚀 [init] start");
      try {
        await initDB();
        setDbReady(true);

        const [
          loadedTags,
          loadedEventTags,
          active,
          goalsData,
          summary,
          methods,
          accounts,
          allocations
        ] = await Promise.all([
          getTagsLocal(userId),
          getEventTagsLocal(userId),
          getActiveEventTagsLocal(userId),
          getGoalsLocal(userId),
          getUserSummary(userId),
          getSavingMethods(userId),
          getSavingAccounts(userId),
          getGoalFundAllocations(userId, expense.goalId),
        ]);


        setTags(loadedTags);
        setActiveEventTags(active);
        setGoals(goalsData);
        setUserSummary(summary);
        setSavingMethods(methods);
        setSavingAccounts(accounts);

        console.log("Allocation", allocations);

        const allocation = allocations.find(a => a.transaction_id === expense.id);
        console.log("🔍 Found allocation?", allocation);

        if (allocation) {
          const method = methods.find(m => m.id === allocation.method_id);
          const account = accounts.find(a => a.id === allocation.account_id);

          setSelectedSavingMethod(method || null);
          setSelectedSavingAccount(account || null);
        } else {
          console.log("⚠️ No allocation found for this expense");
        }

        console.log("⚡ [init] all data loaded successfully");

      } catch (err) {
        console.error("❌ [init] error:", err);
      }
    };

    if (userId) init();

  }, [userId, expense.id]);


  // ---------- TYPE MAPPING ----------
  function dbToUiType(type) {
    if (!type) return "Expenses";
    const t = String(type).toLowerCase();
    if (t === "expense") return "Expenses";
    if (t === "income") return "Income";
    if (t === "transaction") return "Transaction";
    return "Expenses";
  }

  function uiToDbType(type) {
    if (!type) return null;
    const t = type.toLowerCase();
    if (t === "expenses") return "expense";
    if (t === "income") return "income";
    if (t === "transaction") return "transaction";
    return null;
  }

  // ---------- TYPE CHANGE ----------
  const handleTypeChange = (option) => {
    setSelectedOption(option);
    setTypeError(false);
    if (option !== "Transaction") {
      setAllocateToGoal(false);
      setSelectedGoal(null);
    }
  };

  // ---------- AMOUNT VALIDATION ----------
  const validateAmount = (value, fieldName = "Amount", animRef) => {
    if (!value || value === "") {
      setAmountError(true);
      runShake(animRef);
      Alert.alert(`Missing ${fieldName}`, `Please enter ${fieldName.toLowerCase()}.`);
      return false;
    }

    if (isNaN(value)) {
      setAmountError(true);
      runShake(animRef);
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be numeric.`);
      return false;
    }

    const num = parseFloat(value);
    if (num <= 0) {
      setAmountError(true);
      runShake(animRef);
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be greater than 0.`);
      return false;
    }

    if (num > 9999999999999999) {
      setAmountError(true);
      runShake(animRef);
      Alert.alert(
        `Invalid ${fieldName}`,
        `${fieldName} cannot exceed 9,999,999,999,999,999.`
      );
      return false;
    }

    setAmountError(false);
    return true;
  };

  // ---------- UPDATE ----------
  const onUpdate = async () => {
    if (!dbReady) return Alert.alert("Database not ready yet!");
    if (!userId) return Alert.alert("Error", "User not logged in");

    // ----------------------------------------------
    //  1. VALIDATION
    // ----------------------------------------------
    let valid = true;

    if (!payee || !payee.trim()) {
      setPayeeError(true); runShake(payeeShake);
      Alert.alert("Missing Payee", "Please enter a payee or project.");
      valid = false;
    } else setPayeeError(false);

    if (!validateAmount(amount, "Amount", amountShake)) valid = false;

    if (!date) {
      setDateError(true);
      Alert.alert("Missing Date", "Please select a date.");
      valid = false;
    } else setDateError(false);

    if (!selectedOption) {
      setTypeError(true);
      Alert.alert("Missing Type", "Please choose a type.");
      valid = false;
    } else setTypeError(false);

    if (selectedOption !== "Income" && !tag) {
      setTagError(true); runShake(tagShake);
      Alert.alert("Missing Tag", "Please select a tag.");
      valid = false;
    } else setTagError(false);

    if (selectedOption !== "Income" && !paymentType) {
      setPaymentTypeError(true); runShake(paymentTypeShake);
      Alert.alert("Missing Payment Type", "Please select a payment type.");
      valid = false;
    } else setPaymentTypeError(false);

    if (selectedOption === "Transaction" && allocateToGoal) {
      if (!selectedGoal) {
        setGoalError(true); runShake(goalShake);
        Alert.alert("Missing Goal", "Please select a goal.");
        valid = false;
      } else setGoalError(false);

      if (!selectedSavingMethod) {
        setSavingMethodError(true);
        Alert.alert("Missing Saving Method", "Please select a saving method.");
        valid = false;
      } else setSavingMethodError(false);

      if (!selectedSavingAccount) {
        setSavingAccountError(true);
        Alert.alert("Missing Account", "Please select a saving account.");
        valid = false;
      } else setSavingAccountError(false);
    }

    if (!valid) return;

    // ----------------------------------------------
    //  2. Build newData + oldData
    // ----------------------------------------------
    const newData = {
      payee: payee.trim(),
      amount: parseFloat(amount),
      date: date.toISOString().split("T")[0],
      tag: selectedOption === "Income" ? null : tag,
      eventTag: eventTag || null,
      paymentType: selectedOption === "Income" ? null : paymentType,
      isPeriodic,
      type: isPeriodic ? selectedPeriodType : null,
      typeLabel: uiToDbType(selectedOption),
      essentialityLabel:
        selectedOption === "Income" ? null : (essentialityLabel ? 1 : 0),
      goalId:
        selectedOption === "Transaction" && allocateToGoal ? selectedGoal : null,
      periodInterval: isPeriodic ? periodInterval : 0,
    };

    const oldData = {
      payee: expense.payee || "",
      amount: parseFloat(expense.amount) || 0,
      date: expense.date || new Date().toISOString().split("T")[0],
      tag: expense.tag || "",
      eventTag: expense.eventTag || "",
      paymentType: expense.paymentType || "",
      isPeriodic: Boolean(expense.isPeriodic),
      type: expense.type || null,
      typeLabel: expense.typeLabel || "expense",
      essentialityLabel: expense.essentialityLabel || 0,
      goalId: expense.goalId || null,
      periodInterval: expense.periodInterval || 0,
    };

    // ----------------------------------------------
    //  3. Check for real changes
    // ----------------------------------------------
    const hasChanges =
      newData.payee !== oldData.payee ||
      newData.amount !== oldData.amount ||
      newData.date !== oldData.date ||
      newData.tag !== oldData.tag ||
      newData.eventTag !== oldData.eventTag ||
      newData.paymentType !== oldData.paymentType ||
      newData.isPeriodic !== oldData.isPeriodic ||
      newData.type !== oldData.type ||
      newData.typeLabel !== oldData.typeLabel ||
      newData.essentialityLabel !== oldData.essentialityLabel ||
      newData.goalId !== oldData.goalId ||
      newData.periodInterval !== oldData.periodInterval;

    if (!hasChanges)
      return Alert.alert("No Changes", "You did not modify any fields.");

    try {
      const oldAmount = oldData.amount;
      const oldType = oldData.typeLabel;
      const newType = newData.typeLabel;

      // ----------------------------------------------
      //  4. READ EXISTING ALLOCATION 
      // ----------------------------------------------
      let existingAllocation = null;

      if (oldData.goalId) {
        const allocations = await getGoalFundAllocations(userId, oldData.goalId);
        existingAllocation =
          allocations.find((a) => a.transaction_id === expense.id) || null;
      }

      console.log("🔍 [CHECK] Existing Allocation Loaded:", existingAllocation ? {
        allocationId: existingAllocation.id,
        oldAllocAmount: existingAllocation.allocated_amount,
        oldAccountId: existingAllocation.account_id,
        oldGoalId: existingAllocation.goalId
      } : "❌ No existing allocation found for this transaction");


      // ----------------------------------------------
      //  5. HANDLE ALLOCATION CHANGES
      // ----------------------------------------------

      // 🟩 A. Remove allocation (old -> has, new -> none)
      if (existingAllocation && !newData.goalId) {
        console.log("🔴 [REMOVE] Removing allocation:", {
          allocationId: existingAllocation.id,
          rollbackGoal: existingAllocation.goalId,
          rollbackAmount: existingAllocation.allocated_amount
        });


        await db.runAsync(
          `DELETE FROM goal_fund_allocations WHERE id = ? AND userId = ?`,
          [existingAllocation.id, userId]
        );

        await updateGoalAmount(
          userId,
          existingAllocation.goalId,
          -existingAllocation.allocated_amount
        );

        await db.runAsync(
          `UPDATE saving_accounts SET current_balance = current_balance - ?
         WHERE id = ? AND userId = ?`,
          [
            existingAllocation.allocated_amount,
            existingAllocation.account_id,
            userId,
          ]
        );
      }

      // 🟩 B. Add new allocation (old none → new has)
      if (!existingAllocation && newData.goalId) {

        console.log("🟢 [ADD] Creating NEW allocation", {
          goalId: newData.goalId,
          accountId: selectedSavingAccount.id,
          amount: newData.amount
        });

        await allocateFundToGoal(
          userId,
          newData.goalId,
          selectedSavingAccount.id,
          newData.amount,
          newData.date,
          expense.id,
          null,
          "Allocated via edit",
          selectedSavingMethod.id
        );

        await updateGoalAmount(userId, newData.goalId, newData.amount);
      }

      // 🟩 C. Edit existing allocation
      if (existingAllocation && newData.goalId) {
        const allocationId = existingAllocation.id;
        const oldAllocAmount = existingAllocation.allocated_amount;
        const oldAccountId = existingAllocation.account_id;
        const oldGoalId = existingAllocation.goalId;

        // ① Amount changed
        if (newData.amount !== oldAllocAmount) {
          const diff = newData.amount - oldAllocAmount;

          await db.runAsync(
            `UPDATE goal_fund_allocations 
           SET allocated_amount = ?, current_value = ?
           WHERE id = ? AND userId = ?`,
            [newData.amount, newData.amount, allocationId, userId]
          );

          await updateGoalAmount(userId, oldGoalId, diff);

          await db.runAsync(
            `UPDATE saving_accounts SET current_balance = current_balance + ?
           WHERE id = ? AND userId = ?`,
            [diff, oldAccountId, userId]
          );
        }

        // ② Account changed
        if (
          selectedSavingAccount &&
          selectedSavingAccount.id !== oldAccountId
        ) {
          console.log("🟣 [UPDATE ACCOUNT] Changing saving account:", {
            from: oldAccountId,
            to: selectedSavingAccount.id,
            amount: newData.amount
          });

          // remove from old account
          await db.runAsync(
            `UPDATE saving_accounts SET current_balance = current_balance - ?
           WHERE id = ? AND userId = ?`,
            [newData.amount, oldAccountId, userId]
          );

          // add into new account
          await db.runAsync(
            `UPDATE saving_accounts SET current_balance = current_balance + ?
           WHERE id = ? AND userId = ?`,
            [newData.amount, selectedSavingAccount.id, userId]
          );

          // update allocation record
          await db.runAsync(
            `UPDATE goal_fund_allocations SET account_id = ?
           WHERE id = ? AND userId = ?`,
            [selectedSavingAccount.id, allocationId, userId]
          );
        }

        // ③ Goal changed
        if (newData.goalId !== oldGoalId) {
          console.log("🟦 [UPDATE GOAL] Moving allocation to another goal:", {
            from: oldGoalId,
            to: newData.goalId,
            amount: newData.amount
          });
          // move amount
          await updateGoalAmount(userId, oldGoalId, -oldAllocAmount);
          await updateGoalAmount(userId, newData.goalId, newData.amount);

          await db.runAsync(
            `UPDATE goal_fund_allocations SET goalId = ?
           WHERE id = ? AND userId = ?`,
            [newData.goalId, allocationId, userId]
          );
        }
      }

      // ----------------------------------------------
      //  6. UPDATE EXPENSE RECORD
      // ----------------------------------------------
      await updateExpenseLocal(
        expense.id,
        userId,
        newData.payee,
        newData.amount,
        newData.date,
        newData.tag,
        newData.eventTag,
        newData.paymentType,
        newData.isPeriodic,
        newData.type,
        newData.typeLabel,
        newData.essentialityLabel,
        newData.goalId,
        newData.periodInterval
      );

      // ----------------------------------------------
      //  7. UPDATE USER SUMMARY（保留你原本的）
      // ----------------------------------------------
      const oldHadGoal = oldType === "transaction" && oldData.goalId != null;
      const newHasGoal = newType === "transaction" && newData.goalId != null;

      const isIncomeInvolved =
        oldType === "income" || newType === "income";

      if (!isIncomeInvolved) {
        if (oldType === newType && oldAmount !== newData.amount)
          await updateUserSummaryOnEdit(
            userId,
            oldType,
            oldAmount,
            newData.amount
          );
      } else {
        if (oldType === newType)

          await updateUserSummaryOnEdit(
            userId,
            oldType,
            oldAmount,
            newData.amount
          );
        else {
          await updateUserSummaryOnDelete(userId, oldType, oldAmount);
          await updateUserSummaryOnAdd(userId, newType, newData.amount);
        }
      }

      if (newType === "income" || oldType === "income") {
        await recalculateMonthlyIncomeSnapshot(userId, newData.date);
      }

      Alert.alert("Success", "Record updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("❌ Failed to update expense:", error);
      Alert.alert("Error", "Failed to update record: " + error.message);
    }
  };


  // ---------- DELETE ----------
  const onDelete = () => {
    if (!dbReady) {
      return Alert.alert("Database not ready yet!");
    }

    Alert.alert("Confirm Delete", "Are you sure to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const oldType = expense.type;
            const oldAmount = parseFloat(expense.amount) || 0;

            await deleteExpenseLocal(userId, expense.id);

            if (oldType === "income") {
              await updateUserSummaryOnDelete(userId, "income", oldAmount);
              await recalculateMonthlyIncomeSnapshot(userId, expense.date);
            } else {
              await updateUserSummaryOnDelete(userId, "expense", oldAmount);
            }

            // Update goal amount if this was allocated to a goal
            if (expense.goalId) {
              await updateGoalAmount(userId, expense.goalId, -oldAmount);
            }

            const updatedSummary = await getUserSummary(userId);
            console.log("✅ Updated summary after delete:", updatedSummary);

            Alert.alert("🗑️ Deleted", "Record removed successfully!", [
              { text: "OK", onPress: () => navigation.goBack() }
            ]);
          } catch (error) {
            console.error("❌ Failed to delete expense:", error);
            Alert.alert("❌ Error", "Failed to delete record: " + error.message);
          }
        },
      },
    ]);
  };

  // ---------- RENDER ----------
  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Record"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.selectionBarContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.typeButton,
                  selectedOption.toLowerCase() === option.toLowerCase() &&
                  styles.typeButtonActive,
                ]}
                onPress={() => handleTypeChange(option)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedOption.toLowerCase() === option.toLowerCase() &&
                    styles.typeButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FDSCard>

            {/* PAYEE */}
            <FDSValidatedInput
              label="Payee / Project"
              value={payee}
              onChangeText={(t) => {
                setPayee(t);
                if (t.trim()) setPayeeError(false);
              }}
              validate={(v) => v && v.trim().length > 0}
              errorMessage="Payee is required"
              icon={<Ionicons name="person-outline" size={18} color={FDSColors.textGray} />}
            />

            {/* AMOUNT 或 TOTAL BALANCE */}
            {selectedOption === "Transaction" && allocateToGoal ? (
              <View style={{ marginTop: 12 }}>
                <FDSLabel>Total Balance</FDSLabel>
                <Text style={{ fontSize: 16, color: "#2E5E4E", marginTop: 4 }}>
                  RM {userSummary.total_balance?.toFixed(2)}
                </Text>
              </View>
            ) : (
              <FDSValidatedInput
                label="Amount"
                value={amount}
                onChangeText={(t) => {
                  setAmount(t);
                  setAmountError(false);
                }}
                keyboardType="numeric"
                validate={(v) => v && !isNaN(v) && parseFloat(v) > 0}
                errorMessage="Amount must be greater than 0"
                icon={<Ionicons name="cash-outline" size={18} color={FDSColors.textGray} />}
              />
            )}

            {/* DATE */}
            <FDSLabel>Date</FDSLabel>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: FDSColors.bgLight,
                padding: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: FDSColors.border
              }}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={FDSColors.textGray} />
              <Text style={{ marginLeft: 10 }}>
                {date.toISOString().split("T")[0]}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(e, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate);
                    setDateError(false);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            {/* TAG */}
            {selectedOption !== "Income" && (
              <FDSValidatedPicker
                label="Tag"
                value={tag}
                validate={(v) => !!v}
                errorMessage="Please select a tag"
                icon={<Ionicons name="pricetag-outline" size={18} color={FDSColors.textGray} />}
              >
                <Picker
                  selectedValue={tag}
                  onValueChange={(itemValue) => {
                    if (itemValue === "__add_new_tag__") {
                      navigation.navigate("AddTag", {
                        onTagAdded: async (newTag) => {
                          setTag(newTag);
                        },
                      });
                    } else {
                      setTag(itemValue);
                      setTagError(false);
                    }
                  }}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                >
                  <Picker.Item label="Select a tag..." value="" />
                  {tags.map((t) => (
                    <Picker.Item key={t.id} label={t.name} value={t.name} />
                  ))}
                  <Picker.Item label="➕ Add new tag" value="__add_new_tag__" />
                </Picker>
              </FDSValidatedPicker>
            )}

            {/* PAYMENT TYPE */}
            {selectedOption !== "Income" && (
              <FDSValidatedPicker
                label="Payment Type"
                value={paymentType}
                validate={(v) => !!v}
                errorMessage="Select payment method"
                icon={<FontAwesome6 name="money-bill-transfer" size={16} color={FDSColors.textGray} />}
              >
                <Picker
                  selectedValue={paymentType}
                  onValueChange={(v) => setPaymentType(v)}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                >
                  {paymentTypeData.map((p) => (
                    <Picker.Item key={p.id} label={p.name} value={p.name} />
                  ))}
                </Picker>
              </FDSValidatedPicker>
            )}

          </FDSCard>

          <FDSCard>

            {/* PERIODIC SWITCH */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <FDSLabel>Is it periodic?</FDSLabel>
                <Text style={{ fontSize: 12, color: FDSColors.textGray }}>Recurring payment options</Text>
              </View>
              <Switch
                value={isPeriodic}
                onValueChange={setIsPeriodic}
                trackColor={{ false: "#ccc", true: FDSColors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* PERIODIC TYPE */}
            {isPeriodic && (
              <>
                <FDSLabel>Repeat Type</FDSLabel>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {periodType.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: selectedPeriodType === p ? FDSColors.primary : FDSColors.bgLight
                      }}
                      onPress={() => setSelectedPeriodType(p)}
                    >
                      <Text style={{ color: selectedPeriodType === p ? "#fff" : FDSColors.textDark }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* INTERVAL */}
                <FDSValidatedPicker
                  label="Repeat Every"
                  value={periodInterval}
                  validate={(v) => v > 0}
                >
                  <Picker
                    selectedValue={periodInterval}
                    onValueChange={(v) => setPeriodInterval(v)}
                    style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                  >
                    {[1, 2, 3, 6, 12].map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </FDSValidatedPicker>
              </>
            )}

            {/* ALLOCATE TO GOAL SWITCH */}
            {selectedOption === "Transaction" && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <View>
                  <FDSLabel>Allocate to Goal?</FDSLabel>
                  <Text style={{ fontSize: 12, color: FDSColors.textGray }}>Transfer savings into a goal</Text>
                </View>
                <Switch
                  value={allocateToGoal}
                  onValueChange={setAllocateToGoal}
                  trackColor={{ false: "#ccc", true: FDSColors.primary }}
                  thumbColor="#fff"
                />
              </View>
            )}

          </FDSCard>
          {selectedOption === "Transaction" && allocateToGoal && (
            <FDSCard>

              {/* SELECT GOAL */}
              <FDSValidatedPicker
                label="Target Goal"
                value={selectedGoal ? goals.find((g) => g.id === selectedGoal)?.name : ""}
                validate={(v) => !!selectedGoal}
                errorMessage="Select a goal"
              >
                <Picker
                  selectedValue={selectedGoal}
                  onValueChange={(v) => setSelectedGoal(v)}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                >
                  <Picker.Item label="Select a Goal..." value={null} />
                  {goals.map((g) => (
                    <Picker.Item key={g.id} label={g.name} value={g.id} />
                  ))}
                </Picker>
              </FDSValidatedPicker>

              {/* SAVING METHOD */}
              <FDSValidatedPicker
                label="Saving Method"
                value={selectedSavingMethod?.name}
                validate={(v) => !!selectedSavingMethod}
                errorMessage="Select a saving method"
              >
                <Picker
                  selectedValue={selectedSavingMethod?.id}
                  onValueChange={(id) => {
                    const method = savingMethods.find((m) => m.id === id);
                    setSelectedSavingMethod(method);
                  }}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                >
                  <Picker.Item label="Select..." value={null} />
                  {savingMethods.map((m) => (
                    <Picker.Item key={m.id} label={m.name} value={m.id} />
                  ))}
                </Picker>
              </FDSValidatedPicker>
              {/* SAVING ACCOUNT */}
              <FDSValidatedPicker
                label="Saving Account"
                value={selectedSavingAccount?.name}
                validate={(v) => !!selectedSavingAccount}
              >
                <Picker
                  selectedValue={selectedSavingAccount?.id}
                  onValueChange={(id) => {
                    const acc = savingAccounts.find((a) => a.id === id);
                    setSelectedSavingAccount(acc);
                  }}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
                >
                  <Picker.Item label="Select account..." value={null} />
                  {savingAccounts.map((a) => (
                    <Picker.Item key={a.id} label={a.name} value={a.id} />
                  ))}
                </Picker>
              </FDSValidatedPicker>

            </FDSCard>
          )}
          <View style={{ paddingHorizontal: 16 }}>
            <FDSButton
              title="Save Changes"
              onPress={onUpdate}
              icon="save-outline"
            />
            <FDSButton
              title="Delete"
              onPress={onDelete}
              mode="danger"
              icon="trash-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>

      {/* Saving Account Modal */}
      <AddSavingAccountModal
        visible={showSavingAccountModal}
        onClose={() => setShowSavingAccountModal(false)}
        methodId={selectedSavingMethod?.id || null}
        methodName={selectedSavingMethod?.method_name || ""}
        savingMethods={savingMethods}
        onAdded={async () => {
          const updated = await getSavingAccounts(userId);
          setSavingAccounts(updated);
        }}
      />


    </View>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
  },
  selectionBarContainer: {
    flexDirection: "row",
    backgroundColor: "#8CCFB1",
    borderRadius: 10,
    padding: 6,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeButtonText: {
    color: "#2E5E4E",
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: "#2E5E4E",
    fontWeight: "800",
  },

  input: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "#ff6b6b",
    borderWidth: 2,
  },

  addAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addAccountText: {
    marginLeft: 6,
    color: "#2E5E4E",
    fontWeight: "600",
  },

});