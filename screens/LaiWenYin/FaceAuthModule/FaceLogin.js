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

const API_URL = 'http://192.168.1.33:5000/';
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
          navigation.replace("MainTabs");
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
        // FACE NOT RECOGNIZED - Show alert and navigate back
        setInstruction('❌ Face not recognized');
        setFaceDetected(false);
        
        Alert.alert(
          'Face Not Recognized',
          'The face does not match any registered user. Please login manually.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Remove this user from recent face auth users
                removeUserFromFaceAuth();
                // Navigate back to login
                if (onCancel) {
                  onCancel();
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
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
      <Modal visible={showCamera} animationType="slide" statusBarTranslucent={true}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
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
              <View style={styles.cameraHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    if (faceDetectionTimeoutRef.current) {
                      clearTimeout(faceDetectionTimeoutRef.current);
                    }
                    if (detectionProgressRef.current) {
                      clearInterval(detectionProgressRef.current);
                    }
                    if (noFaceTimeoutRef.current) {
                      clearTimeout(noFaceTimeoutRef.current);
                    }
                    if (onCancel) {
                      onCancel();
                    } else {
                      navigation.goBack();
                    }
                  }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                
                <Text style={styles.title}>Face Login</Text>
                <View style={styles.placeholder} />
              </View>

              <View style={styles.instructionContainer}>
                {/* Face Detection Frame with Visual Feedback */}
                <View style={[
                  styles.faceFrame,
                  (faceDetected || isProcessing) && styles.faceFrameDetected
                ]}>
                  <View style={styles.frameCorners}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                  </View>
                  
                  {/* Face Detection Status */}
                  <View style={styles.faceStatus}>
                    <View style={[
                      styles.faceStatusDot,
                      { backgroundColor: (faceDetected || isProcessing) ? '#57C0A1' : '#ff6b6b' }
                    ]} />
                    <Text style={styles.faceStatusText}>
                      {isProcessing ? 'Processing...' : 
                       faceDetected ? 'Face Detected' : 'No Face Detected'}
                    </Text>
                  </View>
                  
                  {/* Detection Progress */}
                  {isDetecting && (
                    <View style={styles.detectionProgressContainer}>
                      <View style={styles.detectionProgressBar}>
                        <View 
                          style={[
                            styles.detectionProgressFill, 
                            { width: `${detectionProgress}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.detectionProgressText}>
                        {detectionProgress < 100 ? 'Capturing...' : 'Processing...'}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.instructionText}>{instruction}</Text>
                
                {/* Processing Loader */}
                {isProcessing && (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color="#57C0A1" />
                    <Text style={styles.processingText}>Verifying your identity...</Text>
                    <Text style={styles.processingSubtext}>
                      Comparing with registered faces
                    </Text>
                  </View>
                )}

                {/* Manual Capture Button */}
                {!isProcessing && !isDetecting && (
                  <TouchableOpacity 
                    style={styles.manualCaptureButton}
                    onPress={handleManualCapture}
                  >
                    <Text style={styles.manualCaptureText}>
                      Tap to Capture Manually
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Debug Info */}
                <View style={styles.debugContainer}>
                  <Text style={styles.debugText}>
                    💡 Make sure your face is well-lit and clearly visible
                  </Text>
                  <Text style={styles.debugText}>
                    📍 Position your face within the frame
                  </Text>
                  {!faceDetectionWorking && (
                    <Text style={styles.debugWarning}>
                      ⚠️ Face detection limited - use manual capture
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {faceDetected || isProcessing ? 'Processing your face...' : 'Position your face in the frame'}
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
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 36,
  },
  instructionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  faceFrame: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  faceFrameDetected: {
    borderColor: '#57C0A1',
    backgroundColor: 'rgba(87, 192, 161, 0.1)',
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#57C0A1',
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  faceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  faceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  faceStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  detectionProgressContainer: {
    position: 'absolute',
    bottom: -50,
    alignItems: 'center',
    width: '100%',
  },
  detectionProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  detectionProgressFill: {
    height: '100%',
    backgroundColor: '#57C0A1',
    borderRadius: 3,
  },
  detectionProgressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  processingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  processingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  manualCaptureButton: {
    backgroundColor: 'rgba(87, 192, 161, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#57C0A1',
  },
  manualCaptureText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  debugWarning: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
});