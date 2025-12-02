import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../../reuseComponet/header";
import { processReceipt } from "../localOCR/processReceipt";


export default function ScanReceiptScreen({ route, navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [imageInfo, setImageInfo] = useState(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const [cameraStatus, galleryStatus] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        ImagePicker.requestMediaLibraryPermissionsAsync()
      ]);

      if (cameraStatus.status !== 'granted' || galleryStatus.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and gallery access are needed to scan receipts.'
        );
      }
    } catch (error) {
      console.error("Permission error:", error);
    }
  };

  const handleImageSelection = async (source) => {
    try {
      setProgress(source === 'camera' ? 'Opening camera...' : 'Opening gallery...');

      const options = {
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        exif: false
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        setSelectedImage(image.uri);
        setImageInfo({
          width: image.width,
          height: image.height,
          fileSize: image.fileSize,
          uri: image.uri
        });
        setProgress('');

        console.log(`Image selected: ${image.width}x${image.height}, ${image.fileSize} bytes`);

      } else {
        setProgress('');
      }
    } catch (error) {
      console.error(`${source} error:`, error);
      setProgress('');
      Alert.alert(
        "Error",
        `Failed to ${source === 'camera' ? 'take photo' : 'select image'}. Please try again.`
      );
    }
  };


  const processReceiptImage = async () => {

    try {
      setLoading(true);
      setProgress('Processing receipt...');

      console.log("🔄 Starting enhanced receipt processing...", {
        imageUri: selectedImage,
        imageInfo
      });

      const result = await processReceipt(selectedImage);


      console.log("✅ Enhanced processing completed:", {
        success: result.success,
        confidence: result.confidence,
        quality_score: result.quality_score,
        confidence_level: result.confidence_level,
        merchant: result.merchant_name,
        total: result.total_amount,
        source: result.source
      });

      if (result.success) {
        const scannedData = {
          success: true,
          text: result.raw_text,
          merchant_name: result.merchant_name,
          total_amount: result.total_amount,
          transaction_date: result.transaction_date,
          transaction_time: result.transaction_time,
          line_items: result.line_items,
          confidence: result.confidence, // 現在是 0-100 範圍
          provider: result.source,
          local_confidence: result.local_confidence,
          ocr_quality: result.ocr_quality,
          hasCurrency: result.hasCurrency,
          hasDate: result.hasDate,
          blockCount: result.blockCount,
          wordCount: result.wordCount, // 新增字段
          _normalized_text: result._normalized_text,

          // ✅ 新增的增強字段
          quality_score: result.quality_score,
          confidence_level: result.confidence_level,
          is_receipt_like: result.is_receipt_like,
          validation_message: result.validation_message
        };

        // 根據質量評分提供反饋
        if (result.quality_score < 60) {
          Alert.alert(
            "Moderate Quality Scan",
            "The receipt was scanned with moderate quality. Please verify the extracted information.",
            [{ text: "OK" }]
          );
        }

        // 導航到 AddExpense 並傳遞數據
        navigation.navigate("AddExpense", { scannedData });

      } else {
        // ✅ 使用增強版的錯誤處理
        const confidence = result.confidence || 0;
        const qualityScore = result.quality_score || 0;

        let message = result.validation_message || "We couldn't read the receipt clearly. ";

        if (qualityScore < 30) {
          message += "The image quality is very low. Please try again with a clearer photo and better lighting.";
        } else if (confidence < 30) {
          message += "Low confidence in text recognition. Please ensure the receipt text is clear and visible.";
        } else if (!result.hasCurrency) {
          message += "No currency amounts were detected. Please ensure the receipt totals are clearly visible.";
        } else if (!result.is_receipt_like) {
          message += "The content doesn't appear to be a receipt. Please make sure you're scanning a valid receipt.";
        } else {
          message += "Please try again with better lighting and focus.";
        }

        Alert.alert("Scanning Failed", message);
      }

    } catch (error) {
      console.error("❌ Enhanced receipt processing error:", error);

      // ✅ 使用增強版的錯誤消息
      let errorMessage = error.userMessage || "Failed to process receipt. Please try again.";

      if (error.message?.includes('permission')) {
        errorMessage = "Camera permission required. Please enable camera access in settings.";
      } else if (error.message?.includes('storage')) {
        errorMessage = "Storage access required. Please enable gallery access in settings.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error occurred. Please check your connection.";
      } else if (error.message?.includes('OCR')) {
        errorMessage = "Text recognition failed. Please try with a clearer image.";
      }

      Alert.alert("Processing Error", errorMessage);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const renderImageInfo = () => {
    if (!imageInfo) return null;

    return (
      <View style={styles.imageInfoContainer}>
        <Text style={styles.imageInfoText}>
          Size: {imageInfo.width}x{imageInfo.height}
          {imageInfo.fileSize && ` • ${Math.round(imageInfo.fileSize / 1024)}KB`}
        </Text>
      </View>
    );
  };

  const renderQualityTips = () => {
    if (!selectedImage) return null;

    return (
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>📋 Ready to Scan</Text>
        <Text style={styles.tipsText}>• Make sure all text is clear and readable</Text>
        <Text style={styles.tipsText}>• Check that the total amount is visible</Text>
        <Text style={styles.tipsText}>• Verify the merchant name is legible</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title="Scan Receipt"
        showLeftButton
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container}>
        {/* Progress Indicator */}
        {progress ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        ) : null}

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: selectedImage
                ? selectedImage
                : "https://cdn-icons-png.flaticon.com/512/2922/2922510.png",
            }}
            style={styles.image}
          />
          {renderImageInfo()}
          <Text style={styles.subText}>
            {selectedImage
              ? "Ready to process"
              : "Take a photo or select a receipt from gallery"
            }
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.buttonDisabled]}
            onPress={() => handleImageSelection('camera')}
            disabled={loading}
          >
            <Ionicons name="camera-outline" size={22} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.buttonDisabled]}
            onPress={() => handleImageSelection('gallery')}
            disabled={loading}
          >
            <Ionicons name="images-outline" size={22} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Process Button */}
        {selectedImage && (
          <TouchableOpacity
            style={[styles.processButton, loading && styles.buttonDisabled]}
            onPress={processReceiptImage}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.processButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.processButtonText}>Scan Receipt</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Dynamic Tips */}
        {!selectedImage ? (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips for Better Scanning</Text>
            <Text style={styles.tipsText}>• Ensure good lighting</Text>
            <Text style={styles.tipsText}>• Place receipt on flat surface</Text>
            <Text style={styles.tipsText}>• Avoid shadows and glare</Text>
            <Text style={styles.tipsText}>• Capture the entire receipt</Text>
          </View>
        ) : (
          renderQualityTips()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  progressText: {
    color: '#0369a1',
    fontSize: 14,
    marginLeft: 8,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 20
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: '#f8f9fa'
  },
  imageInfoContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  imageInfoText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9f8ef",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  actionButtonText: {
    color: "#2e7d32",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  processButton: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tipsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#0369a1',
    marginBottom: 4,
  },
});