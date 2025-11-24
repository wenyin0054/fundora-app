import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { initDB, addExpenseLocal, getExpensesLocal, getTagsLocal } from "../database/SQLite" ;
import AppHeader from "./reuseComponet/header"

export default function AddExpenseScreen({ navigation }) {
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [isPeriodic, setIsPeriodic] = useState(false);
  const periodType = ["Yearly", "Quarterly"];
  const [selectedType, setSelectedType] = useState("Yearly");
  const [essentialityLabel, setEssentialityLabel] = useState(null);
  const [tag, setTag] = useState("");
  const [eventTag, setEventTag] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [selectedOption, setSelected] = useState("Expenses");
  const options = ["Expenses", "Income", "Transaction"];
  const [dbReady, setdbReady] = useState(false);
  const [tags, setTags] = useState([]);

  const userId = "U000001"; // Placeholder user ID

  const eventTagData = [
    { id: '1', name: 'Birth Day' },
    { id: '2', name: 'Travel' },
    { id: '3', name: 'Shopping' },
  ];

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

  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        setdbReady(true);

        const expenses = await getExpensesLocal();
        console.log('✅ Existing expenses:', expenses);

        const loadedTags = await getTagsLocal();
        console.log('✅ Loaded tags:', loadedTags);
        setTags(loadedTags);
      } catch (error) {
        console.log('❌ Failed to setup DB:', error);
      }
    };

    setupDB();
  }, []);

  const onSave = async () => {
    if (!dbReady) {
      Alert.alert("Database not ready yet!");
      return;
    }

    const trimmedPayee = payee.trim();
    const trimmedAmount = amount.trim();

    if (!trimmedPayee) {
      Alert.alert("Please enter a payee or purchased project.");
      return;
    }

    if (!trimmedAmount || isNaN(trimmedAmount) || parseFloat(trimmedAmount) <= 0) {
      Alert.alert("Please enter a valid amount.");
      return;
    }

    if (!tag) {
      Alert.alert("Please select a tag.");
      return;
    }

    if (!paymentType) {
      Alert.alert("Please select a payment type.");
      return;
    }

    try {
      await addExpenseLocal(
        userId,
        trimmedPayee,
        parseFloat(trimmedAmount),
        date.toISOString().split('T')[0],
        tag,
        eventTag,
        paymentType,
        isPeriodic,
        selectedType,
        selectedOption.toLowerCase(),
        essentialityLabel ? 1 : 0
      );

      const expenses = await getExpensesLocal();
      console.log('✅ Expenses:', expenses);

      Alert.alert("Expense saved!");

      // Clear fields
      setPayee("");
      setAmount("");
      setTag("");
      setEventTag("");
      setPaymentType("Cash");
      setIsPeriodic(false);
      setSelectedType("Yearly");
      setEssentialityLabel(null);
    } catch (error) {
      console.log('❌ Error saving expense:', error);
      Alert.alert("Failed to save expense!");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Add Expense/Income"
        showLeftButton={true}
        onLeftPress={() => navigation.goBack()}
        showBell={false}
        showProfile={false}
      />

      <ScrollView style={styles.container}>
        {/* Option Selection */}
        <View style={styles.SelectionBarContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.button, selectedOption === option && styles.selectedButton]}
              onPress={() => setSelected(option)}
            >
              <Text style={[styles.text, selectedOption === option && styles.selectedText]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payee */}
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={20} color="#6c757d" />
          <TextInput
            placeholder="Payee or purchased project"
            style={styles.input}
            value={payee}
            onChangeText={setPayee}
          />
          <TouchableOpacity onPress={() => { navigation.navigate('ScanReceipt'); }}>
            <Ionicons name="camera-outline" size={22} color="#6c757d" />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.inputRow}>
          <Ionicons name="cash-outline" size={20} color="#6c757d" />
          <TextInput
            placeholder="Amount"
            style={styles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

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
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(e, selectedDate) => {
              setShowDate(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Tags */}
        <View style={styles.pickerContainer}>
          <Ionicons name="pricetag-outline" size={20} color="#6c757d" style={styles.icon} />
          <TextInput
            value={tag}
            style={styles.dropdownContent}
            placeholder="Select a tag"
            editable={false}
          />
          <Picker
            selectedValue={tag}
            onValueChange={(itemValue) => {
              if (itemValue === '__add_new_tag__') {
                navigation.navigate('AddTag'); // Navigate to add tag page
              } else {
                setTag(itemValue);
                const selectedTag = tags.find((d) => d.name === itemValue);
                setEssentialityLabel(selectedTag ? !!selectedTag.essentialityLabel : null);
              }
            }}
            style={styles.picker}
            dropdownIconColor="#2E5E4E"
          >
            <Picker.Item label="" value="" />
            {tags.map((item) => (
              <Picker.Item key={item.id} label={item.name} value={item.name} />
            ))}
            <Picker.Item label="➕ Add new tag" value="__add_new_tag__" />
          </Picker>
        </View>


        {/* Essentiality Switch */}
        {tag && essentialityLabel !== null && (
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

        {/* Event Tag */}
        <View style={styles.pickerContainer}>
          <MaterialIcons name="bookmark-border" size={20} style={styles.icon} color="#6c757d" />
          <TextInput
            value={eventTag}
            style={styles.dropdownContent}
            placeholder="Select an event tag"
            editable={false}
          />
          <Picker
            selectedValue={eventTag}
            onValueChange={(itemValue) => setEventTag(itemValue)}
            style={styles.picker}
            dropdownIconColor="#2E5E4E"
          >
            <Picker.Item label="" value="" />
            {eventTagData.map((item) => (
              <Picker.Item key={item.id} label={item.name} value={item.name} />
            ))}
          </Picker>
        </View>

        {/* Payment Type */}
        <View style={styles.pickerContainer}>
          <FontAwesome6 name="money-bill-transfer" size={14} color="#6c757d" style={styles.icon} />
          <TextInput value={paymentType} style={styles.dropdownContent} editable={false} />
          <Picker
            selectedValue={paymentType}
            onValueChange={(itemValue) => setPaymentType(itemValue)}
            style={styles.picker}
            dropdownIconColor="#2E5E4E"
          >
            <Picker.Item label="" value="" />
            {paymentTypeData.map((item) => (
              <Picker.Item key={item.id} label={item.name} value={item.name} />
            ))}
          </Picker>
        </View>

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

        {isPeriodic && (
          <View style={styles.periodicPicker}>
            <Text style={styles.label}>Select period type:</Text>
            <Picker
              selectedValue={selectedType}
              onValueChange={(itemValue) => setSelectedType(itemValue)}
              style={styles.picker}
              dropdownIconColor="#2E5E4E"
            >
              {periodType.map((type, index) => (
                <Picker.Item key={index} label={type} value={type} />
              ))}
            </Picker>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveButtonText}>Save Expense</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
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
});
