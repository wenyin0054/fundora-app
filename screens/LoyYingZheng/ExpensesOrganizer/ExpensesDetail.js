import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { updateExpenseLocal, deleteExpenseLocal } from "../../../database/SQLite ";
import AppHeader from "../reuseComponet/header";


export default function ExpenseDetail({ route, navigation }) {
  const { expense } = route.params;

  const [payee, setPayee] = useState(expense.payee);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [date, setDate] = useState(expense.date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tag, setTag] = useState(expense.tag);
  const [eventTag, setEventTag] = useState(expense.eventTag);
  const [paymentType, setPaymentType] = useState(expense.paymentType);
  const [typeLabel, setTypeLabel] = useState(expense.typeLabel);
  const [essentialityLabel, setEssentialityLabel] = useState(expense.essentialityLabel);
  const options = ["Expenses", "Income", "Transaction"];
  const [selectedOption, setSelected] = useState(
    expense.typeLabel.charAt(0).toUpperCase() + expense.typeLabel.slice(1)
  );
  // Static data
  const tagData = [
    { id: 1, name: "Food", essentialityLabel: 1 },
    { id: 2, name: "Shopping", essentialityLabel: 0 },
    { id: 3, name: "Transport", essentialityLabel: 1 },
    { id: 4, name: "Entertainment", essentialityLabel: 0 },
  ];

  const eventTagData = [
    { id: "1", name: "Birthday" },
    { id: "2", name: "Travel" },
    { id: "3", name: "Shopping" },
  ];

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

  const onUpdate = async () => {
    if (!payee || !amount || !date) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }
    try {
      await updateExpenseLocal(
        expense.id,
        payee,
        parseFloat(amount),
        date,
        tag,
        eventTag,
        paymentType,
        expense.isPeriodic,
        expense.periodType,
        typeLabel,
        essentialityLabel
      );
      Alert.alert("✅ Success", "Expense updated successfully!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("❌ Error", "Failed to update expense.");
      console.error(error);
    }
  };

  const onDelete = () => {
    Alert.alert("Confirm Delete", "Are you sure to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExpenseLocal(expense.id);
            Alert.alert("🗑️ Deleted", "Expense removed successfully!");
            navigation.goBack();
          } catch (error) {
            Alert.alert("❌ Error", "Failed to delete expense.");
            console.error(error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Expense Detail" 
      showLeftButton={true}
      onLeftPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {/* TypeLabel */}
          <View style={styles.SelectionBarContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  selectedOption === option && styles.selectedButton, // Highlight selected
                ]}
                onPress={() => setSelected(option)}
              >
                <Text
                  style={[
                    styles.text,
                    selectedOption === option && styles.selectedText, // Highlight selected
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payee */}
          <Text style={styles.label}>Payee / Purchase</Text>
          <TextInput
            style={styles.input}
            value={payee}
            onChangeText={setPayee}
            placeholder="Enter Payee"
          />

          {/* Amount */}
          <Text style={styles.label}>Amount (RM)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter Amount"
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#2E5E4E" />
            <Text style={styles.dateText}>{date}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  const formatted = selectedDate.toISOString().split("T")[0];
                  setDate(formatted);
                }
              }}
            />
          )}

          {/* Tag Picker */}
          <Text style={styles.label}>Tag</Text>
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
                setTag(itemValue);
                const selectedTag = tagData.find((d) => d.name === itemValue);
                setEssentialityLabel(selectedTag ? selectedTag.essentialityLabel : null);
              }}
              style={styles.picker}
              dropdownIconColor="#2E5E4E"
            >
              <Picker.Item label="" value="" />
              {tagData.map((item) => (
                <Picker.Item key={item.id} label={item.name} value={item.name} />
              ))}
            </Picker>
          </View>

          {/* Event Tag Picker */}
          <Text style={styles.label}>Event Tag</Text>
          <View style={styles.pickerContainer}>
            <MaterialIcons name="bookmark-border" size={20} color="#6c757d" style={styles.icon} />
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

          {/* Payment Type Picker */}
          <Text style={styles.label}>Payment Type</Text>
          <View style={styles.pickerContainer}>
            <FontAwesome6 name="money-bill-transfer" size={14} color="#6c757d" style={styles.icon} />
            <TextInput
              value={paymentType}
              style={styles.dropdownContent}
              editable={false}
            />
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

          {/* Essentiality Buttons */}
          <Text style={styles.label}>Essentiality</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                essentialityLabel === 1 && styles.optionButtonActive,
              ]}
              onPress={() => setEssentialityLabel(1)}
            >
              <Text
                style={[
                  styles.optionText,
                  essentialityLabel === 1 && styles.optionTextActive,
                ]}
              >
                Essential
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                essentialityLabel === 0 && styles.optionButtonActive,
              ]}
              onPress={() => setEssentialityLabel(0)}
            >
              <Text
                style={[
                  styles.optionText,
                  essentialityLabel === 0 && styles.optionTextActive,
                ]}
              >
                Non-Essential
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={onUpdate}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// 🔧 STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9fb" },
  scroll: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    fontSize: 14,
    color: "#333",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  dateText: { marginLeft: 10, color: "#333" },
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 4,
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
    elevation: 3,
    paddingHorizontal: 10,
    height: 45,
  },
  picker: {
    flex: 1,
    color: "#2E5E4E",
    fontSize: 14,
    backgroundColor: "transparent",
  },
  icon: { marginRight: 8, alignSelf: "center" },
  dropdownContent: {
    position: "absolute",
    left: 30,
    color: "#6c757d",
    zIndex: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  optionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionButtonActive: { backgroundColor: "#8AD0AB" },
  optionText: { color: "#2E5E4E", fontSize: 14 },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  deleteBtn: {
    flexDirection: "row",
    backgroundColor: "#E53935",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#236a3b",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  saveText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  SelectionBarContainer: {
    flexDirection: "row",
    backgroundColor: "#8CCFB1", // green background
    borderRadius: 8,
    padding: 4,
    justifyContent: "space-between",
    marginBottom: 20,

  }, selectedButton: {
    backgroundColor: "#fff",
  },
  selectedText: {
    color: "#2E5E4E",
    fontWeight: "bold",
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
});
