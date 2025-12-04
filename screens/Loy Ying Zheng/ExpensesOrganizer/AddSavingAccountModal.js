import React, { useState } from "react";
import { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { addSavingAccount } from "../../../database/SQLite";
import { useUser } from "../../reuseComponet/UserContext";

export default function AddSavingAccountModal({
  visible,
  onClose,
  methodId,
  methodName,
  onSaved,
  savingMethods,
}) {
  const [institutionName, setInstitutionName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState(methodId);

  const { userId } = useUser();
  useEffect(() => {
    setSelectedMethodId(methodId);
  }, [methodId, visible]);

  const handleSave = async () => {
    if (!selectedMethodId || !institutionName.trim() || !accountName.trim()) {
      Alert.alert("Missing Info", "Please complete all required fields.");
      return;
    }

    try {
      await addSavingAccount(
        userId,
        selectedMethodId,
        institutionName.trim(),
        accountName.trim(),
        parseFloat(balance) || 0,
        parseFloat(interestRate) || 0
      );

      Alert.alert("Success", "Saving account added!");

      onSaved?.();
      onClose();

      // 重置表单
      setInstitutionName("");
      setAccountName("");
      setBalance("");
      setInterestRate("");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add new saving account.");
    }
  };

  const handleClose = () => {
    setInstitutionName("");
    setAccountName("");
    setBalance("");
    setInterestRate("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Saving Account</Text>

            <Text style={styles.modalLabel}>Select Method:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMethodId}
                onValueChange={setSelectedMethodId}
                enabled={!methodId}
              >
                {methodId ? (
                  <Picker.Item label={methodName} value={methodId} />
                ) : (
                  <>
                    <Picker.Item label="Select saving method" value={null} />
                    {savingMethods.map((m) => (
                      <Picker.Item key={m.id} label={m.method_name} value={m.id} />
                    ))}
                  </>
                )}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Institution Name:</Text>
            <TextInput
              style={styles.modalInput}
              value={institutionName}
              onChangeText={setInstitutionName}
              placeholder="e.g. Maybank"
              placeholderTextColor={"#c5c5c5ff"}
              returnKeyType="next"
            />

            <Text style={styles.modalLabel}>Account Name:</Text>
            <TextInput
              style={styles.modalInput}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. Savings Account"
              placeholderTextColor={"#c5c5c5ff"}
              returnKeyType="next"
            />

            <Text style={styles.modalLabel}>Balance (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={"#c5c5c5ff"}
              returnKeyType="next"
            />

            <Text style={styles.modalLabel}>Interest Rate (%):</Text>
            <TextInput
              style={styles.modalInput}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={"#c5c5c5ff"}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={handleClose}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={handleSave}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
  },
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#2E5E4E",
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 10,
    color: "#333",
  },
  modalInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    marginBottom: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancel: {
    backgroundColor: "#ccc"
  },
  modalSave: {
    backgroundColor: "#2E5E4E"
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "600"
  },
});