import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Calendar } from "react-native-calendars";
import {
  getEventTagsLocal,
  deleteActiveEventTagLocal,
  getActiveEventTagsLocal,
  addActiveEventTagLocal,
  clearAllExpensesLocal,
  clearAllActiveEventTagsLocal,
  resetUserSummary,
  deleteAllGoals,
  resetIncomeSnapshots
} from "../../database/SQLite";
import { Picker } from "@react-native-picker/picker";
import { DeviceEventEmitter } from "react-native";
import { useUser } from "../reuseComponet/UserContext";
import AppHeader from "../reuseComponet/header";

export default function CustomDrawerContent(props) {
  const [eventTagEnabled, setEventTagEnabled] = useState(false);
  const [eventTags, setEventTags] = useState([]);
  const [selectedEventTag, setSelectedEventTag] = useState(null);

  const [range, setRange] = useState({ startDate: null, endDate: null });
  const [duration, setDuration] = useState(null);
  const [remainingDays, setRemainingDays] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeEventTags, setActiveEventTags] = useState([]);

  const { userId } = useUser();

  const toggleEventTag = async (val) => {
    setEventTagEnabled(val);

    if (!val) {
      // Switch turned OFF → clear all active tags
      try {
        await clearAllActiveEventTagsLocal(userId);
        setActiveEventTags([]); // Also clear state
        resetAll();
        console.log("🗑️ All active event tags cleared");
      } catch (err) {
        console.error("❌ Failed to clear active event tags:", err);
      }
    }
  };



  const cleanupExpiredEvents = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const active = await getActiveEventTagsLocal(userId);

    const expired = active.filter(tag => tag.endDate && tag.endDate < todayStr);
    for (const tag of expired) {
      await deleteActiveEventTagLocal(tag.id);
    }

    const updated = await getActiveEventTagsLocal(userId);
    setActiveEventTags(updated);
  };

  const resetAll = async () => {
    setSelectedEventTag(null);
    setRange({ startDate: null, endDate: null });
    setDuration(null);
    setRemainingDays(null);
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadEventTags = async () => {
        try {
          const loadedEventTags = await getEventTagsLocal(userId);
          setEventTags(loadedEventTags);
          console.log("✅ Event tags reloaded:", loadedEventTags.length);
        } catch (error) {
          console.error("❌ Error loading event tags:", error);
        }
      };

      loadEventTags();
    }, [])
  );

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getEventTagsLocal(userId);
        const active = await getActiveEventTagsLocal(userId);

        setEventTags(tags);
        setActiveEventTags(active);
        cleanupExpiredEvents();

        // ✅ Set eventTagEnabled based on whether there are active tags
        setEventTagEnabled(active.length > 0);

        console.log("🔄 Drawer refreshed: event + active tags updated");
      } catch (error) {
        console.error("❌ Failed to load tags:", error);
      }
    };

    loadTags();
    const unsubscribeDrawer = props.navigation.addListener("drawerOpen", loadTags);
    const listener = DeviceEventEmitter.addListener("eventTagsUpdated", loadTags);

    return () => {
      unsubscribeDrawer();
      listener.remove();
    };
  }, [props.navigation]);


  // ➕ Save active event tag
  const saveActiveEventTag = async () => {
    if (!selectedEventTag || !range.startDate || !range.endDate) {
      Alert.alert("Incomplete", "Please select an event tag and date range.");
      return;
    }
    try {
      const tag = eventTags.find((t) => t.name === selectedEventTag);
      await addActiveEventTagLocal(userId, tag.id, range.startDate, range.endDate);
      const updated = await getActiveEventTagsLocal(userId);
      setActiveEventTags(updated);
      Alert.alert("✅ Added", `Event tag "${selectedEventTag}" is now active.`);
      resetAll();
    } catch (err) {
      console.error("❌ saveActiveEventTag error:", err);
    }
  };

  // ❌ Remove one active tag
  const removeActiveTag = async (id) => {
    await deleteActiveEventTagLocal(id);
    const updated = await getActiveEventTagsLocal(userId);
    setActiveEventTags(updated);
  };

  // 📆 Handle date select (hotel-style)
  const onDayPress = (day) => {
    if (!range.startDate || (range.startDate && range.endDate)) {
      setRange({ startDate: day.dateString, endDate: null });
    } else {
      const start = new Date(range.startDate);
      const end = new Date(day.dateString);
      if (end <= start) {
        Alert.alert("Invalid", "End date must be after start date.");
        return;
      }
      setRange({ ...range, endDate: day.dateString });
      setShowCalendar(false);
    }
  };

  const clearAllExpenses = async () => {
    Alert.alert(
      "Confirm",
      "Are you sure you want to clear all expenses history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, clear all",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllExpensesLocal(userId);
              Alert.alert("✅ Success", "All expenses history has been cleared.");
              // If you have a state that tracks expenses elsewhere, refresh it
              DeviceEventEmitter.emit("expensesUpdated"); // optional, to trigger updates
            } catch (err) {
              console.error("❌ clearAllExpenses error:", err);
              Alert.alert("Error", "Failed to clear expenses history.");
            }
          },
        },
      ]
    );
  };

  const resetGoalsHandler = async () => {
    Alert.alert(
      "Confirm",
      "Are you sure you want to delete all goals?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete all",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllGoals();
              Alert.alert("✅ Success", "All goals have been deleted.");
              console.log("🗑 All goals deleted successfully");
            } catch (err) {
              console.error("❌ deleteAllGoals error:", err);
              Alert.alert("Error", "Failed to delete goals.");
            }
          },
        },
      ]
    );
  };


  const resetUserSummaryHandler = async () => {
    Alert.alert(
      "Confirm",
      "Are you sure you want to reset your income, expenses, and balance summary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, reset it",
          style: "destructive",
          onPress: async () => {
            try {
              await resetUserSummary(userId);

              // ⭐ 同时清空所有 snapshot（防止 dashboard 继续显示旧 growth）
              await resetIncomeSnapshots(userId);

              Alert.alert("✅ Success", "User summary and snapshots have been reset to 0.");
              console.log("🧾 User summary & snapshots reset successfully");
            } catch (err) {
              console.error("❌ resetUserSummary error:", err);
              Alert.alert("Error", "Failed to reset user summary.");
            }
          },
        },
      ]
    );
  };


  const getMarkedDates = () => {
    const marks = {};
    if (range.startDate)
      marks[range.startDate] = { startingDay: true, color: "#8AD0AB", textColor: "#fff" };
    if (range.endDate)
      marks[range.endDate] = { endingDay: true, color: "#8AD0AB", textColor: "#fff" };

    if (range.startDate && range.endDate) {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split("T")[0];
        if (key !== range.startDate && key !== range.endDate)
          marks[key] = { color: "#C9EBD8", textColor: "#2E5E4E" };
      }
    }
    return marks;
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      <DrawerItemList {...props} />
      <View style={styles.eventTagContainer}>
        <Text style={styles.eventTagTitle}>Event Tag Mode</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{eventTagEnabled ? "ON" : "OFF"}</Text>
          <Switch
            value={eventTagEnabled}
            onValueChange={toggleEventTag}
            thumbColor={eventTagEnabled ? "#2E5E4E" : "#ccc"}
            trackColor={{ false: "#ccc", true: "#8AD0AB" }}
          />
        </View>

        {eventTagEnabled && (
          <>
            {/* 🔸 Tag picker & date selection */}
            <View style={{ marginTop: 10 }}>
              {/* 🔸 Event Tag picker */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.dropdownLabel}>Select Event Tag:</Text>
                <View style={styles.dropdownWrapper}>
                  <Picker
                    selectedValue={selectedEventTag}
                    onValueChange={(itemValue) => {
                      if (itemValue === '__add_new_event_tag__') {
                        props.navigation.navigate('AddEventTag');
                      } else {
                        setSelectedEventTag(itemValue);
                      }
                    }}
                  >
                    <Picker.Item label="-- Choose Event Tag --" value={null} />
                    {eventTags.map((tag) => (
                      <Picker.Item key={tag.id} label={tag.name} value={tag.name} />
                    ))}

                    {/* 添加新事件標籤的選項 */}
                    <Picker.Item label="➕ Add new event tag" value="__add_new_event_tag__" />
                  </Picker>
                </View>
              </View>

              {selectedEventTag && (
                <>
                  <TouchableOpacity
                    style={styles.dateSelectBtn}
                    onPress={() => setShowCalendar(true)}
                  >
                    <Text style={styles.dateSelectText}>
                      {range.startDate && range.endDate
                        ? `${range.startDate} → ${range.endDate}`
                        : "Select Start & End Date"}
                    </Text>
                  </TouchableOpacity>

                  {range.startDate && range.endDate && (
                    <TouchableOpacity
                      style={[styles.dateSelectBtn, { backgroundColor: "#2E5E4E" }]}
                      onPress={saveActiveEventTag}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Save Active Tag
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* 🔸 Active tags list */}
            {activeEventTags.length > 0 && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.eventTagTitle}>Active Events</Text>
                {activeEventTags.map((tag) => {
                  const start = new Date(tag.startDate);
                  const end = new Date(tag.endDate);
                  const today = new Date();

                  const total = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                  const diffToStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
                  const remaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

                  let progress = 0;
                  let statusText = "";

                  if (today < start) {
                    progress = 0;
                    statusText = `Starts in ${Math.max(1, diffToStart)} days`;
                  } else if (today >= start && today <= end) {
                    progress = Math.min(100, ((total - remaining) / total) * 100);
                    statusText = `${remaining} days remaining of ${total} days`;
                  } else {
                    progress = 100;
                    statusText = "Event ended";
                  }

                  return (
                    <View key={tag.id} style={styles.activeTagCard}>
                      <View style={styles.tagHeader}>
                        <Text style={styles.tagTitle}>🎉 {tag.name}</Text>
                        <TouchableOpacity onPress={() => removeActiveTag(tag.id)}>
                          <Text style={{ color: "#d9534f", fontSize: 13 }}>🗑️ Remove</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.tagDate}>
                        {tag.startDate} → {tag.endDate}
                      </Text>

                      <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${progress}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressLabel}>{statusText}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

          </>
        )}

        {/* 📅 Modal Calendar */}
        <Modal visible={showCalendar} animationType="slide">
          <AppHeader
            title="Calendar"
            showLeftButton={true}
            onLeftPress={() => setShowCalendar(false)}
            showBell={false}
            showProfile={false}
          />
          <View style={{ flex: 1 }}>
            <Calendar
              markingType="period"
              markedDates={getMarkedDates()}
              onDayPress={onDayPress}
              minDate={new Date().toISOString().split("T")[0]} // disable past
            />
            <TouchableOpacity
              onPress={() => setShowCalendar(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <TouchableOpacity
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#d9534f",
            alignItems: "center",
          }}
          onPress={clearAllExpenses}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Clear All Expenses History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#d9534f",
            alignItems: "center",
          }}
          onPress={resetUserSummaryHandler}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Reset User Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#d9534f",
            alignItems: "center",
          }}
          onPress={resetGoalsHandler}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Reset User Goal</Text>
        </TouchableOpacity>

      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, paddingBottom: 20 },
  eventTagContainer: {
    borderTopWidth: 1,
    borderTopColor: "#d6e8de",
    marginTop: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  eventTagTitle: { fontWeight: "600", color: "#2E5E4E", fontSize: 15, marginBottom: 5 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: "#555", fontSize: 14 },
  dropdownLabel: { fontSize: 13, color: "#555", marginBottom: 4 },
  dropdownWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#8AD0AB",
    borderRadius: 8,
  },
  dateSelectBtn: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dateSelectText: { color: "#2E5E4E", fontWeight: "600" },
  closeBtn: {
    backgroundColor: "#8AD0AB",
    padding: 14,
    margin: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "700" },
  activeTagCard: {
    backgroundColor: "#EAF8F0",
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#8AD0AB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  tagHeader: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E5E4E",
  },
  tagDate: {
    fontSize: 13,
    color: "#4F7C63",
    marginTop: 2,
  },
  progressSection: {
    marginTop: 5,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#D8EDE0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#4CAF50",
    borderRadius: 5,
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#2E5E4E",
    textAlign: "center",
    fontWeight: "500",
  },

});
