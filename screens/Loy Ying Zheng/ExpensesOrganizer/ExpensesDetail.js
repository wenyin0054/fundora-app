import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Slider from '@react-native-community/slider';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
  getExpensesLocal,
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
  // State declarations
  const [payee, setPayee] = useState(expense.payee);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [date, setDate] = useState(new Date(expense.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tag, setTag] = useState(expense.tag);
  const [eventTag, setEventTag] = useState(expense.eventTag);
  const [paymentType, setPaymentType] = useState(expense.paymentType);
  const [isPeriodic, setIsPeriodic] = useState(Boolean(expense.isPeriodic));
  const [periodInterval, setPeriodInterval] = useState(0);
  const [essentialityLabel, setEssentialityLabel] = useState(expense.essentialityLabel);
  const [allocateToGoal, setAllocateToGoal] = useState(expense.goalId != null);
  const [dbReady, setdbReady] = useState(false);
  // Type selection
  const options = ["Expenses", "Income", "Transaction"];
  const [selectedOption, setSelectedOption] = useState(expense.typeLabel);
  const [selectedPeriodType, setSelectedPeriodType] = useState(
    expense.type || "null"
  );
  // New states for additional features
  const periodType = ["Yearly", "Monthly"];
  const [selectedType, setSelectedType] = useState(expense.periodType || "Yearly");
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(expense.goalId);
  const [sliderValue, setSliderValue] = useState(expense.amount || 0);
  const [sliderPercent, setSliderPercent] = useState(100);
  const [userSummary, setUserSummary] = useState({ total_income: 0, total_expense: 0, total_balance: 0 });

  // Data states
  const [tags, setTags] = useState([]);
  const [activeEventTags, setActiveEventTags] = useState([]);

  const { userId } = useUser(); 

  // Payment types data
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

  // Initialize data
  useEffect(() => {
    const init = async () => {
      console.log("🚀 [init] start");

      try {
        // Initialize DB
        await initDB();
        console.log("✅ DB initialized");
        setdbReady(true);

        // Load tags
        const loadedTags = await getTagsLocal();
        console.log("✅ Tags loaded:", loadedTags.length);
        setTags(loadedTags);

        // Load event tags
        const loadedEventTags = await getEventTagsLocal();
        console.log("✅ Event tags loaded:", loadedEventTags.length);
        setEventTag(loadedEventTags);

        // Load active event tags
        const active = await getActiveEventTagsLocal(userId);
        console.log("✅ Active event tags loaded:", active.length);
        setActiveEventTags(active);

        // Load goals
        const goalsData = await getGoalsLocal();
        console.log("✅ Goals loaded:", goalsData.length);
        setGoals(goalsData);

        // Load user summary
        const summary = await getUserSummary(userId);
        console.log("✅ User summary loaded:", summary);
        setUserSummary(summary);

        console.log("⚡ [init] all data loaded successfully");
      } catch (err) {
        console.error("❌ [init] error:", err);
      }
    };

    init();
  }, []);

  // Update slider when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      setSliderValue(parseFloat(amount));
      setSliderPercent(100);
    }
  }, [amount]);

  // Handle type change
  const handleTypeChange = (option) => {
    setSelectedOption(option);
    if (option !== "Transaction") {
      setAllocateToGoal(false);
    }

  };

const onUpdate = async () => {
  if (!dbReady) {
    return Alert.alert("Database not ready yet!");
  }

  // 1️⃣ VALIDATION
  if (!payee || !payee.trim()) {
    triggerShake && triggerShake();
    return Alert.alert("Missing Payee", "Please enter a payee or project.");
  }

  if (!validateAmount(amount, "Amount")) return;

  if (!date) {
    return Alert.alert("Missing Date", "Please select a date.");
  }

  if (!selectedOption) {
    return Alert.alert("Missing Type", "Please choose a type (Income/Expense/Transaction).");
  }

  // tag only for Expense & Transaction
  if (selectedOption !== "Income" && !tag) {
    return Alert.alert("Missing Tag", "Please select a tag.");
  }

  if (selectedOption !== "Income" && !paymentType) {
    return Alert.alert("Missing Payment Type", "Please select a payment type.");
  }

  // validate goal allocation
  if (selectedOption === "Transaction" && allocateToGoal) {
    if (!selectedGoal) {
      return Alert.alert("Missing Goal", "Please select a goal.");
    }
    if (sliderValue <= 0) {
      return Alert.alert("Invalid Amount", "Allocated amount must be > 0.");
    }
    if (sliderValue > parseFloat(amount)) {
      return Alert.alert("Error", "Allocated amount cannot exceed transaction amount.");
    }
  }

  const newAmount = selectedOption === "Transaction" && allocateToGoal
    ? sliderValue
    : parseFloat(amount);

  const newData = {
    payee: payee.trim(),
    amount: newAmount,
    date: date.toISOString().split("T")[0],
    tag,
    eventTag,
    paymentType,
    isPeriodic,
    selectedType,
    typeLabel: selectedOption.toLowerCase(),
    essentialityLabel: essentialityLabel ? 1 : 0,
    goalId: selectedOption === "Transaction" && allocateToGoal ? selectedGoal : null,
    periodInterval
  };

  const oldData = {
    payee: expense.payee,
    amount: parseFloat(expense.amount),
    date: expense.date,
    tag: expense.tag,
    eventTag: expense.eventTag,
    paymentType: expense.paymentType,
    isPeriodic: expense.isPeriodic,
    selectedType: expense.selectedType,
    typeLabel: expense.typeLabel.toLowerCase(),
    essentialityLabel: expense.essentialityLabel,
    goalId: expense.goalId,
    periodInterval: expense.periodInterval
  };

  // 2️⃣ COMPARE — skip update if no changes
  const unchanged = JSON.stringify(newData) === JSON.stringify(oldData);
  if (unchanged) {
    return Alert.alert("No Changes", "You did not modify any fields.");
  }

  try {
    // 3️⃣ GOAL ALLOCATION LOGIC
    const oldAmount = oldData.amount;
    const oldType = oldData.typeLabel;
    const newType = newData.typeLabel;
    const hadGoalBefore = oldData.goalId !== null;
    const hasGoalNow = newData.goalId !== null;

    // remove old allocation
    if (hadGoalBefore && !hasGoalNow) {
      await updateGoalAmount(oldData.goalId, -oldAmount, true);
    }

    // add new allocation
    if (!hadGoalBefore && hasGoalNow) {
      await updateGoalAmount(newData.goalId, newData.amount, true);
    }

    // adjust allocation (same goal, different amount)
    if (hadGoalBefore && hasGoalNow && oldData.goalId === newData.goalId) {
      const diff = newData.amount - oldAmount;
      if (diff !== 0) {
        await updateGoalAmount(newData.goalId, diff, true);
      }
    }

    // 4️⃣ UPDATE EXPENSE DATA
    await updateExpenseLocal(
      expense.id,
      newData.payee,
      newData.amount,
      newData.date,
      newData.tag,
      newData.eventTag,
      newData.paymentType,
      newData.isPeriodic,
      newData.selectedType,
      newData.typeLabel,
      newData.essentialityLabel,
      newData.goalId,
      newData.periodInterval
    );

    // 5️⃣ UPDATE USER SUMMARY
    if (oldType === newType) {
      await updateUserSummaryOnEdit(expense.userId, oldType, oldAmount, newData.amount);
    } else {
      // remove old
      await updateUserSummaryOnDelete(expense.userId, oldType, oldAmount);
      // add new
      await updateUserSummaryOnAdd(expense.userId, newType, newData.amount);
    }

    Alert.alert("Success", "Record updated successfully!");
    navigation.goBack();

  } catch (error) {
    console.error("❌ Failed to update expense:", error);
    Alert.alert("Error", "Failed to update record.");
  }
};



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
            const oldType = expense.typeLabel.toLowerCase(); // 'income', 'expenses', 'transaction'
            const oldAmount = parseFloat(expense.amount);

            // 1️⃣ Delete expense locally
            await deleteExpenseLocal(expense.id);

            // 2️⃣ Update user summary (always)
            if (oldType === "income") {
              await updateUserSummaryOnDelete(expense.userId, "income", oldAmount);
            } else {
              await updateUserSummaryOnDelete(expense.userId, "expense", oldAmount);
            }

            // 3️⃣ Update goal allocation if needed
            if (oldType === "transaction" && expense.goalId) {
              // Subtract deleted amount from the goal with protection >= 0
              await updateGoalAmount(expense.goalId, -oldAmount, true);
            }

            // 4️⃣ Fetch updated summary for logging/debugging
            const updatedSummary = await getUserSummary(expense.userId);
            console.log("✅ Updated summary after delete:", updatedSummary);

            Alert.alert("🗑️ Deleted", "Record removed successfully!");
            navigation.goBack();
          } catch (error) {
            console.error("❌ Failed to delete expense:", error);
            Alert.alert("❌ Error", "Failed to delete record.");
          }
        },
      },
    ]);
  };


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
        extraScrollHeight={Platform.OS === 'ios' ? 120 : 80}
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
                    selectedOption.toLowerCase() === option.toLowerCase() && styles.typeButtonActive,
                  ]}
                  onPress={() => handleTypeChange(option)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedOption.toLowerCase() === option.toLowerCase() && styles.typeButtonActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payee Input */}
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#6c757d" />
              <TextInput
                style={styles.input}
                value={payee}
                onChangeText={setPayee}
                placeholder="Payee or purchased project"
              />
            </View>

            {/* Amount Input or Total Balance Display */}
            {selectedOption === "Transaction" && allocateToGoal ? (
              <View style={[styles.inputRow, { justifyContent: "space-between", height: 45 }]}>
                <Ionicons name="wallet-outline" size={20} color="#6c757d" />
                <Text style={{ flex: 1, marginLeft: 8, fontSize: 16, color: "#2E5E4E" }}>
                  Total Balance: RM {userSummary.total_balance?.toFixed(2) || "0.00"}
                </Text>
              </View>
            ) : (
              <View style={styles.inputRow}>
                <Ionicons name="cash-outline" size={20} color="#6c757d" />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount"
                />
              </View>
            )}

            {/* Date Picker */}
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={20} color="#6c757d" />
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {date.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(e, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
                maximumDate={new Date()} // only today or past date
              />
            )}


            {/* Tag */}
            {selectedOption !== "Income" && (
              <View style={styles.pickerContainer}>
                <Ionicons name="pricetag-outline" size={20} color="#6c757d" style={styles.icon} />

                {/* Read-only display of selected tag */}
                <TextInput
                  value={tag}
                  style={styles.dropdownContent}
                  placeholder="Select a tag"
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

            {/* Payment Type Picker */}
            <View style={styles.pickerContainer}>
              <FontAwesome6 name="money-bill-transfer" size={14} color="#6c757d" style={styles.icon} />
              <TextInput
                value={paymentType}
                style={styles.pickerDisplay}
                placeholder="Select payment type"
                editable={false}
                pointerEvents="none"
              />
              <Picker
                selectedValue={paymentType}
                onValueChange={setPaymentType}
                style={styles.hiddenPicker}
              >
                <Picker.Item label="Select payment type..." value="" />
                {paymentTypeData.map((item) => (
                  <Picker.Item key={item.id} label={item.name} value={item.name} />
                ))}
              </Picker>
            </View>

            {/* Event Tag Section */}
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
                    <Text style={styles.noEventText}>No active event</Text>
                  );
                }

                if (filteredEvents.length === 1) {
                  const tag = filteredEvents[0];
                  return (
                    <Text style={styles.activeEventText}>
                      🎉 {tag.name} ({tag.startDate})
                    </Text>
                  );
                }

                return (
                  <View style={styles.eventPickerWrapper}>
                    <Picker
                      selectedValue={eventTag}
                      onValueChange={setEventTag}
                    >
                      <Picker.Item label="-- Choose Active Event --" value="" />
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
                            selectedPeriodType === type && styles.typeButtonTextActive,
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
              </View>
            )}

            {/* Allocate to Goal Switch */}
            {selectedOption === "Transaction" && (
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Allocate Income to Goal?</Text>
                <Switch
                  value={allocateToGoal}
                  onValueChange={setAllocateToGoal}
                  trackColor={{ false: "#ccc", true: "#9cd8b3" }}
                  thumbColor={allocateToGoal ? "#4CAF50" : "#f4f3f4"}
                />
              </View>
            )}

            {/* Goal Allocation Section */}
            {selectedOption === "Transaction" && allocateToGoal && (
              <View style={styles.goalCard}>
                <Text style={styles.goalTitle}>Allocate Income to Goal</Text>

                {/* Goal selection */}
                <View style={styles.goalList}>
                  {goals.length > 0 ? (
                    goals.map(goal => (
                      <TouchableOpacity
                        key={goal.id}
                        style={[
                          styles.goalButton,
                          selectedGoal === goal.id && styles.goalButtonActive
                        ]}
                        onPress={() => setSelectedGoal(goal.id)}
                      >
                        <Text
                          style={[
                            styles.goalButtonText,
                            selectedGoal === goal.id && styles.goalButtonTextActive
                          ]}
                        >
                          {goal.goalName}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noGoalsText}>
                      No goals found.
                    </Text>
                  )}
                </View>

                {/* Slider */}
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>Select amount to save from income:</Text>
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={parseFloat(amount) || 0}
                    step={1}
                    value={sliderValue}
                    onValueChange={(val) => {
                      setSliderValue(val);
                      const percent = amount ? ((val / parseFloat(amount)) * 100).toFixed(1) : 0;
                      setSliderPercent(percent);
                    }}
                    minimumTrackTintColor="#2E5E4E"
                    maximumTrackTintColor="#ccc"
                    thumbTintColor="#2E5E4E"
                  />
                  <Text style={styles.sliderValueText}>
                    Amount: RM {sliderValue.toFixed(2)} ({sliderPercent}% of income)
                  </Text>
                </View>
              </View>
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
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContainer: {
    padding: 20
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
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: "center",
    height: "100%",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
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
  hiddenPicker: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
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
  switchText: {
    marginLeft: 10,
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
  sliderValueText: {
    marginTop: 5,
    textAlign: "center",
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
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