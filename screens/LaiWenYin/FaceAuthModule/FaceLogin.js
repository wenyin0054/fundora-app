import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkOnboardingStatus, hasRegisteredFace, getUserById } from '../../../database/userAuth';
import { getApiBase } from './apiConfig';

const API_URL = getApiBase();
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FaceLoginScreen({ navigation, route }) {
  const [showCamera, setShowCamera] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [instruction, setInstruction] = useState('Center your face in the frame');
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDetectionWorking, setFaceDetectionWorking] = useState(true);
  const cameraRef = useRef(null);
  const faceDetectionTimeoutRef = useRef(null);
  const detectionProgressRef = useRef(null);
  const noFaceTimeoutRef = useRef(null);
  const faceStableRef = useRef(false);
  const faceAppearTimeRef = useRef(0);
  const { onSuccess, onCancel } = route.params || {};
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");

  // Hide the default navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  useEffect(() => {
    // Check camera permissions
    if (!permission) {
      requestPermission();
    } else if (!permission.granted) {
      Alert.alert(
        "Camera Permission Required",
        "This app needs camera access for face recognition.",
        [{ text: "OK", onPress: () => requestPermission() }]
      );
    }

    // Test face detection after a delay
    const testFaceDetection = setTimeout(() => {
      if (!faceDetected) {
        console.log("⚠️ Face detection might not be working");
        setFaceDetectionWorking(false);
      }
    }, 5000);

    // Clear all timeouts when component unmounts
    return () => {
      clearTimeout(testFaceDetection);
      if (faceDetectionTimeoutRef.current) {
        clearTimeout(faceDetectionTimeoutRef.current);
      }
      if (detectionProgressRef.current) {
        clearInterval(detectionProgressRef.current);
      }
      if (noFaceTimeoutRef.current) {
        clearTimeout(noFaceTimeoutRef.current);
      }
    };
  }, [permission, faceDetected]);

  // Start detection progress animation
  const startDetectionProgress = () => {
    setIsDetecting(true);
    setDetectionProgress(0);

    detectionProgressRef.current = setInterval(() => {
      setDetectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(detectionProgressRef.current);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  // Stop detection progress animation
  const stopDetectionProgress = () => {
    setIsDetecting(false);
    setDetectionProgress(0);
    if (detectionProgressRef.current) {
      clearInterval(detectionProgressRef.current);
    }
  };

  const recognizeFaceWithMTCNN = async (base64Image) => {
    try {
      console.log('🔍 Sending face for recognition...');

      // Clean the base64 string - remove data URL prefix
      let cleanBase64 = base64Image;
      if (base64Image.startsWith('data:image/jpeg;base64,')) {
        cleanBase64 = base64Image.replace('data:image/jpeg;base64,', '');
      }

      console.log('📸 Clean base64 length:', cleanBase64.length);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}/recognize-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: cleanBase64,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Face recognition error:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: 'Server timeout. Please check connection.' };
      }
      return { success: false, error: `Connection error: ${error.message}` };
    }
  };

  const handleFaceRecognized = async (recognitionResult) => {
    try {
      console.log('🎯 Processing recognized user:', recognitionResult.user_id);

      // Get full user data from database
      const userData = await getUserById(recognitionResult.user_id);

      if (!userData) {
        Alert.alert('Error', 'User data not found. Please try email login.');
        setIsProcessing(false);
        setFaceDetected(false);
        return;
      }

      // Store current user in AsyncStorage
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
      }));

      // Store in recent face login users
      await storeRecentUserWithFaceAuth(userData);

      setInstruction(`✅ Welcome ${userData.username}!`);
      setFaceDetected(true);

      // Wait a moment to show success
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onSuccess) {
        onSuccess(userData);
      } else {
        // Navigate based on status
        const done = await checkOnboardingStatus(userData.userId);
        const hasFace = await hasRegisteredFace(userData.userId);

        if (!done) {
          navigation.replace("OnboardingScreen");
        } else if (!hasFace) {
          navigation.replace("FaceRegistration", {
            showSkipOption: true,
            fromLogin: true
          });
        } else {
          navigation.replace("MainApp");
        }
      }
    } catch (error) {
      console.error('Error after face recognition:', error);
      Alert.alert('Error', 'Failed to complete login process');
      setIsProcessing(false);
      setFaceDetected(false);
      setInstruction('Center your face in the frame');
    }
  };

  const storeRecentUserWithFaceAuth = async (user) => {
    try {
      const recentUsers = await AsyncStorage.getItem('recentUsersWithFaceAuth');
      let usersArray = recentUsers ? JSON.parse(recentUsers) : [];

      usersArray = usersArray.filter(u => u.userId !== user.userId);
      usersArray.unshift({
        userId: user.userId,
        username: user.username,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      usersArray = usersArray.slice(0, 5);

      await AsyncStorage.setItem('recentUsersWithFaceAuth', JSON.stringify(usersArray));
    } catch (error) {
      console.error('Error storing recent user:', error);
    }
  };

  const handleFaceDetected = async (base64) => {
    if (isProcessing) return;

    setIsProcessing(true);
    stopDetectionProgress();
    setInstruction('Processing your face...');
    setFaceDetected(true);

    try {
      if (!base64) {
        setInstruction('Error processing image');
        setIsProcessing(false);
        setFaceDetected(false);
        return;
      }

      const result = await recognizeFaceWithMTCNN(base64);

      if (result.success && result.recognized) {
        console.log(`👤 Recognized user: ${result.user_id} with similarity: ${result.similarity}`);
        await handleFaceRecognized(result);
      } else {
        // FACE NOT RECOGNIZED - Show retry modal
        setInstruction('❌ Face not recognized');
        setFaceDetected(false);
        setFailedMessage("Face not recognized. Would you like to retake or enter manually?");
        setShowRetryModal(true);
        setIsProcessing(false);
        setFaceDetected(false);
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      setInstruction('Error recognizing face');
      setFaceDetected(false);
      setIsProcessing(false);
    }
  };

  // Remove user from recent face auth users when face is not recognized
  const removeUserFromFaceAuth = async () => {
    try {
      const recentUsers = await AsyncStorage.getItem('recentUsersWithFaceAuth');
      if (recentUsers) {
        let usersArray = JSON.parse(recentUsers);
        // Keep all users (we don't know which one failed)
        await AsyncStorage.setItem('recentUsersWithFaceAuth', JSON.stringify(usersArray));
      }
    } catch (error) {
      console.error('Error updating face auth users:', error);
    }
  };

  // Face detection handler
  const handleFacesDetected = ({ faces }) => {
    const now = Date.now();

    // Clear any existing no-face timeout
    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
      noFaceTimeoutRef.current = null;
    }

    // NO FACE DETECTED
    if (faces.length === 0) {
      if (faceDetected) {
        setFaceDetected(false);
      }
      faceStableRef.current = false;

      noFaceTimeoutRef.current = setTimeout(() => {
        if (!isProcessing) {
          stopDetectionProgress();
          setInstruction("Center your face in the frame");
        }
      }, 300);
      return;
    }

    const face = faces[0];

    // Basic face validation
    const hasValidFace = face.bounds && face.bounds.size;

    if (!hasValidFace) {
      setFaceDetected(false);
      return;
    }

    // FACE DETECTED - Update UI immediately
    if (!faceDetected && !isProcessing) {
      setFaceDetected(true);
      setInstruction("Face detected – hold still");
      faceAppearTimeRef.current = now;
      console.log("✅ Face detected!");
    }

    // Start capture process after face is stable
    if (!faceStableRef.current && !isProcessing && now - faceAppearTimeRef.current > 800) {
      faceStableRef.current = true;
      console.log("✔ Face confirmed stable");

      // Clear any existing timeout
      if (faceDetectionTimeoutRef.current) {
        clearTimeout(faceDetectionTimeoutRef.current);
      }

      startDetectionProgress();

      faceDetectionTimeoutRef.current = setTimeout(() => {
        takePhotoForRecognition();
      }, 1200);
    }
  };

  const takePhotoForRecognition = async () => {
    if (!cameraRef.current || isProcessing) {
      console.log('⏸️ Camera not ready or already processing');
      return;
    }

    console.log('🎯 Capture triggered');

    // Reset face detection states
    faceStableRef.current = false;
    faceAppearTimeRef.current = 0;

    if (faceDetectionTimeoutRef.current) {
      clearTimeout(faceDetectionTimeoutRef.current);
      faceDetectionTimeoutRef.current = null;
    }

    setIsProcessing(true);
    setInstruction("Capturing your face...");
    setFaceDetected(true);
    stopDetectionProgress();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
        exif: false,
      });

      console.log("📸 Photo captured");
      setInstruction("Processing your face...");
      await handleFaceDetected(photo.base64);

    } catch (error) {
      console.error("Recognition capture error:", error);
      setInstruction("Capture failed. Please try again.");
      setFaceDetected(false);
      stopDetectionProgress();
      setIsProcessing(false);
    }
  };

  const handleBackPress = () => {
    console.log("Close button pressed");

    stopDetectionProgress();
    setFaceDetected(false);
    setIsProcessing(false);
    setShowCamera(false);

    // clear all timeouts
    if (faceDetectionTimeoutRef.current) {
      clearTimeout(faceDetectionTimeoutRef.current);
    }

    if (detectionProgressRef.current) {
      clearInterval(detectionProgressRef.current);
    }

    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
    }

    // go back safely
    if (onCancel) {
      console.log("Calling onCancel");
      onCancel();
    } else {
      console.log("Navigating to LoginScreen");
      navigation.navigate('LoginScreen');
    }
  };

  const handleManualCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    console.log("📸 Manual capture triggered");

    // Reset states for manual capture
    faceStableRef.current = false;
    faceAppearTimeRef.current = 0;

    if (faceDetectionTimeoutRef.current) {
      clearTimeout(faceDetectionTimeoutRef.current);
      faceDetectionTimeoutRef.current = null;
    }

    setIsProcessing(true);
    setInstruction("Processing your face...");
    setFaceDetected(true);
    stopDetectionProgress();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
        exif: false,
      });

      await handleFaceDetected(photo.base64);
    } catch (error) {
      console.error("Manual capture error:", error);
      setInstruction("Capture failed. Please try again.");
      setFaceDetected(false);
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setShowRetryModal(false);
    setInstruction("Please align your face again");
    setFaceDetected(false);
    setIsProcessing(false);
  };

  const handleManualLogin = () => {
    setShowRetryModal(false);
    handleManualCapture();
  };

  const handleBackToLogin = () => {
    setShowRetryModal(false);
    if (onCancel) {
      onCancel();
    } else {
      navigation.navigate('LoginScreen');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required for face login</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* RETAKE / MANUAL CAPTURE MODAL */}
      <Modal
        transparent
        visible={showRetryModal}
        animationType="fade"
        onRequestClose={() => setShowRetryModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Face Detection Failed</Text>
            <Text style={modalStyles.msg}>{failedMessage}</Text>

            <View style={modalStyles.row}>
              <TouchableOpacity
                style={modalStyles.btn}
                onPress={handleRetry}
              >
                <Text style={modalStyles.btnText}>🔄 Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.btn}
                onPress={handleManualLogin}
              >
                <Text style={modalStyles.btnText}>✋ Manual</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={handleBackToLogin}
            >
              <Text style={modalStyles.cancelText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CAMERA VIEW */}
      <Modal 
        visible={showCamera} 
        animationType="slide" 
        statusBarTranslucent={true}
        onRequestClose={handleBackPress}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: "accurate",
              detectLandmarks: "all",
              runClassifications: "all",
              minDetectionInterval: 100,
              tracking: true,
            }}
          >
            <View style={styles.cameraOverlay}>

              {/* HEADER */}
              <View style={styles.cameraHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
                  <Ionicons name="chevron-down" size={28} color="#fff" />
                </TouchableOpacity>

                <View style={styles.progressSection}>
                  <Text style={styles.progressText}>Face Login</Text>
                  {isProcessing && <Text style={styles.progressCount}>Verifying…</Text>}
                </View>
              </View>

              {/* FACE OUTLINE */}
              <View style={styles.faceGuidance}>
                <View style={styles.faceOutline}>
                  <View style={styles.faceGuide} />
                </View>

                <View style={styles.faceStatusIndicator}>
                  <Ionicons
                    name={faceDetected ? "checkmark-circle" : "ellipse-outline"}
                    size={28}
                    color={faceDetected ? "#57C0A1" : "rgba(255,255,255,0.6)"}
                  />
                  <Text style={styles.faceStatusText}>
                    {isProcessing
                      ? "Processing…"
                      : faceDetected
                      ? "Face Detected"
                      : "Align your face"
                    }
                  </Text>
                </View>
              </View>

              {/* BOTTOM PANEL */}
              <View style={styles.instructionPanel}>
                <Text style={styles.instructionTitle}>Instruction</Text>
                <Text style={styles.instructionText}>{instruction}</Text>

                {isProcessing ? (
                  <View style={styles.processingState}>
                    <ActivityIndicator size="large" color="#57C0A1" />
                    <Text style={styles.processingText}>Verifying your identity…</Text>
                  </View>
                ) : (
                  <View style={styles.captureSection}>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={handleManualCapture}
                    >
                      <View style={styles.captureButtonOuter}>
                        <View style={styles.captureButtonInner} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.helperText}>
                  {isDetecting ? "Scanning your face…" : "Position your face inside the circle"}
                </Text>
              </View>

            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#57C0A1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 60,
  },
  closeButton: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginRight: 16,
  },
  progressSection: {
    flex: 1,
  },
  progressText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  progressCount: {
    color: '#57C0A1',
    fontSize: 14,
    marginTop: 4,
  },
  faceGuidance: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOutline: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderColor: 'rgba(87, 192, 161, 0.3)',
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(87, 192, 161, 0.5)',
    borderRadius: 100,
    borderStyle: 'dashed',
  },
  faceStatusIndicator: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  faceStatusText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 6,
    fontWeight: '500',
  },
  instructionPanel: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  instructionTitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  processingState: {
    alignItems: 'center',
    marginBottom: 16,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  captureSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButton: {
    // Container for the capture button
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  helperText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    color: "#000",
  },
  msg: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  btn: {
    backgroundColor: "#57C0A1",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    marginTop: 10,
  },
  cancelText: {
    color: "#333",
    fontSize: 15,
  },
});