import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Slider from "@react-native-community/slider";
import AppHeader from "../../reuseComponet/header";
import AddSavingAccountModal from "./AddSavingAccountModal";
import { Animated } from "react-native";

import {
  initDB,
  addExpenseLocal,
  getTagsLocal,
  getGoalsLocal,
  getUserSummary,
  updateUserSummary,
  updateGoalAmount,
  getEventTagsLocal,
  getActiveEventTagsLocal,
  createUserSummary,
  getLastMonthTotalExpense,
  getSavingMethods,
  getSavingAccounts,
  allocateFundToGoal,
  saveUserTag,
  saveMonthlyIncomeSnapshot,
  recalculateMonthlyIncomeSnapshot,
} from "../../../database/SQLite";

import { useUser } from "../../reuseComponet/UserContext";
import { predictCategory } from "./AutoAssignTag/AIPredictionEngine";
import { normalize } from "./AutoAssignTag/normalize";

// === FDS 组件（你之前放在 screens/reuseComponet/DesignSystem.js）===
import {
  FDSCard,
  FDSInput,
  FDSLabel,
  FDSButton,
  FDSColors,
  FDSValidatedInput,
  FDSValidatedPicker,
  FDSI
} from "../../reuseComponet/DesignSystem";

export default function AddExpenseScreen({ route, navigation }) {
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [periodInterval, setPeriodInterval] = useState(0);
  const [allocateToGoal, setAllocateToGoal] = useState(false);
  const periodType = ["Yearly", "Monthly"];
  const [selectedType, setSelectedType] = useState("Yearly");
  const [essentialityLabel, setEssentialityLabel] = useState(0);
  const [tag, setTag] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [selectedOption, setSelected] = useState("Expenses");
  const options = ["Expenses", "Income", "Transaction"];
  const [dbReady, setdbReady] = useState(false);
  const [tags, setTags] = useState([]);
  const [eventTagData, setEventTagData] = useState([]);
  const [activeEventTags, setActiveEventTags] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [sliderValue, setSliderValue] = useState(0);
  const [sliderPercent, setSliderPercent] = useState(0);
  const [userSummary, setUserSummary] = useState({ total_income: 0, total_expense: 0, total_balance: 0 });
  const [lastMonthExpenses, setLastMonthExpenses] = useState(null);
  const [sliderColor, setSliderColor] = useState("#4CAF50");  // default safe green
  const [isLoading, setIsLoading] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(null);
  const [incomingScanData, setIncomingScanData] = useState(null);

  //for load savings method and account
  const [savingMethods, setSavingMethods] = useState([]);
  const [savingAccounts, setSavingAccounts] = useState([]);
  const [selectedSavingMethod, setSelectedSavingMethod] = useState(null);
  const [selectedSavingAccount, setSelectedSavingAccount] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [methodError, setMethodError] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const paymentTypeRef = useRef(null);
  const tagRef = useRef(null);
  const intervalRef = useRef(null);


  // for auto tag 
  const [predInfo, setPredInfo] = useState(null);

  const { userId, isLoading: userLoading } = useUser();

  const paymentTypeData = [
    { id: '1', name: 'Cash' },
    { id: '2', name: 'Credit Card' },
    { id: '3', name: 'Debit Card' },
    { id: '4', name: 'E-Wallet' },
    { id: '5', name: 'Bank Transfer' },
    { id: '6', name: 'PayPal' },
    { id: '7', name: 'Cryptocurrency' },
    { id: '8', name: 'Gift Card' }
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


  const shakeAnim = useRef(new Animated.Value(0)).current;
  const amountRef = useRef(null);
  const payeeRef = useRef(null);

  // Reusable shake animation
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    const init = async () => {
      if (!userId) return;
      try {
        await initDB();
        setdbReady(true);

        const loadedTags = await getTagsLocal(userId);
        setTags(loadedTags);

        const eventTags = await getEventTagsLocal(userId);
        setEventTagData(eventTags);

        const goalsData = await getGoalsLocal(userId);
        setGoals(goalsData);

        const active = await getActiveEventTagsLocal(userId);
        setActiveEventTags(active);

        const summary = await getUserSummary(userId);
        setUserSummary(summary);

        const methods = await getSavingMethods(userId);
        setSavingMethods(methods);

        const accounts = await getSavingAccounts(userId);
        setSavingAccounts(accounts);

        const expenses = await getLastMonthTotalExpense(userId);
        const essentialTotal = expenses?.essentialTotal ?? 0;
        const total = expenses?.total ?? 0;
        setLastMonthExpenses({ essentialTotal, total });
      } catch (err) {
        console.error("[init] error:", err);
      }
    };
    init();
  }, [userId]);

  useEffect(() => {
    if (!incomingScanData) return;
    const handleScanData = async () => {
      const data = incomingScanData;
      try {
        setConfidenceLevel(data.confidence_level || null);
        if (data.merchant_name && data.merchant_name.trim() !== "") {
          setPayee(data.merchant_name.trim());
          await onPayeeChange(data.merchant_name.trim());
        }
        if (data.total_amount) {
          const cleanAmount = parseFloat(data.total_amount.toString().replace(/[^0-9.]/g, ""));
          if (!isNaN(cleanAmount)) {
            if (data.confidence_level === "high" || data.confidence_level === "medium") {
              setAmount(cleanAmount.toFixed(2));
            } else {
              setAmount("");
            }
          }
        }
        if (data.transaction_date) {
          const dateObj = new Date(data.transaction_date);
          if (!isNaN(dateObj)) setDate(dateObj);
        }
      } catch (e) {
        console.error("Error applying scanned data:", e);
      } finally {
        setIncomingScanData(null);
      }
    };
    handleScanData();
  }, [incomingScanData]);

  useEffect(() => {
    if (!lastMonthExpenses || !userSummary.total_balance) return;
    const color = calculateSliderColor();
    setSliderColor(color);
  }, [sliderValue, lastMonthExpenses, userSummary.total_balance]);

  const calculateSliderColor = () => {
    if (!lastMonthExpenses || !userSummary.total_balance) return "#4CAF50";
    if (sliderValue > userSummary.total_balance - lastMonthExpenses.essentialTotal) {
      return "#D32F2F";
    } else if (sliderValue > userSummary.total_balance - lastMonthExpenses.total) {
      return "#F57C00";
    } else if (sliderValue > userSummary.total_balance / 2) {
      return "#FBC02D";
    } else {
      return "#4CAF50";
    }
  };

  //tag
  const fetchTag = React.useCallback(async () => {
    if (!userId) return; // 添加检查
    const loadedTags = await getTagsLocal(userId);
    setTags(loadedTags);
    const loadedEventTags = await getEventTagsLocal(userId);
    setEventTagData(loadedEventTags);
  }, [userId]); // 添加 userId 依赖

  useFocusEffect(
    React.useCallback(() => {
      fetchTag();
    }, [fetchTag])
  );

  // auto predict when payee change

  const onPayeeChange = async (text) => {
    setPayee(text);

    if (!text || text.trim().length < 2) {
      setPredInfo(null);
      return;
    }

    const res = await predictCategory(userId, text);
    setPredInfo(res);

    console.log("🎯 PREDICTION RESULT:", res);

    // 1) Memory first
    if (res.source.startsWith("user_memory")) {
      setTag(res.category);
      return;
    }

    // 2) Ensemble auto assign (AI strongest model)
    if (res.source === "ai_ensemble" && res.confidence >= 0.90) {
      setTag(res.category);
      return;
    }

    // 3) Any AI model with strong signal
    if (res.source.includes("ai") && res.confidence >= 0.85) {
      setTag(res.category);
      return;
    }

    // 4) Show suggestions
    if (res.suggestions?.length > 0) {
      console.log("💡 Suggestions:", res.suggestions);
    } else {
      console.log("❌ NO CONFIDENT SUGGESTION");
    }
  };


  // When the user manually selects a tag, it is saved to the user's memory
  const handleTagSelect = async (selectedTag) => {
    setTag(selectedTag);

    // Save user selection to AI memory
    if (payee && selectedTag) {
      const norm = normalize(payee);
      await saveUserTag(userId, norm, selectedTag, 1); // 注意：确保 saveUserTag 接受 normalized payee
      console.log("💾 Saved user choice (normalized):", norm, "->", selectedTag);
    }
  };

  const validateAmount = (value, fieldName = "Amount") => {
    if (!value || value === "") {
      triggerShake();
      Alert.alert(`Missing ${fieldName}`, `Please enter ${fieldName.toLowerCase()}.`);
      return false;
    }

    if (isNaN(value)) {
      triggerShake();
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be numeric.`);
      return false;
    }

    const num = parseFloat(value);
    if (num <= 0) {
      triggerShake();
      Alert.alert(`Invalid ${fieldName}`, `${fieldName} must be greater than 0.`);
      return false;
    }

    if (num > 9999999999999999) {
      triggerShake();
      Alert.alert(
        `Invalid ${fieldName}`,
        `${fieldName} cannot exceed 9,999,999,999,999,999.`
      );
      return false;
    }

    return true;
  };

  const isGoalOverdue = (goal) => {
    if (!goal.deadline && !goal.due) return false;

    const d = goal.deadline || goal.due;
    const deadlineDate = new Date(d + "T00:00:00");
    const today = new Date();

    return deadlineDate < today; // true = overdue
  };

  const resetInputs = () => {
    setAmount("");
    setPayee("");
    setTag("");
    setEventTag("");
    setPaymentType("Cash");
    setIsPeriodic(false);
    setSelectedType("Yearly");
    setEssentialityLabel(null);
    setSliderValue(0);
    setSliderPercent(0);
    setSelectedGoal(null);
    setAllocateToGoal(false);
    setPeriodInterval(1);
  };

  const onSave = async (overrideAmount) => {
    console.log("🔥 Save triggered");

    if (!dbReady) return Alert.alert("Database not ready yet!");
    if (!userId) return Alert.alert("Error", "User not logged in");

    // Normalize data
    const trimmedPayee = payee?.trim() || "";
    const amt = overrideAmount !== undefined ? overrideAmount : parseFloat(amount);
    const isIncome = selectedOption === "Income";
    const isExpense = selectedOption === "Expenses";
    const isTransaction = selectedOption === "Transaction";
    const isGoalAllocation = isTransaction && allocateToGoal;

    const currentTag = isGoalAllocation ? "Allocate to Goal" : tag;

    // ------------------ VALIDATION ------------------
    // VALIDATE AMOUNT (Income / Expense / Transaction without allocation)
    if (!isGoalAllocation) {
      const validAmount = amountRef.current?.validate();
      if (!validAmount) return;

    }

    //  VALIDATE PAYEE (Only Expense / Transaction)
    if ((isExpense || isTransaction) && !isGoalAllocation) {
      const validPayee = payeeRef.current?.validate();
      if (!validPayee) {
        return
      }
    }

    //  VALIDATE GOAL ALLOCATION AMOUNT
    if (isGoalAllocation) {
      if (!validateAmount(sliderValue, "Goal Amount")) return;
      if (!selectedGoal) return Alert.alert("Missing Goal", "Please select a goal.");
      if (sliderValue <= 0) return Alert.alert("Invalid Amount", "Please select amount to allocate.");
    }

    // Tag Validation
    if ((isExpense || (isTransaction && !isGoalAllocation))) {
      const validTag = tagRef.current?.validate();
      if (!validTag) return;
    }

    // Payment Type Validation
    if ((isExpense || (isTransaction && !isGoalAllocation))) {
      const validPayment = paymentTypeRef.current?.validate();
      if (!validPayment) return;
    }

    // ------------------ AUTO TAG SAVE ------------------
    if (trimmedPayee && currentTag && !isGoalAllocation) {
      console.log("🔖 Saving auto-tag data");
      handleTagSelect(currentTag);
    }

    try {
      setIsLoading(true);

      const finalDate = date.toISOString().split("T")[0];
      const goalId = isGoalAllocation ? selectedGoal : null;
      const finalAmount = isGoalAllocation ? sliderValue : amt;

      // ===================== INCOME =====================
      if (isIncome) {
        await createUserSummary(userId);
        await addExpenseLocal(
          userId, trimmedPayee, finalAmount, finalDate,
          "income", eventTag, paymentType, isPeriodic,
          selectedType, "income", essentialityLabel ? 1 : 0,
          null, periodInterval
        );

        await updateUserSummary(userId, "income", finalAmount);
        await saveMonthlyIncomeSnapshot(userId, finalDate);
        Alert.alert("Success", "Income recorded successfully!");
      }

      // ==================== EXPENSE / TRANSACTION ===================
      if (isExpense || isTransaction) {

        // 1️⃣ UPDATE GOAL AMOUNT
        if (goalId) await updateGoalAmount(userId, goalId, finalAmount);

        // 2️⃣ ADD EXPENSE / TRANSACTION AND GET NEW ID
        const newTransactionId = await addExpenseLocal(
          userId, trimmedPayee, finalAmount, finalDate,
          currentTag, eventTag, paymentType, isPeriodic,
          selectedType, isTransaction ? "transaction" : "expense",
          essentialityLabel ? 1 : 0, goalId, periodInterval
        );
        console.log("🔥 newTransactionId =", newTransactionId);

        // 3️⃣ IF ALLOCATION → RECORD SOURCE + ACCOUNT
        if (isGoalAllocation && selectedSavingAccount) {
          await allocateFundToGoal(
            userId,
            goalId,
            selectedSavingAccount.id,  // account_id
            finalAmount,               // allocated_amount
            finalDate,                 // allocation_date
            newTransactionId,          // transaction_id (FOREIGN KEY)
            null,                      // maturity_date
            "",                         // notes
            selectedSavingMethod.id
          );
        }

        // 4️⃣ UPDATE SUMMARY
        await updateUserSummary(userId, "expense", finalAmount);

        Alert.alert(
          "Success",
          goalId ? "Amount allocated to goal & expense recorded!" : "Expense saved!"
        );
      }


      // ------------------ RESET INPUTS ------------------
      resetInputs();

    } catch (error) {
      console.error("❌ Error saving:", error);
      Alert.alert("Error", "Failed to save record.");
    } finally {
      setIsLoading(false);
    }
  };


  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8AD0AB" />
        <Text>Loading user data...</Text>
      </View>
    );
  }


  if (!userId) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader
          title="Add Expense/Income"
          showLeftButton={true}
          onLeftPress={() => navigation.goBack()}
          showBell={false}
          showProfile={false}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>Please Log In</Text>
          <Text style={styles.errorMessage}>You need to be logged in to add expenses or income</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f6fbf8" }}>
      <AppHeader title="Add Expense/Income" showLeftButton={true} onLeftPress={() => navigation.goBack()} showBell={false} showProfile={false} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Selection Bar */}
          <View style={styles.selectionBar}>
            {options.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.pill, selectedOption === option && styles.pillActive]}
                onPress={() => { setSelected(option); setAllocateToGoal(false); }}
              >
                <Text style={[styles.pillText, selectedOption === option && styles.pillTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/*  Card */}
          <FDSCard>
            {!(selectedOption === "Transaction" && allocateToGoal) && (
              <FDSValidatedInput
                ref={amountRef}
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                validate={(v) => v && !isNaN(v) && parseFloat(v) > 0}
                errorMessage="Amount must be greater than 0"
                icon={<Ionicons name="cash-outline" size={18} color={FDSColors.textGray} />}
              />
            )}


            <FDSValidatedInput
              ref={payeeRef}
              label="Payee / Project"
              value={payee}
              onChangeText={(t) => onPayeeChange(t)}
              placeholder="Payee or purchased project"
              validate={(v) => v && v.trim().length > 0}
              errorMessage="Payee / Project is required"
              icon={<Ionicons name="person-outline" size={18} color={FDSColors.textGray} />}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FDSLabel>Date</FDSLabel>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDate(true)}>
                  <Ionicons name="calendar-outline" size={16} color={FDSColors.textGray} />
                  <Text style={styles.dateText}>
                    {date ? `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}` : "Select Date"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <FDSValidatedPicker
                  ref={paymentTypeRef}
                  label="Payment Type"
                  value={paymentType}
                  validate={(v) => !!v}
                  errorMessage="Please select a payment type"
                  icon={<FontAwesome6 name="money-bill-transfer" size={14} color={FDSColors.textGray} />}
                >
                  <Picker
                    selectedValue={paymentType}
                    onValueChange={(v) => setPaymentType(v)}
                    style={styles.invisiblePicker}
                  >
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Credit Card" value="Credit Card" />
                    <Picker.Item label="Debit Card" value="Debit Card" />
                    <Picker.Item label="E-Wallet" value="E-Wallet" />
                    <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                    <Picker.Item label="PayPal" value="PayPal" />
                    <Picker.Item label="Cryptocurrency" value="Cryptocurrency" />
                    <Picker.Item label="Gift Card" value="Gift Card" />
                  </Picker>
                </FDSValidatedPicker>
              </View>
            </View>

            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(e, selectedDate) => {
                  setShowDate(false);
                  if (selectedDate) setDate(selectedDate);
                }}
                maximumDate={new Date()}
              />
            )}

            {/* Tag Picker */}
            {selectedOption !== "Income" && (
              <>
                <FDSValidatedPicker
                  ref={tagRef}
                  label="Tag"
                  value={tag}
                  validate={(v) => !!v}
                  errorMessage="Please select a tag"
                  icon={<Ionicons name="pricetag-outline" size={16} color={FDSColors.textGray} />}
                >
                  <Picker
                    selectedValue={tag}
                    onValueChange={(itemValue) => {
                      if (itemValue === "__add_new_tag__") {
                        navigation.navigate("AddTag", {
                          onTagAdded: async (newTag) => {
                            await fetchTag();
                            setTag(newTag.name);
                            setEssentialityLabel(newTag.essentialityLabel);
                            setTimeout(() => {
                              console.log("tag =", itemValue, " essential =", selectedTag.essentialityLabel);
                            });
                          }
                        });
                      } else {
                        setTag(itemValue);
                        const selectedTag = tags.find((d) => d.name === itemValue) || [];
                        if (selectedTag) {
                          setEssentialityLabel(Number(selectedTag.essentialityLabel));
                          setTimeout(() => {
                            console.log("tag =", itemValue, " essential =", selectedTag.essentialityLabel);
                          });
                        }
                      }
                    }}
                    style={styles.invisiblePicker}
                  >
                    <Picker.Item label="Select a tag..." value="" />
                    {tags.map((t) => (
                      <Picker.Item key={t.id} label={t.name} value={t.name} />
                    ))}
                    <Picker.Item label="➕ Add new tag" value="__add_new_tag__" />
                  </Picker>
                </FDSValidatedPicker>


                {/* Essentiality */}
                {tag && (
                  <View style={styles.rowInline}>
                    <Text style={styles.smallLabel}>Essentiality</Text>
                    <Switch value={essentialityLabel === 1} onValueChange={(v) => setEssentialityLabel(v)} trackColor={{ false: "#ccc", true: FDSColors.primary }} thumbColor={essentialityLabel ? "#fff" : "#f4f3f4"} />
                    <Text style={styles.smallLabel}>{essentialityLabel === 1 ? "Essential" : "Non-Essential"}</Text>
                  </View>
                )}
              </>
            )}

            {/* Event Tag (Active event) */}
            {selectedOption !== "Income" && !allocateToGoal && (
              <View style={{ marginTop: 12 }}>
                <FDSLabel>Active Event</FDSLabel>
                <View style={styles.eventArea}>
                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const filteredEvents = activeEventTags.filter((t) => t.startDate <= todayStr && (!t.endDate || t.endDate >= todayStr));
                    if (filteredEvents.length === 0) {
                      return <Text style={styles.hint}>No active event</Text>;
                    }
                    if (filteredEvents.length === 1) {
                      const e = filteredEvents[0];
                      return <Text style={styles.eventText}>🎉 {e.name} ({e.startDate})</Text>;
                    }
                    return (
                      <Picker selectedValue={eventTag} onValueChange={(v) => setEventTag(v)} style={styles.invisiblePicker}>
                        <Picker.Item label="-- Choose Active Event --" value={null} />
                        {filteredEvents.map((tag) => <Picker.Item key={tag.id} label={`${tag.name} (${tag.startDate})`} value={tag.name} />)}
                      </Picker>
                    );
                  })()}
                </View>
              </View>
            )}
          </FDSCard>

          {/* Periodic / Allocate to Goal Controls */}
          <FDSCard>
            <View style={styles.rowSpace}>
              <View>
                <FDSLabel>Is it periodic?</FDSLabel>
                <Text style={styles.hintSmall}>Recurring payment (monthly/yearly)</Text>
              </View>
              <Switch value={isPeriodic} onValueChange={setIsPeriodic} trackColor={{ false: "#ccc", true: "#9cd8b3" }} thumbColor={isPeriodic ? "#fff" : "#f4f3f4"} />
            </View>

            {isPeriodic && (
              <>
                <FDSLabel>Repeat Type</FDSLabel>
                <View style={styles.rowInline}>
                  {periodType.map((t) => (
                    <TouchableOpacity key={t} style={[styles.smallPill, selectedType === t && styles.smallPillActive]} onPress={() => setSelectedType(t)}>
                      <Text style={[styles.smallPillText, selectedType === t && styles.smallPillTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FDSValidatedPicker
                  ref={intervalRef}
                  label="Repeat Every"
                  value={periodInterval}
                  validate={(v) => v && Number(v) > 0}
                  errorMessage="Interval is required"
                  icon={<Ionicons name="repeat-outline" size={18} color={FDSColors.textGray} />}
                >
                  <Picker
                    selectedValue={periodInterval}
                    onValueChange={(v) => setPeriodInterval(v)}
                    style={{ position: "absolute", opacity: 0, width: "100%", height: "100%" }}
                  >
                    {[1, 2, 3, 6, 12].map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </FDSValidatedPicker>

              </>
            )}

            {selectedOption === "Transaction" && (
              <View style={[styles.rowSpace, { marginTop: 12 }]}>
                <View>
                  <FDSLabel>Allocate to Goal?</FDSLabel>
                  <Text style={styles.hintSmall}>Use this to allocate amounts into saving goals</Text>
                </View>
                <Switch value={allocateToGoal} onValueChange={setAllocateToGoal} trackColor={{ false: "#ccc", true: "#9cd8b3" }} thumbColor={allocateToGoal ? "#fff" : "#f4f3f4"} />
              </View>
            )}
          </FDSCard>

          {/* Goal Allocation Complex Section */}
          {selectedOption === "Transaction" && allocateToGoal && (
            <>
              {/* Goal list card */}
              <FDSCard>
                <FDSLabel>Select Goal</FDSLabel>
                <View style={styles.goalList}>
                  {goals.length > 0 ? (
                    goals.map((g) => {
                      const overdue = isGoalOverdue(g);

                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[
                            styles.goalItem,
                            selectedGoal === g.id && !overdue && styles.goalItemActive,
                            overdue && { opacity: 0.4 }
                          ]}
                          onPress={() => {
                            if (overdue) {
                              Alert.alert("Goal Overdue", "You cannot allocate funds to an overdue goal.");
                              return;
                            }
                            setSelectedGoal(g.id);
                          }}
                        >
                          <Text style={styles.goalName}>{g.goalName}</Text>
                          <Text style={styles.goalSmall}>RM {(g.targetAmount || 0).toFixed(2)}</Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.hint}>No goals found. Add one in Savings Planner.</Text>
                  )}

                </View>
              </FDSCard>

              {/* Saving method & account selection */}
              <FDSCard>
                <FDSLabel>Select Saving Method</FDSLabel>
                <View>
                  {savingMethods.map((m) => (
                    <TouchableOpacity key={m.id} style={[styles.methodRow, selectedSavingMethod?.id === m.id && styles.methodRowActive]} onPress={() => { setSelectedSavingMethod(m); setSelectedSavingAccount(null); }}>
                      <Text style={styles.methodIcon}>{m.icon_name}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodTitle}>{m.method_name}</Text>
                        <Text style={styles.methodSub}>Return: {m.expected_return}% • Risk: {"⭐".repeat(m.risk_level)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedSavingMethod && (
                  <>
                    <FDSLabel style={{ marginTop: 12 }}>Select Account</FDSLabel>
                    {savingAccounts.filter(a => a.method_id === selectedSavingMethod.id).map((acc) => (
                      <TouchableOpacity key={acc.id} style={[styles.accountRow, selectedSavingAccount?.id === acc.id && styles.accountRowActive]} onPress={() => setSelectedSavingAccount(acc)}>
                        <Text style={styles.accountName}>{acc.institution_name} - {acc.account_name}</Text>
                        <Text style={styles.accountBal}>Balance: RM {acc.current_balance.toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.addAccountBtn} onPress={() => setShowAccountModal(true)}>
                      <Ionicons name="add-circle-outline" size={18} color={FDSColors.primary} />
                      <Text style={styles.addAccountText}>Add New Account</Text>
                    </TouchableOpacity>
                  </>
                )}
              </FDSCard>

              {/* Amount slider card */}
              <FDSCard>
                <FDSLabel>Amount to allocate</FDSLabel>
                <View style={styles.amountRow}>
                  <Ionicons name="cash-outline" size={18} color={FDSColors.textGray} />
                  <TextInput
                    style={styles.manualAmount}
                    keyboardType="numeric"
                    value={sliderValue.toString()}
                    onChangeText={(text) => {
                      let val = parseFloat(text);
                      if (isNaN(val)) val = 0;
                      if (val > userSummary.total_balance) val = userSummary.total_balance;
                      setSliderValue(val);
                      const percent = ((val / (userSummary.total_balance || 1)) * 100).toFixed(1);
                      setSliderPercent(percent);
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor={"#c5c5c5ff"}
                  />
                  <Text style={styles.balanceShort}>/ {userSummary.total_balance.toFixed(2)}</Text>
                </View>

                {lastMonthExpenses && userSummary.total_balance > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {sliderValue > userSummary.total_balance - lastMonthExpenses.essentialTotal ? (
                      <Text style={{ color: "#D32F2F", fontWeight: "600" }}>❌ Allocating this will leave only {(userSummary.total_balance - sliderValue).toFixed(2)} for essential expenses!</Text>
                    ) : sliderValue > userSummary.total_balance - lastMonthExpenses.total ? (
                      <Text style={{ color: "#F57C00", fontWeight: "600" }}>⚠️ You may not have enough for last month's total spending.</Text>
                    ) : sliderValue > userSummary.total_balance / 2 ? (
                      <Text style={{ color: "#FBC02D", fontWeight: "600" }}>⚠️ Allocation exceeds 50% of your total balance.</Text>
                    ) : null}
                  </View>
                )}

                <Slider
                  style={{ width: "100%", height: 40, marginTop: 6 }}
                  minimumValue={0}
                  maximumValue={parseFloat(userSummary.total_balance.toFixed(2)) || 0}
                  step={1}
                  value={sliderValue}
                  onValueChange={(val) => { setSliderValue(val); const percent = ((val / (userSummary.total_balance || 1)) * 100).toFixed(1); setSliderPercent(percent); }}
                  minimumTrackTintColor={sliderColor}
                  maximumTrackTintColor="#ccc"
                  thumbTintColor={sliderColor}
                />

                <Text style={styles.sliderNote}>Amount: {sliderValue} ({sliderPercent}% of balance)</Text>
              </FDSCard>

              {/* Goal Save Button */}
              <View style={{ paddingHorizontal: 16 }}>
                <TouchableOpacity
                  style={[styles.goalSaveButton, isLoading && styles.disabledBtn]}
                  disabled={isLoading}
                  onPress={() => {
                    let hasError = false;
                    if (!selectedGoal) {
                      setGoalError(true);
                      hasError = true;
                    } else {
                      const selectedObj = goals.find(g => g.id === selectedGoal);
                      if (isGoalOverdue(selectedObj)) {
                        Alert.alert("Goal Overdue", "You cannot allocate funds to an overdue goal.");
                        hasError = true;
                      }
                      else setGoalError(false);
                    }

                    if (!selectedSavingMethod) { setMethodError(true); hasError = true; } else setMethodError(false);
                    if (!selectedSavingAccount) { setAccountError(true); hasError = true; } else setAccountError(false);
                    if (hasError) { triggerShake(); Alert.alert("Missing Information", "Please complete all required fields."); return; }
                    onSave(sliderValue); // 保留原 onSave
                  }}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.goalSaveText}>Save to {selectedGoal ? goals.find(g => g.id === selectedGoal).goalName : "Goal"}</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 普通 Save Button */}
          {!(selectedOption === "Transaction" && allocateToGoal) && (
            <View style={{ paddingHorizontal: 16 }}>
              <TouchableOpacity style={[styles.saveButton, isLoading && styles.disabledBtn]} disabled={isLoading} onPress={() => onSave()}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{selectedOption === "Income" ? "Save Income" : (selectedOption === "Expenses" ? "Save Expense" : "Save Transaction")}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Tip cards */}
          {confidenceLevel === "medium" && (<View style={styles.tipCard}><Text style={styles.tipText}>⚠️ The automatically identified amount may not be completely accurate. Please confirm.</Text></View>)}
          {confidenceLevel === "low" && (<View style={styles.tipCard}><Text style={styles.tipText}>⚠️ The identification result is uncertain. Please enter the amount.</Text></View>)}

        </ScrollView>
      </KeyboardAwareScrollView>

      <AddSavingAccountModal visible={showAccountModal} onClose={() => setShowAccountModal(false)} methodId={selectedSavingMethod?.id || null} methodName={selectedSavingMethod?.method_name || ""} savingMethods={savingMethods} onSaved={async () => { const accounts = await getSavingAccounts(userId); setSavingAccounts(accounts); }} userId={userId} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "transparent",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6fbf8" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f6fbf8" },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 16, color: "#64748B", textAlign: "center" },

  /* Selection pill */
  selectionBar: { flexDirection: "row", backgroundColor: "#8CCFB1", borderRadius: 10, padding: 6, marginBottom: 14 },
  pill: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  pillActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  pillText: { color: "#2E5E4E", fontWeight: "600" },
  pillTextActive: { color: "#2E5E4E", fontWeight: "800" },

  /* date/picker row */
  dateButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f6fa", borderRadius: 10, padding: 10 },
  dateText: { marginLeft: 8, color: "#2E5E4E" },

  /* faux picker style */
  pickerLike: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f6fa", borderRadius: 10, paddingHorizontal: 12, height: 44, marginTop: 6 },
  dropdownText: { flex: 1, color: "#6b7280" },
  invisiblePicker: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0 },

  rowInline: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  rowSpace: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  /* goal / method */
  goalList: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  goalItem: { backgroundColor: "#F5F9F7", padding: 10, borderRadius: 10, margin: 6, borderWidth: 1, borderColor: "#CDE9D6" },
  goalItemActive: { backgroundColor: "#9CD8B3", borderColor: "#7BC49E" },
  goalName: { color: "#2E5E4E", fontWeight: "600" },
  goalSmall: { color: "#555", fontSize: 12 },

  methodRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: "#f3f6fa", marginBottom: 8 },
  methodRowActive: { backgroundColor: "#9cd8b3" },
  methodIcon: { fontSize: 20, marginRight: 12 },
  methodTitle: { fontSize: 15, fontWeight: "600", color: "#2E5E4E" },
  methodSub: { fontSize: 12, color: "#555" },

  accountRow: { backgroundColor: "#f3f6fa", padding: 12, borderRadius: 10, marginTop: 8 },
  accountRowActive: { backgroundColor: "#8ad0ab" },
  accountName: { fontWeight: "600", color: "#2E5E4E" },
  accountBal: { color: "#555", fontSize: 12 },

  addAccountBtn: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  addAccountText: { marginLeft: 8, color: "#2E5E4E", fontWeight: "600" },

  amountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  manualAmount: { marginLeft: 8, borderWidth: 1, borderColor: "#CDE9D6", borderRadius: 8, paddingHorizontal: 8, height: 40, width: 140, backgroundColor: "#F8FDF9", color: "#2E5E4E" },
  balanceShort: { marginLeft: 8, color: "#555" },

  sliderNote: { marginTop: 8, color: "#555", fontWeight: "600" },

  saveButton: { backgroundColor: "#8AD0AB", paddingVertical: 14, borderRadius: 12, marginTop: 12, alignItems: "center", marginBottom: 20 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  goalSaveButton: { backgroundColor: "#2E5E4E", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  goalSaveText: { color: "#fff", fontWeight: "600" },

  disabledBtn: { opacity: 0.6 },

  hint: { color: "#6b7280", fontStyle: "italic", marginTop: 6 },
  hintSmall: { color: "#6b7280", fontSize: 12 },

  tipCard: { backgroundColor: "#FFF8D3", padding: 12, borderRadius: 12, margin: 12, borderWidth: 1, borderColor: "#E6D79B" },
  tipText: { color: "#A87B00", fontWeight: "600" },

  smallPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#F0F4F8",        // 更柔和的淡灰蓝
    borderWidth: 1,
    borderColor: "#D0D7DF",            // 细银灰边框
    marginRight: 10,
    minWidth: 80,
    alignItems: "center",
  },

  smallPillActive: {
    backgroundColor: "#8AD0AB",        // Fundora 主色
    borderColor: "#72BD99",
    shadowColor: "#8AD0AB",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  smallPillText: {
    color: "#4B5563",                  // slate gray
    fontWeight: "600",
    fontSize: 14,
  },

  smallPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  repeatContainer: {
    marginTop: 8,
    marginBottom: 12,
  },

  repeatPickerWrapper: {
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D7DF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },


});