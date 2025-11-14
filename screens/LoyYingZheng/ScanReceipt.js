import React from "react";
import * as ImagePicker from "expo-image-picker";

import {
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ReceiptScannerScreen({ navigation }) {
// Capture photo using camera
const handleCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Denied", "Camera access is required to take photos.");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    console.log("📸 Photo taken:", result.assets[0].uri);
    setSelectedImage(result.assets[0].uri); // optional preview
  }
};

// Pick photo from gallery
const handleGallery = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Denied", "Gallery access is required to upload photos.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    console.log("🖼️ Gallery photo:", result.assets[0].uri);
    setSelectedImage(result.assets[0].uri);
  }
};
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Receipt Scanner</Text>

      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/2922/2922510.png",
          }}
          style={styles.image}
        />
        <Text style={styles.subText}>
          Effortlessly digitize your receipts with a quick scan.
        </Text>
      </View>

      {/* How to Scan Section */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>How to Scan Your Receipt</Text>

        <View style={styles.stepRow}>
          <Ionicons name="scan-outline" size={20} color="#4CAF50" />
          <Text style={styles.stepText}>
            Position your receipt on a flat, well-lit surface.
          </Text>
        </View>

        <View style={styles.stepRow}>
          <Ionicons name="camera-outline" size={20} color="#4CAF50" />
          <Text style={styles.stepText}>
            Use “Capture with Camera” for a new photo or “Upload from Gallery”
            for an existing one.
          </Text>
        </View>

        <View style={styles.stepRow}>
          <Ionicons name="create-outline" size={20} color="#4CAF50" />
          <Text style={styles.stepText}>
            Review the extracted details and make any necessary edits.
          </Text>
        </View>

        <View style={styles.stepRow}>
          <Ionicons name="checkmark-done-outline" size={20} color="#4CAF50" />
          <Text style={styles.stepText}>
            Confirm and save to categorize your expense.
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.cameraButton} onPress={handleCamera}>
        <Ionicons name="camera-outline" size={20} color="#4CAF50" />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.buttonTitle}>Capture with Camera</Text>
          <Text style={styles.buttonSub}>Take a new photo of your receipt</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.galleryButton} onPress={handleGallery}>
        <Ionicons name="images-outline" size={20} color="#4CAF50" />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.buttonTitle}>Upload from Gallery</Text>
          <Text style={styles.buttonSub}>
            Select an existing image from your device
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 15,
    color: "#2e2e2e",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  image: {
    width: 160,
    height: 160,
    resizeMode: "contain",
    borderRadius: 12,
  },
  subText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
  },
  stepText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#444",
    flex: 1,
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9f8ef",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e9f8ef",
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
  },
  buttonTitle: {
    color: "#2e7d32",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonSub: {
    color: "#4e4e4e",
    fontSize: 13,
  },
});
