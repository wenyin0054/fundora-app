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

} from "../../../database/SQLite";
import AppHeader from "../../reuseComponet/header";
import { useUser } from "../../reuseComponet/UserContext";

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
            const oldType = String(expense.typeLabel || "").toLowerCase();
            const oldAmount = parseFloat(expense.amount) || 0;

            await deleteExpenseLocal(userId, expense.id);

            if (oldType === "income") {
              await updateUserSummaryOnDelete(userId, "income", oldAmount);
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
          <View style={styles.card}>
            {/* Type Selection Bar */}
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

            {/* Payee Input */}
            <Animated.View
              style={[
                styles.inputRow,
                payeeError && styles.inputError,
                { transform: [{ translateX: payeeShake }] },
              ]}
            >
              <Ionicons name="person-outline" size={20} color="#6c757d" />
              <TextInput
                style={styles.input}
                value={payee}
                onChangeText={(text) => {
                  setPayee(text);
                  if (text.trim()) setPayeeError(false);
                }}
                placeholder="Payee or purchased project"
                placeholderTextColor={"#c5c5c5ff"}
              />
            </Animated.View>

            {/* Amount Input / Total Balance */}
            {selectedOption === "Transaction" && allocateToGoal ? (
              <View
                style={[
                  styles.inputRow,
                  { justifyContent: "space-between", height: 45 },
                ]}
              >
                <Ionicons name="wallet-outline" size={20} color="#6c757d" />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    fontSize: 16,
                    color: "#2E5E4E",
                  }}
                >
                  Total Balance: RM{" "}
                  {userSummary.total_balance?.toFixed(2) || "0.00"}
                </Text>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.inputRow,
                  amountError && styles.inputError,
                  { transform: [{ translateX: amountShake }] },
                ]}
              >
                <Ionicons name="cash-outline" size={20} color="#6c757d" />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    setAmountError(false);
                  }}
                  placeholder="Amount"
                  placeholderTextColor={"#c5c5c5ff"}
                />
              </Animated.View>
            )}

            {/* Date Picker */}
            <TouchableOpacity
              style={[
                styles.inputRow,
                dateError && styles.inputError,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6c757d" />
              <Text style={[styles.input, { color: '#333' }]}>
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

            {/* Tag Picker */}
            {selectedOption !== "Income" && (
              <Animated.View
                style={[
                  styles.pickerContainer,
                  tagError && styles.inputError,
                  { transform: [{ translateX: tagShake }] },
                ]}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color="#6c757d"
                  style={styles.icon}
                />
                <TextInput
                  value={tag}
                  style={styles.dropdownContent}
                  placeholder="Select a tag"
                  placeholderTextColor={"#c5c5c5ff"}
                  editable={false}
                  pointerEvents="none"
                />
                <Picker
                  selectedValue={tag}
                  onValueChange={(itemValue) => {
                    if (itemValue === "__add_new_tag__") {
                      navigation.navigate("AddTag", {
                        onTagAdded: async (newTag) => {
                          setTag(newTag);
                          setTagError(false);
                        },
                      });
                    } else {
                      setTag(itemValue);
                      setTagError(false);
                      const selectedTag =
                        tags.find((d) => d.name === itemValue) ||
                        DEFAULT_TAGS.find((d) => d.name === itemValue);
                      setEssentialityLabel(
                        selectedTag ? selectedTag.essentialityLabel : 0
                      );
                    }
                  }}
                  style={[
                    styles.picker,
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0,
                    },
                  ]}
                  dropdownIconColor="#2E5E4E"
                >
                  <Picker.Item label="Select a tag..." value="" />
                  {tags.map((item) => (
                    <Picker.Item
                      key={`user-${item.id}`}
                      label={item.name}
                      value={item.name}
                    />
                  ))}
                  {DEFAULT_TAGS.map((item) => (
                    <Picker.Item
                      key={`default-${item.name}`}
                      label={item.name}
                      value={item.name}
                    />
                  ))}
                  <Picker.Item label="➕ Add new tag" value="__add_new_tag__" />
                </Picker>
              </Animated.View>
            )}

            {/* Essentiality Switch */}
            {tag && selectedOption !== "Income" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 25,
                  marginBottom: 10,
                }}
              >
                <Text style={{ marginRight: 10, color: "#555" }}>
                  Essentiality:
                </Text>
                <Switch
                  value={!!essentialityLabel}
                  onValueChange={(value) => setEssentialityLabel(value ? 1 : 0)}
                  trackColor={{ false: "#ccc", true: "#4CAF50" }}
                  thumbColor={essentialityLabel ? "#fff" : "#f4f3f4"}
                />
                <Text style={{ marginLeft: 10, color: "#555" }}>
                  {essentialityLabel ? "Essential" : "Non-Essential"}
                </Text>
              </View>
            )}

            {/* Payment Type Picker */}
            {selectedOption !== "Income" && (
              <Animated.View
                style={[
                  styles.pickerContainer,
                  paymentTypeError && styles.inputError,
                  { transform: [{ translateX: paymentTypeShake }] },
                ]}
              >
                <FontAwesome6
                  name="money-bill-transfer"
                  size={14}
                  color="#6c757d"
                  style={styles.icon}
                />
                <TextInput
                  value={paymentType}
                  style={styles.pickerDisplay}
                  placeholder="Select payment type"
                  placeholderTextColor={"#c5c5c5ff"}
                  editable={false}
                  pointerEvents="none"
                />
                <Picker
                  selectedValue={paymentType}
                  onValueChange={(val) => {
                    setPaymentType(val);
                    setPaymentTypeError(false);
                  }}
                  style={styles.hiddenPicker}
                >
                  <Picker.Item label="Select payment type..." value="" />
                  {paymentTypeData.map((item) => (
                    <Picker.Item
                      key={item.id}
                      label={item.name}
                      value={item.name}
                    />
                  ))}
                </Picker>
              </Animated.View>
            )}

            {/* Event Tag Section */}
            <View style={styles.eventTagContainer}>
              <Text style={styles.eventTagTitle}>Active Event</Text>
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const filteredEvents = activeEventTags.filter(
                  (tagItem) =>
                    tagItem.startDate <= todayStr &&
                    (!tagItem.endDate || tagItem.endDate >= todayStr)
                );

                if (filteredEvents.length === 0) {
                  return (
                    <Text style={styles.noEventText}>No active event</Text>
                  );
                }

                if (filteredEvents.length === 1) {
                  const tagItem = filteredEvents[0];
                  return (
                    <Text style={styles.activeEventText}>
                      🎉 {tagItem.name} ({tagItem.startDate})
                    </Text>
                  );
                }

                return (
                  <View style={styles.eventPickerWrapper}>
                    <Picker
                      selectedValue={eventTag}
                      onValueChange={setEventTag}
                      style={styles.picker}
                    >
                      <Picker.Item
                        label="-- Choose Active Event --"
                        value=""
                      />
                      {filteredEvents.map((tagItem) => (
                        <Picker.Item
                          key={tagItem.id}
                          label={`${tagItem.name} (${tagItem.startDate})`}
                          value={tagItem.name}
                        />
                      ))}
                    </Picker>
                  </View>
                );
              })()}
            </View>

            {/* Periodic Switch */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Is it periodic?</Text>
              <Switch
                value={isPeriodic}
                onValueChange={setIsPeriodic}
                trackColor={{ false: "#ccc", true: "#9cd8b3" }}
                thumbColor={isPeriodic ? "#4CAF50" : "#f4f3f4"}
              />
            </View>

            {/* Period Type Selection */}
            {isPeriodic && (
              <View style={styles.periodicPicker}>
                <View style={styles.selectionBarContainer}>
                  {periodType.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.typeButton,
                        selectedPeriodType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setSelectedPeriodType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          selectedPeriodType === type &&
                          styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Repeat every:</Text>
                <Picker
                  selectedValue={periodInterval}
                  onValueChange={(val) => setPeriodInterval(val)}
                  style={styles.picker}
                >
                  {[1, 2, 3, 6, 12].map((n) => (
                    <Picker.Item key={n} label={`${n}`} value={n} />
                  ))}
                </Picker>
              </View>
            )}

            {/* Allocate to Goal Switch */}
            {selectedOption === "Transaction" && (
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Allocate to Goal?</Text>
                <Switch
                  value={allocateToGoal}
                  onValueChange={(value) => {
                    setAllocateToGoal(value);
                    if (!value) {
                      setSelectedGoal(null);
                      setSelectedSavingMethod(null);
                      setSelectedSavingAccount(null);
                    }
                  }}
                  trackColor={{ false: "#ccc", true: "#9cd8b3" }}
                  thumbColor={allocateToGoal ? "#4CAF50" : "#f4f3f4"}
                />
              </View>
            )}

            {/* Goal Allocation Section */}
            {selectedOption === "Transaction" && allocateToGoal && (
              <Animated.View
                style={[
                  styles.goalCard,
                  goalError && styles.inputError,
                  { transform: [{ translateX: goalShake }] },
                ]}
              >
                <Text style={styles.goalTitle}>Allocate Full Amount to Goal</Text>

                {/* GOAL LIST */}
                <View style={styles.goalList}>
                  {goals.length > 0 ? (
                    goals.map((goal) => (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.goalButton,
                          selectedGoal === goal.id && styles.goalButtonActive,
                        ]}
                        onPress={() => {
                          setSelectedGoal(goal.id);
                          setGoalError(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.goalButtonText,
                            selectedGoal === goal.id && styles.goalButtonTextActive,
                          ]}
                        >
                          {goal.goalName}
                        </Text>
                        <Text style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                          Target: RM {(goal.targetAmount || 0).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noGoalsText}>No goals found.</Text>
                  )}
                </View>

                {/* Saving Method */}
                <Text style={styles.subLabel}>Select Saving Method:</Text>
                <View style={styles.methodList}>
                  {savingMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.methodButton,
                        selectedSavingMethod?.id === method.id && styles.methodButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedSavingMethod(method);
                        setSelectedSavingAccount(null);
                        setSavingMethodError(false);
                      }}
                    >
                      <Text style={styles.methodIcon}>{method.icon_name || "🏦"}</Text>
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>{method.method_name}</Text>
                        <Text style={styles.methodDetails}>
                          Return: {method.expected_return}% • Risk:
                          {"★".repeat(method.risk_level || 1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Saving Account */}
                {selectedSavingMethod && (
                  <>
                    <Text style={styles.subLabel}>Select Account:</Text>
                    <View style={styles.accountSection}>
                      {savingAccounts
                        .filter((acc) => acc.method_id === selectedSavingMethod.id)
                        .map((acc) => (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountButton,
                              selectedSavingAccount?.id === acc.id &&
                              styles.accountButtonActive,
                            ]}
                            onPress={() => {
                              setSelectedSavingAccount(acc);
                              setSavingAccountError(false);
                            }}
                          >
                            <Text style={styles.accountName}>
                              {acc.institution_name} - {acc.account_name}
                            </Text>
                            <Text style={styles.accountBalance}>
                              Balance: RM {acc.current_balance?.toFixed(2) || "0.00"}
                            </Text>
                            <Text style={styles.accountRate}>
                              Rate: {acc.interest_rate || 0}%
                            </Text>
                          </TouchableOpacity>
                        ))}

                      <TouchableOpacity
                        style={styles.addAccountButton}
                        onPress={() => setShowSavingAccountModal(true)}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#8AD0AB"
                        />
                        <Text style={styles.addAccountText}>Add New Account</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Text style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
                  This will allocate the full amount (RM {parseFloat(amount || 0).toFixed(2)})
                  to the selected goal and saving account.
                </Text>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={onUpdate}>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  selectionBarContainer: {
    flexDirection: "row",
    backgroundColor: "#8CCFB1",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#fff",
  },
  typeButtonText: {
    color: "#2E5E4E",
    fontSize: 16,
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#2E5E4E",
    fontWeight: "bold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 45,
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
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 45,
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  pickerDisplay: {
    flex: 1,
    color: "#6c757d",
    fontSize: 16,
  },
  dropdownContent: {
    flex: 1,
    color: "#6c757d",
    fontSize: 16,
  },
  hiddenPicker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  picker: {
    width: "100%",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  switchLabel: {
    marginRight: 10,
    color: "#555",
    fontSize: 16,
  },
  eventTagContainer: {
    backgroundColor: "#F6FBF7",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#d6e8de",
  },
  eventTagTitle: {
    fontWeight: "600",
    color: "#2E5E4E",
    fontSize: 15,
    marginBottom: 8,
  },
  noEventText: {
    color: "#555",
    fontStyle: "italic",
  },
  activeEventText: {
    color: "#2E5E4E",
  },
  eventPickerWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 8,
    overflow: "hidden",
  },
  periodicPicker: {
    marginTop: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  goalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2E5E4E",
    marginBottom: 10,
    textAlign: "center",
  },
  goalList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  goalButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 6,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  goalButtonActive: {
    backgroundColor: "#9cd8b3",
  },
  goalButtonText: {
    color: "#2E5E4E",
    fontSize: 15,
    fontWeight: "500",
  },
  goalButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  noGoalsText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E5E4E",
    marginTop: 10,
    marginBottom: 6,
  },
  methodList: {
    marginTop: 5,
    marginBottom: 10,
  },
  methodButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
  },
  methodButtonActive: {
    backgroundColor: "#9cd8b3",
  },
  methodIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E5E4E",
  },
  methodDetails: {
    fontSize: 12,
    color: "#555",
  },
  accountSection: {
    marginTop: 8,
  },
  accountButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  accountButtonActive: {
    backgroundColor: "#8AD0AB",
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E5E4E",
  },
  accountBalance: {
    fontSize: 12,
    color: "#555",
  },
  accountRate: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 2,
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
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#E53935",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#2E5E4E",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 16,
  },
});