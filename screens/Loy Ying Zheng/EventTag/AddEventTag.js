// import React, { useState, useEffect, useRef } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   TextInput,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import AppHeader from "../../reuseComponet/header";
// import {
//   addEventTagLocal,
//   getEventTagsLocal,
//   initDB,
//   createEventTagTable,
// } from "../../../database/SQLite";
// import { useUser } from "../../reuseComponet/UserContext";
// import {
//   FDSCard,
//   FDSValidatedInput,
//   FDSButton,
//   FDSLabel,
//   FDSColors
// } from "../../reuseComponet/DesignSystem";

// export default function AddEventTag({ navigation }) {
//   const [tagName, setTagName] = useState("");
//   const [description, setDescription] = useState("");
//   const [existingTags, setExistingTags] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   const tagNameRef = useRef(null);

//   const { userId, isLoading: userLoading } = useUser();

//   // ------------------------------------------------------
//   // Load existing tags for duplicate validation
//   // ------------------------------------------------------
//   useEffect(() => {
//     if (userId) fetchEventTags();
//   }, [userId]);

//   const fetchEventTags = async () => {
//     try {
//       setIsLoading(true);

//       await initDB();
//       await createEventTagTable();

//       const tags = await getEventTagsLocal(userId);
//       setExistingTags(tags.map((t) => t.name.toLowerCase()));

//     } catch (error) {
//       console.error("❌ Error fetching event tags:", error);
//       Alert.alert("Error", "Failed to load existing event tags");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ------------------------------------------------------
//   // Handle Save
//   // ------------------------------------------------------
//   const handleAddEventTag = async () => {
//     // 1️⃣ Local validation
//     const validTag = tagNameRef.current?.validate();
//     if (!validTag) return;

//     if (!userId) {
//       return Alert.alert("Error", "User not logged in");
//     }

//     // 2️⃣ Duplicate check
//     const duplicate = existingTags.includes(tagName.trim().toLowerCase());
//     if (duplicate) {
//       tagNameRef.current?.shake();
//       tagNameRef.current?.setError(true);

//       return Alert.alert(
//         "Tag Exists",
//         `The event tag "${tagName}" already exists.\nWould you like to manage it instead?`,
//         [
//           { text: "No", style: "cancel" },
//           { text: "Yes", onPress: () => navigation.navigate("EventTagList") },
//         ]
//       );
//     }

//     // 3️⃣ Save
//     try {
//       setIsLoading(true);

//       await addEventTagLocal(userId, tagName.trim(), description.trim());

//       Alert.alert("Success", "Event tag added successfully!");
//       navigation.goBack();

//     } catch (error) {
//       console.error("❌ AddEventTag error:", error);
//       Alert.alert("Error", "Failed to add event tag. Try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ------------------------------------------------------
//   // User Loading State
//   // ------------------------------------------------------
//   if (userLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#8AD0AB" />
//         <Text>Loading user data...</Text>
//       </View>
//     );
//   }

//   if (!userId) {
//     return (
//       <View style={styles.container}>
//         <AppHeader
//           title="Add Event Tag"
//           showLeftButton={true}
//           onLeftPress={() => navigation.goBack()}
//         />
//         <View style={styles.errorContainer}>
//           <Ionicons name="person-circle-outline" size={64} color="#6B7280" />
//           <Text style={styles.errorTitle}>Please Log In</Text>
//           <Text style={styles.errorMessage}>
//             You need to be logged in to add event tags
//           </Text>
//         </View>
//       </View>
//     );
//   }

//   // ------------------------------------------------------
//   // Main UI
//   // ------------------------------------------------------
//   return (
//     <View style={styles.container}>
//       <AppHeader
//         title="Add Event Tag"
//         showLeftButton={true}
//         onLeftPress={() => navigation.goBack()}
//       />

//       <FDSCard>

//         {/* Event Tag Name */}
//         <FDSValidatedInput
//           ref={tagNameRef}
//           label="Event Tag Name"
//           value={tagName}
//           onChangeText={setTagName}
//           placeholder="e.g. Birthday, Trip"
//           validate={(v) => v && v.trim().length > 0}
//           errorMessage="Tag name cannot be empty"
//           icon={<Ionicons name="pricetag-outline" size={18} color={FDSColors.textGray} />}
//         />

//         {/* Description */}
//         <Text style={styles.label}>Description (optional)</Text>
//         <TextInput
//           style={[styles.textArea]}
//           placeholder="Enter a short description..."
//           placeholderTextColor={"#c5c5c5ff"}
//           value={description}
//           onChangeText={setDescription}
//           multiline
//           maxLength={200}
//         />

//         {/* Save Button */}
//         <FDSButton
//           title="Save Tag"
//           icon="save-outline"
//           loading={isLoading}
//           disabled={!tagName.trim()}
//           onPress={handleAddEventTag}
//         />

//       </FDSCard>
//     </View>
//   );
// }

// // ------------------------------------------------------
// // Styles
// // ------------------------------------------------------
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f9f9fb"
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f9f9fb",
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   errorTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1E293B",
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   errorMessage: {
//     fontSize: 16,
//     color: "#64748B",
//     textAlign: "center",
//   },
//   card: {
//     backgroundColor: "#fff",
//     margin: 16,
//     padding: 16,
//     borderRadius: 12,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: "600",
//     marginTop: 12,
//     color: "#333",
//   },
//   textArea: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: "#e5e7eb",
//     textAlignVertical: "top",
//     height: 90,
//     marginTop: 6,
//   },
//   saveBtn: {
//     flexDirection: "row",
//     backgroundColor: "#8AD0AB",
//     padding: 12,
//     borderRadius: 10,
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 20,
//     elevation: 3,
//   },
//   saveBtnDisabled: {
//     backgroundColor: "#cccccc",
//     opacity: 0.6,
//   },
//   saveText: {
//     color: "#fff",
//     fontWeight: "600",
//     marginLeft: 6,
//     fontSize: 15,
//   },
// });
