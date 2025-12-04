import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Animated } from "react-native";
import AddSavingAccountModal from "./AddSavingAccountModal";

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
} from "../../../database/SQLite";
import AppHeader from "../../reuseComponet/header";
import Slider from '@react-native-community/slider';
import { predictCategory, THRESHOLDS, saveUserTag } from '../AIPredictionEngine';
import { useUser } from "../../reuseComponet/UserContext";

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
  const [essentialityLabel, setEssentialityLabel] = useState(null);
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

  //for load savings method and account
  const [savingMethods, setSavingMethods] = useState([]);
  const [savingAccounts, setSavingAccounts] = useState([]);
  const [selectedSavingMethod, setSelectedSavingMethod] = useState(null);
  const [selectedSavingAccount, setSelectedSavingAccount] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const [methodError, setMethodError] = useState(false);
  const [accountError, setAccountError] = useState(false);

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
      console.log("🚀 [init] start");

      try {
        await initDB();
        console.log("✅ DB initialized");
        setdbReady(true);

        const loadedTags = await getTagsLocal(userId);
        console.log("✅ Tags loaded:", loadedTags.length);
        setTags(loadedTags);

        const eventTagData = await getEventTagsLocal(userId);
        console.log("✅ Event tags loaded:", eventTagData.length);
        setEventTagData(eventTagData);

        const goalsData = await getGoalsLocal(userId);
        console.log("✅ Goals loaded:", goalsData.length);
        setGoals(goalsData);

        const active = await getActiveEventTagsLocal(userId);
        console.log("✅ Active event tags:", active.length);
        setActiveEventTags(active);

        const summary = await getUserSummary(userId);
        console.log("✅ User summary loaded:", summary);
        setUserSummary(summary);

        // load savings method and account
        const methods = await getSavingMethods(userId);
        console.log("✅ Saving methods loaded:", methods.length);
        setSavingMethods(methods);

        const accounts = await getSavingAccounts(userId);
        console.log("✅ Saving accounts loaded:", accounts.length);
        setSavingAccounts(accounts);

        console.log("⚡ calling getLastMonthTotalExpense()");
        const expenses = await getLastMonthTotalExpense(userId);
        console.log("📊 getLastMonthTotalExpense returned:", expenses);

        const essentialTotal = expenses?.essentialTotal ?? 0;
        const total = expenses?.total ?? 0;
        setLastMonthExpenses({ essentialTotal, total });

        console.log("✅ lastMonthExpenses set:", { essentialTotal, total });
      } catch (err) {
        console.error("❌ [init] error:", err);
      }
    };

    init();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      const data = route.params?.scannedData;
      if (!data) return;

      try {
        console.log("Scanned Data Received:", data.text);

        if (data.merchant_name) {
          const merchant = data.merchant_name || "";
          setPayee(merchant);
          await onPayeeChange(merchant).catch(e => console.error(e));
        }

        if (data.total_amount) setAmount(data.total_amount?.toString() || "");
        if (data.transaction_date) setDate(new Date(data.transaction_date));

      } catch (error) {
        console.error("Error processing scanned data:", error);
      } finally {
        // clear param to avoid duplicate
        navigation.setParams({ scannedData: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params?.scannedData]);


  useEffect(() => {
    console.log("lastMonthExpenses updated:", lastMonthExpenses);
  }, [lastMonthExpenses]);

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

    // call AI predictor (async)
    const res = await predictCategory(userId, text);
    setPredInfo(res);

    console.log("🎯 PREDICTION RESULT:", {
      category: res.category,
      confidence: res.confidence,
      source: res.source,
      hasSuggestions: !!res.suggestions
    });

    // 1) If user memory exists -> auto assign tag
    if (res.category && res.source === "user_memory") {
      console.log("✅ AUTO ASSIGN: User memory -", res.category);
      setTag(res.category);
      return;
    }

    // 2) If AI ensemble strong enough to auto assign
    if (res.category && res.source.includes("ai_auto") && res.confidence >= THRESHOLDS.AI_ENSEMBLE.AUTO_ASSIGN) {
      console.log("✅ AUTO ASSIGN: AI Ensemble -", res.category, "confidence:", res.confidence);
      setTag(res.category);
      return;
    }

    // 3) If individual model strong enough to auto assign
    if (res.category && (res.source.includes("_auto")) && res.confidence >= THRESHOLDS.FUZZY_MATCH.AUTO_ASSIGN) {
      console.log("✅ AUTO ASSIGN: Individual Model -", res.category, "confidence:", res.confidence);
      setTag(res.category);
      return;
    }

    // 4) If suggestions available -> show suggestion UI
    if (res.suggestions && res.suggestions.length > 0) {
      console.log("💡 SUGGESTIONS:", res.suggestions.map(s =>
        `${s.category} (${s.confidence.toFixed(2)})`
      ));
      // UI will show suggestions based on predInfo
    } else {
      console.log("❌ NO CONFIDENT SUGGESTION");
    }
  };

  // When the user manually selects a tag, it is saved to the user's memory
  const handleTagSelect = async (selectedTag) => {
    setTag(selectedTag);

    // Save user selection to AI memory
    if (payee && selectedTag) {
      await saveUserTag(userId, payee, selectedTag, 1);
      console.log("💾 Saved user choice to AI memory");
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
    // 1️⃣ VALIDATE AMOUNT (Income / Expense / Transaction without allocation)
    if (!isGoalAllocation) {
      if (!validateAmount(amount, "Amount")) return;
    }

    // 2️⃣ VALIDATE GOAL ALLOCATION AMOUNT
    if (isGoalAllocation) {
      if (!validateAmount(sliderValue, "Goal Amount")) return;
      if (!selectedGoal) return Alert.alert("Missing Goal", "Please select a goal.");
      if (sliderValue <= 0) return Alert.alert("Invalid Amount", "Please select amount to allocate.");
    }

    // 3️⃣ VALIDATE EXPENSE TAG
    if ((isExpense || (isTransaction && !isGoalAllocation)) && !currentTag) {
      triggerShake();
      return Alert.alert("Missing Tag", "Please select a tag.");
    }

    // 4️⃣ VALIDATE PAYMENT TYPE
    if ((isExpense || (isTransaction && !isGoalAllocation)) && !paymentType) {
      triggerShake();
      return Alert.alert("Missing Payment Type", "Please select a payment type.");
    }

    // 5️⃣ VALIDATE PAYEE (Only Expense / Transaction)
    if ((isExpense || isTransaction) && !isGoalAllocation) {
      if (!trimmedPayee) {
        triggerShake();
        return Alert.alert("Missing Payee", "Please enter a payee or project.");
      }
    }

    // ------------------ AUTO TAG SAVE ------------------
    if (trimmedPayee && currentTag && !isGoalAllocation) {
      console.log("🔖 Saving auto-tag data");
      handleTagSelect(currentTag);
    }

    try {
      setIsLoading(true);
      await initDB();

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
        Alert.alert("Success", "Income recorded successfully!");
      }

      // ==================== EXPENSE / TRANSACTION ====================
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
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Add Expense/Income"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Selection Bar */}
          <View style={styles.SelectionBarContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.button, selectedOption === option && styles.selectedButton]}
                onPress={() => {
                  setSelected(option);
                  setAllocateToGoal(false); // reset
                }}
              >
                <Text style={[styles.text, selectedOption === option && styles.selectedText]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payee */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#6c757d" />
              <TextInput
                placeholder="Payee or purchased project"
                placeholderTextColor={"#c5c5c5ff"}
                style={styles.input}
                value={payee}
                onChangeText={onPayeeChange}
              />
              <TouchableOpacity onPress={() => navigation.navigate("ScanReceipt")}>
                <Ionicons name="camera-outline" size={22} color="#6c757d" />
              </TouchableOpacity>
            </View>
          </Animated.View>
          {/* Amount or Total Balance */}
          {selectedOption === "Transaction" && allocateToGoal ? (
            <View style={[styles.inputRow, { justifyContent: "space-between", height: 45 }]}>
              <Ionicons name="wallet-outline" size={20} color="#6c757d" />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 16, color: "#2E5E4E" }}>
                Total Balance: {userSummary.total_balance.toFixed(2)}
              </Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={20} color="#6c757d" />
                <TextInput
                  placeholder="Amount"
                  placeholderTextColor={"#c5c5c5ff"}
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </Animated.View>

          )}


          {/* Date */}
          <View style={styles.rowBetween}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDate(true)}>
              <Ionicons name="calendar-outline" size={18} color="#6c757d" />
              <Text style={styles.dateText}>
                {date
                  ? `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-${date.getFullYear()}`
                  : "Select Date"}
              </Text>
            </TouchableOpacity>
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
              maximumDate={new Date()} // only today or past date
            />
          )}



          {(!allocateToGoal || selectedOption !== "Transaction") && (
            <>
              {/* Tag */}
              {selectedOption !== "Income" && (
                <View style={styles.pickerContainer}>
                  <Ionicons name="pricetag-outline" size={20} color="#6c757d" style={styles.icon} />

                  {/* Read-only display of selected tag */}
                  <TextInput
                    value={tag}
                    style={styles.dropdownContent}
                    placeholder="Select a tag"
                    placeholderTextColor={"#c5c5c5ff"}
                    editable={false}
                    pointerEvents="none"
                  />

                  {/* Invisible picker overlay */}
                  <Picker
                    selectedValue={tag}
                    onValueChange={(itemValue) => {
                      if (itemValue === '__add_new_tag__') {
                        navigation.navigate('AddTag', {
                          onTagAdded: async (newTag) => {
                            await fetchTag(); // reload user tags
                            setTag(newTag);   // set the new tag as selected
                          }
                        });
                      } else {
                        setTag(itemValue);
                        // First, search in user tags. If you can't find it, then go to default tags
                        const selectedTag =
                          tags.find((d) => d.name === itemValue) ||
                          DEFAULT_TAGS.find((d) => d.name === itemValue);
                        setEssentialityLabel(selectedTag ? !!selectedTag.essentialityLabel : 0);
                      }
                    }}
                    style={[styles.picker, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }]}
                    dropdownIconColor="#2E5E4E"
                  >
                    <Picker.Item label="Select a tag..." value="" />

                    {/* user tags */}
                    {tags.map((item) => (
                      <Picker.Item key={`user-${item.id}`} label={item.name} value={item.name} />
                    ))}

                    {/* default tags */}
                    {DEFAULT_TAGS.map((item) => (
                      <Picker.Item key={`default-${item.name}`} label={item.name} value={item.name} />
                    ))}

                    <Picker.Item label="➕ Add new tag" value="__add_new_tag__" />
                  </Picker>
                </View>
              )}

              {/* Essentiality Switch */}
              {tag && essentialityLabel !== null && selectedOption !== "Income" && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 25, marginBottom: 10 }}>
                  <Text style={{ marginRight: 10, color: "#555" }}>Essentiality:</Text>
                  <Switch
                    value={essentialityLabel}
                    onValueChange={(value) => setEssentialityLabel(value)}
                    trackColor={{ false: "#ccc", true: "#4CAF50" }}
                    thumbColor={essentialityLabel ? "#fff" : "#f4f3f4"}
                  />
                  <Text style={{ marginLeft: 10, color: "#555" }}>
                    {essentialityLabel ? "Essential" : "Non-Essential"}
                  </Text>
                </View>
              )}

              {/* Payment Type */}
              <View style={styles.pickerContainer}>
                <FontAwesome6 name="money-bill-transfer" size={14} color="#6c757d" style={styles.icon} />

                <TextInput
                  value={paymentType}
                  style={styles.dropdownContent}
                  placeholder="Select payment type"
                  placeholderTextColor={"#c5c5c5ff"}
                  editable={false}
                  pointerEvents="none"
                />

                <Picker
                  selectedValue={paymentType}
                  onValueChange={(itemValue) => setPaymentType(itemValue)}
                  style={[styles.picker, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }]}
                  dropdownIconColor="#2E5E4E"
                >
                  <Picker.Item label="Select a payment type..." value="" />
                  {paymentTypeData.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.name} />
                  ))}
                </Picker>
              </View>

              {selectedOption !== "Income" && (!allocateToGoal && selectedOption !== "Transaction") && (
                <View style={styles.eventTagContainer}>
                  <Text style={styles.eventTagTitle}>Active Event</Text>

                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const filteredEvents = activeEventTags.filter(
                      (tag) =>
                        tag.startDate <= todayStr &&
                        (!tag.endDate || tag.endDate >= todayStr)
                    );

                    if (filteredEvents.length === 0) {
                      return (
                        <Text style={{ color: "#555", fontStyle: "italic", marginTop: 5 }}>
                          No active event
                        </Text>
                      );
                    }

                    if (filteredEvents.length === 1) {
                      const tag = filteredEvents[0];
                      return (
                        <Text style={{ color: "#2E5E4E", marginTop: 5 }}>
                          🎉 {tag.name} ({tag.startDate})
                        </Text>
                      );
                    }

                    return (
                      <View style={styles.dropdownWrapper}>
                        <Picker
                          selectedValue={eventTagData}
                          onValueChange={(itemValue) => setTag(itemValue)}
                        >
                          <Picker.Item label="-- Choose Active Event --" value={null} />
                          {filteredEvents.map((tag) => (
                            <Picker.Item
                              key={tag.id}
                              label={`${tag.name} (${tag.startDate})`}
                              value={tag.name}
                            />
                          ))}
                        </Picker>
                      </View>
                    );
                  })()}
                </View>
              )}


              {/* Periodic Switch */}
              <View style={styles.periodicContainer}>
                <Text style={styles.label}>Is it periodic?</Text>
                <Switch
                  value={isPeriodic}
                  onValueChange={setIsPeriodic}
                  trackColor={{ false: "#ccc", true: "#9cd8b3" }}
                  thumbColor={isPeriodic ? "#4CAF50" : "#f4f3f4"}
                />
              </View>

              {/* Period Type Selection Bar */}
              {isPeriodic && (
                <>
                  <View style={styles.periodicPicker}>
                    <View style={styles.selectionBarContainer}>
                      {periodType.map((type, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.typeButton,
                            selectedType === type && styles.typeButtonActive,
                          ]}
                          onPress={() => setSelectedType(type)}
                        >
                          <Text
                            style={[
                              styles.typeButtonText,
                              selectedType === type && styles.typeButtonTextActive,
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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
                </>
              )}

            </>
          )}

          {selectedOption === "Transaction" && (
            <View style={styles.periodicContainer}>
              <Text style={styles.label}>Allocate Income to Goal?</Text>
              <Switch
                value={allocateToGoal}
                onValueChange={setAllocateToGoal}
                trackColor={{ false: "#ccc", true: "#9cd8b3" }}
                thumbColor={allocateToGoal ? "#4CAF50" : "#f4f3f4"}
              />
            </View>
          )}

          {/* Save Button for Income / Expense / Transaction */}
          {(selectedOption === "Income" ||
            selectedOption === "Expenses" ||
            (selectedOption === "Transaction" && !allocateToGoal)) && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled
                ]}
                onPress={() => onSave()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {selectedOption === "Income"
                      ? "Save Income"
                      : selectedOption === "Expenses"
                        ? "Save Expense"
                        : "Save Transaction"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

          {selectedOption === "Transaction" && allocateToGoal && (
            <View style={styles.goalCard}>
              <Text style={styles.goalTitle}>Allocate Income to Goal</Text>

              {/* ------------------ GOAL LIST ------------------ */}
              <Text style={styles.subLabel}>Select your goal:</Text>
              <Animated.View
                style={[
                  styles.goalList,
                  goalError && styles.errorBorder,     // 红框
                  { transform: [{ translateX: shakeAnim }] }
                ]}
              >
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
                      <Text style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
                        Target: RM {(goal.targetAmount || 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptyGoalText}>
                    No goals found. Please add one in Savings Planner.
                  </Text>
                )}
              </Animated.View>

              <View style={styles.divider} />

              {/* ------------------ SAVING METHOD LIST ------------------ */}
              <Text style={styles.subLabel}>Select Saving Method:</Text>
              <Animated.View
                style={[
                  styles.methodList,
                  methodError && styles.errorBorder,
                  { transform: [{ translateX: shakeAnim }] }
                ]}
              >

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
                    }}
                  >
                    <Text style={styles.methodIcon}>{method.icon_name}</Text>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>{method.method_name}</Text>
                      <Text style={styles.methodDetails}>
                        Return: {method.expected_return}% • Risk: {"⭐".repeat(method.risk_level)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Animated.View>

              {/* ------------------ SAVING ACCOUNT LIST ------------------ */}
              {selectedSavingMethod && (
                <>
                  <Text style={styles.subLabel}>Select Account:</Text>
                  <Animated.View
                    style={[
                      styles.accountSection,
                      accountError && styles.errorBorder,
                      { transform: [{ translateX: shakeAnim }] }
                    ]}
                  >

                    {savingAccounts
                      .filter((a) => a.method_id === selectedSavingMethod.id)
                      .map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountButton,
                            selectedSavingAccount?.id === account.id &&
                            styles.accountButtonActive,
                          ]}
                          onPress={() => {
                            setSelectedSavingAccount(account);
                          }}
                        >
                          <Text style={styles.accountName}>
                            {account.institution_name} - {account.account_name}
                          </Text>

                          <Text style={styles.accountBalance}>
                            Balance: RM {account.current_balance.toFixed(2)}
                          </Text>

                          {account.interest_rate > 0 && (
                            <Text style={styles.accountRate}>
                              Rate: {account.interest_rate}%
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}

                    {/* Add New Account Button */}
                    <TouchableOpacity
                      style={styles.addAccountButton}
                      onPress={() => setShowAccountModal(true)}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="#8AD0AB"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.addAccountText}>Add New Account</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              )}

              <View style={styles.divider} />

              {/* ------------------ SLIDER + MANUAL INPUT ------------------ */}
              <View style={styles.amountSection}>
                <Text style={styles.subLabel}>Select amount to save:</Text>

                <View style={styles.amountInputRow}>
                  <Ionicons name="cash-outline" size={20} color="#2E5E4E" />
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    value={sliderValue.toString()}
                    onChangeText={(text) => {
                      let val = parseFloat(text);
                      if (isNaN(val)) val = 0;
                      if (val > userSummary.total_balance) val = userSummary.total_balance;

                      setSliderValue(val);
                      const percent = ((val / userSummary.total_balance) * 100).toFixed(1);
                      setSliderPercent(percent);
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor={"#c5c5c5ff"}
                  />
                  <Text style={styles.balanceText}>
                    / {userSummary.total_balance.toFixed(2)}
                  </Text>
                </View>

                {/* ------------- WARNING LOGIC (保留你的逻辑) ------------- */}
                {lastMonthExpenses && userSummary.total_balance > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {sliderValue >
                      userSummary.total_balance - lastMonthExpenses.essentialTotal ? (
                      <Text style={{ color: "#D32F2F", fontWeight: "600" }}>
                        ❌ Allocating this will leave only{" "}
                        {(userSummary.total_balance - sliderValue).toFixed(2)}{" "}
                        for essential expenses!
                      </Text>
                    ) : sliderValue >
                      userSummary.total_balance - lastMonthExpenses.total ? (
                      <Text style={{ color: "#F57C00", fontWeight: "600" }}>
                        ⚠️ You may not have enough for last month's total spending.
                      </Text>
                    ) : sliderValue > userSummary.total_balance / 2 ? (
                      <Text style={{ color: "#FBC02D", fontWeight: "600" }}>
                        ⚠️ Allocation exceeds 50% of your total balance.
                      </Text>
                    ) : null}
                  </View>
                )}

                <Slider
                  style={{ width: "100%", height: 40, marginTop: 6 }}
                  minimumValue={0}
                  maximumValue={parseFloat(userSummary.total_balance.toFixed(2)) || 0}
                  step={1}
                  value={sliderValue}
                  onValueChange={(val) => {
                    setSliderValue(val);
                    const percent = ((val / userSummary.total_balance) * 100).toFixed(1);
                    setSliderPercent(percent);
                  }}
                  minimumTrackTintColor={sliderColor}
                  maximumTrackTintColor="#ccc"
                  thumbTintColor={sliderColor}
                />

                <Text style={styles.sliderValueText}>
                  Amount: {sliderValue} ({sliderPercent}% of balance)
                </Text>
              </View>

              {/* ------------------ ADD SAVING ACCOUNT MODAL ------------------ */}
              <AddSavingAccountModal
                visible={showAccountModal}
                onClose={() => setShowAccountModal(false)}
                methodId={selectedSavingMethod?.id || null}
                methodName={selectedSavingMethod?.method_name || ""}
                savingMethods={savingMethods}
                onSaved={async () => {
                  const accounts = await getSavingAccounts(userId);
                  setSavingAccounts(accounts);
                }}
                userId={userId}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.goalSaveButton,
                  isLoading && styles.saveButtonDisabled
                ]}
                disabled={isLoading}
                onPress={() => {

                  let hasError = false;

                  if (!selectedGoal) {
                    setGoalError(true);
                    hasError = true;
                  } else setGoalError(false);

                  if (!selectedSavingMethod) {
                    setMethodError(true);
                    hasError = true;
                  } else setMethodError(false);

                  if (!selectedSavingAccount) {
                    setAccountError(true);
                    hasError = true;
                  } else setAccountError(false);

                  if (hasError) {
                    triggerShake();  // <-- 使用你现成的 shake 动画
                    Alert.alert("Missing Information", "Please complete all required fields.");
                    return;
                  }

                  onSave(sliderValue);
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.goalSaveText}>
                    Save to {selectedGoal ? goals.find(g => g.id === selectedGoal).goalName : 'Goal'}
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          )}





        </ScrollView>
      </KeyboardAwareScrollView>
    </View >
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    color: "#2e2e2e",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: 45,
    marginHorizontal: 8,
  },
  inputBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    height: 45,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    width: 190,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginRight: 10,
    elevation: 3,
  },
  dateText: {
    marginLeft: 6,
    color: "#333",
  },
  periodicContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
  },
  label: {
    fontSize: 16,
    color: "#333",
  },
  periodButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#9cd8b3",
  },
  periodText: {
    color: "#333",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#9cd8b3",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.6,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  SelectionBarContainer: {
    flexDirection: "row",
    backgroundColor: "#8CCFB1", // green background
    borderRadius: 8,
    padding: 4,
    justifyContent: "space-between",
    marginBottom: 20,

  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  selectedButton: {
    backgroundColor: "#fff",
  },
  text: {
    color: "#2E5E4E",
    fontSize: 16,
    fontWeight: "500",

  },
  selectedText: {
    color: "#2E5E4E",
    fontWeight: "bold",
  },
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 4,
    justifyContent: "space-between",
    marginBottom: 12,
    elevation: 3,
    paddingHorizontal: 10,  // keeps space on left and right
    height: 45,

  },
  picker: {
    flex: 1,
    color: "#2E5E4E",
    fontSize: 14,
    backgroundColor: "transparent", // avoid double background layers
  },
  icon: {
    marginRight: 8,
    alignSelf: "center",
  },
  dropdownContent: {
    position: 'absolute',
    left: 30,
    color: '#6c757d',
    zIndex: 1
  },
  goalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  goalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E5E4E",
    textAlign: "center",
    marginBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#E3F1E7",
    marginVertical: 15,
  },

  subLabel: {
    fontSize: 15,
    color: "#2E5E4E",
    marginBottom: 8,
    fontWeight: "500",
  },

  goalList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  goalButton: {
    backgroundColor: "#F5F9F7",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 6,
    borderWidth: 1,
    borderColor: "#CDE9D6",
  },

  goalButtonActive: {
    backgroundColor: "#9CD8B3",
    borderColor: "#7BC49E",
  },

  goalButtonText: {
    color: "#2E5E4E",
    fontWeight: "500",
  },

  goalButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  emptyGoalText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },

  amountSection: {
    marginTop: 5,
  },

  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  amountInput: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#CDE9D6",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    width: 130,
    textAlign: "center",
    fontWeight: "500",
    color: "#2E5E4E",
    backgroundColor: "#F8FDF9",
  },

  balanceText: {
    marginLeft: 8,
    color: "#555",
    fontSize: 14,
  },

  goalSaveButton: {
    backgroundColor: "#2E5E4E",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  goalSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  eventTagContainer: {
    borderTopWidth: 1,
    borderTopColor: "#d6e8de",
    marginTop: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: "#F6FBF7",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  eventTagTitle: {
    fontWeight: "600",
    color: "#2E5E4E",
    fontSize: 15,
    marginBottom: 8,
  },

  dropdownWrapper: {
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
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E5E4E",
    marginTop: 10,
    marginBottom: 6,
  },

  /* Saving Method Styles */
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

  /* Account Styles */
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
  errorBorder: {
    borderWidth: 1.5,
    borderColor: "#D9534F",
    borderRadius: 8,
  }

});