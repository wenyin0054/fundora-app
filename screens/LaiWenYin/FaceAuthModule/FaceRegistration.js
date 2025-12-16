import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet, Modal,
  Alert, ActivityIndicator, Animated, Easing, Linking, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storeFaceData,
  hasRegisteredFace,
  deleteUserFaceData,
  getUserFaceData,
  getUserById
} from '../../../database/userAuth';
import { getApiBase } from './apiConfig';

const API_URL = getApiBase();
console.log("🔗 Using API URL:", API_URL);

export default function FaceRegistrations({ navigation, route }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [instruction, setInstruction] = useState('Look straight');
  const [step, setStep] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [userHasRegisteredFace, setUserHasRegisteredFace] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const cameraRef = useRef(null);
  const faceDetectionTimeoutRef = useRef(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  const { showSkipOption = false, fromLogin = false, fromProfile = false } = route.params || {};

  const instructions = [
    'Look straight ahead',
    'Turn head slightly left',
    'Turn head slightly right',
    'Registration Complete!'
  ];

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Pulse animation for camera button
  useEffect(() => {
    if (showCamera && !isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showCamera, isProcessing]);

  // Load logged-in user info when screen opens
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const currentUserData = await AsyncStorage.getItem('currentUser');
        if (currentUserData) {
          const parsed = JSON.parse(currentUserData);
          setLoggedInUserId(parsed.userId);
          const hasFace = await hasRegisteredFace(parsed.userId);
          setUserHasRegisteredFace(hasFace);

          if (hasFace && fromLogin) {
            navigation.replace("QuizIntroductionScreen", { userId: parsed.userId, forceShow: true });
          }
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, [fromLogin, navigation]);

  // Cleanup timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (faceDetectionTimeoutRef.current) {
        clearTimeout(faceDetectionTimeoutRef.current);
      }
    };
  }, []);


  // Helper function for post-registration navigation
  const handlePostRegistrationNavigation = async () => {
    if (fromProfile) {
      navigation.goBack();
    } else {
      navigation.replace("QuizIntroductionScreen", { userId: loggedInUserId, forceShow: true });
    }
  };


  // Convert image to base64
  const convertImageToBase64 = async (photo) => {
    try {
      // Directly use base64 provided by camera
      if (photo.base64) return photo.base64;

      // If no base64, fallback to FileSystem
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;

    } catch (error) {
      console.error("Base64 conversion error:", error);
      return null;
    }
  };


  // Register face with MTCNN server
  const registerFaceWithMTCNN = async (base64Image, poseType) => {
    try {
      const response = await fetch(`${API_URL}/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: loggedInUserId,
          image: base64Image,
          poseType: poseType,
        }),
      });

      const result = await response.json();
      console.log("POST URL:", `${API_URL}/register-face`);
      console.log("Image length:", base64Image?.length);

      return result;
    } catch (error) {
      console.error('Error registering face:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Handle face detection
  const handleFacesDetected = ({ faces }) => {
    if (faces.length > 0 && !isProcessing) {
      // Clear any existing timeout
      if (faceDetectionTimeoutRef.current) {
        clearTimeout(faceDetectionTimeoutRef.current);
      }

      // Set new timeout for auto-capture
      faceDetectionTimeoutRef.current = setTimeout(() => {
        takePicture();
      }, 2000); // Auto-capture after 2 seconds of face detection
    }
  };

  // Take picture function
  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      if (photo) {
        await processCapturedImage(photo);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // Process captured image
  const processCapturedImage = async (photo) => {
    try {
      const base64Image = await convertImageToBase64(photo);
      if (!base64Image) {
        throw new Error('Failed to convert image');
      }

      const poseTypes = ['front', 'left', 'right'];
      const currentPose = poseTypes[step];

      const result = await registerFaceWithMTCNN(base64Image, currentPose);

      if (result.success) {
        // Store in local database
        await storeFaceData(loggedInUserId, result.embedding, base64Image, currentPose);

        // Update progress
        const newFaceCount = faceCount + 1;
        setFaceCount(newFaceCount);
        setCaptureProgress((newFaceCount / 3) * 100);

        if (newFaceCount < 3) {
          // Move to next pose
          const nextStep = step + 1;
          setStep(nextStep);
          setInstruction(instructions[nextStep]);

          // Reset processing for next capture
          setIsProcessing(false);
        } else {
          // Registration complete
          handleRegistrationSuccess();
        }
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    }
  };

  // Enhanced handleRegisterFace with better UX
  const handleRegisterFace = async () => {
    console.log("API_URL:", API_URL);

    if (!loggedInUserId) {
      Alert.alert(
        'Login Required',
        'Please log in first to register your face for secure authentication.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Access Required',
          'Fundora needs camera access to register your face securely. You can enable it in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    // Start camera with smooth transition
    setShowCamera(true);
    setStep(0);
    setFaceCount(0);
    setCaptureProgress(0);
    setInstruction(instructions[0]);
  };

  // Enhanced registration success
  const handleRegistrationSuccess = async () => {
    setIsProcessing(false);
    setInstruction(instructions[3]);
    setUserHasRegisteredFace(true);

    // Success animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowCamera(false);
      handlePostRegistrationNavigation();
    }, 2000);
  };

  // Enhanced skip registration
  const handleSkipRegistration = () => {
    Alert.alert(
      'Skip Face Registration',
      'For maximum security, we recommend registering your face. You can always do this later in Settings.',
      [
        {
          text: 'Register Now',
          style: 'cancel',
          onPress: () => handleRegisterFace()
        },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            handlePostRegistrationNavigation();
          }
        },
      ]
    );
  };

  // View stored faces
  const handleViewStoredFaces = async () => {
    if (!loggedInUserId) return;

    try {
      const faces = await getUserFaceData(loggedInUserId);
      Alert.alert(
        'Stored Face Data',
        `You have ${faces.length} face poses registered:\n\n${faces.map(face => `• ${face.pose_type} pose`).join('\n')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting face data:', error);
      Alert.alert('Error', 'Failed to retrieve face data.');
    }
  };

  // Delete face data
  const handleDeleteFaceData = () => {
    Alert.alert(
      'Delete Face Data',
      'Are you sure you want to delete all your registered face data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserFaceData(loggedInUserId);
              setUserHasRegisteredFace(false);
              Alert.alert('Success', 'Your face data has been deleted.');
            } catch (error) {
              console.error('Error deleting face data:', error);
              Alert.alert('Error', 'Failed to delete face data.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="scan-circle-outline" size={32} color="#57C0A1" />
              <Text style={styles.logo}>Fundora</Text>
            </View>
            <Text style={styles.subtitle}>Secure Face Authentication</Text>
          </View>

          {fromLogin && (
            <View style={styles.welcomeCard}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle" size={60} color="#57C0A1" />
              </View>
              <Text style={styles.welcomeTitle}>Welcome! 👋</Text>
              <Text style={styles.welcomeText}>
                Register your face for faster, more secure access to your account.
              </Text>
            </View>
          )}

          {/* Feature Card */}
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={28} color="#57C0A1" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>AI-Powered Security</Text>
              <Text style={styles.featureText}>
                Advanced face recognition using MTCNN and FaceNet technology for enterprise-grade security.
              </Text>
            </View>
          </View>

          {/* Progress Indicator */}
          {userHasRegisteredFace && (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-done" size={24} color="#fff" />
              </View>
              <View style={styles.successContent}>
                <Text style={styles.successTitle}>Face Registered</Text>
                <Text style={styles.successText}>Your face is ready for secure authentication</Text>
              </View>
            </View>
          )}



          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isEnabled || isProcessing) && styles.primaryButtonDisabled
              ]}
              disabled={!isEnabled || isProcessing}
              onPress={handleRegisterFace}
            >
              <View style={styles.buttonContent}>
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={22} color="#fff" />
                )}
                <Text style={styles.primaryButtonText}>
                  {isProcessing ? 'Processing...' : 'Register Face'}
                </Text>
              </View>
            </TouchableOpacity>

            {showSkipOption && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkipRegistration}
              >
                <Text style={styles.secondaryButtonText}>Skip for now</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Management Options */}
          {userHasRegisteredFace && !fromLogin && (
            <View style={styles.managementSection}>
              <Text style={styles.managementTitle}>Face Data Management</Text>
              <View style={styles.managementButtons}>
                <TouchableOpacity style={styles.managementButton} onPress={handleViewStoredFaces}>
                  <Ionicons name="eye" size={18} color="#57C0A1" />
                  <Text style={styles.managementButtonText}>View Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.managementButton, styles.managementButtonDanger]}
                  onPress={handleDeleteFaceData}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={[styles.managementButtonText, styles.managementButtonTextDanger]}>
                    Delete Data
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Security Footer */}
          <View style={styles.securityNote}>
            <Ionicons name="lock-closed" size={16} color="#6b7280" />
            <Text style={styles.securityText}>
              Your face data is encrypted and stored securely on your device
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Enhanced Camera Modal */}
      <Modal visible={showCamera} animationType="slide" statusBarTranslucent={true}>
        <View style={styles.cameraContainer}>

          {/* CameraView does not have any children */}
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: "fast",
              detectLandmarks: "none",
              runClassifications: "none",
              minDetectionInterval: 1000,
            }}
          />

          {/* Overlay UI placed outside */}
          <View style={styles.cameraOverlay}>

            {/* Header */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (faceDetectionTimeoutRef.current) clearTimeout(faceDetectionTimeoutRef.current);
                  setShowCamera(false);
                }}
              >
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>Registration Progress</Text>
                  <Text style={styles.progressCount}>{faceCount}/3</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${captureProgress}%` }]} />
                </View>
              </View>
            </View>

            {/* Face Guidance */}
            <View style={styles.faceGuidance}>
              <View style={styles.faceOutline}>
                <View style={styles.faceGuide} />
              </View>
            </View>

            {/* Instructions + Capture Button */}
            <View style={styles.instructionPanel}>
              <Text style={styles.instructionTitle}>Current Pose</Text>
              <Text style={styles.instructionText}>{instruction}</Text>

              <View style={styles.captureSection}>
                {!isProcessing ? (
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButtonOuter}>
                      <View style={styles.captureButtonInner} />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.processingState}>
                    <ActivityIndicator size="large" color="#57C0A1" />
                    <Text style={styles.processingText}>Analyzing with AI...</Text>
                  </View>
                )}
              </View>
            </View>

          </View>

        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#57C0A1',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  welcomeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#57C0A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#166534',
    lineHeight: 22,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: '#57C0A1',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    marginRight: 12,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  successText: {
    fontSize: 14,
    color: '#dcfce7',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#57C0A1',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#57C0A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  managementSection: {
    marginBottom: 24,
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  managementButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 0.48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  managementButtonText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#374151',
  },
  managementButtonDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  managementButtonTextDanger: {
    color: '#dc2626',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  // Camera Styles
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
    padding: 8,
    marginRight: 16,
  },
  progressSection: {
    flex: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressCount: {
    color: '#57C0A1',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#57C0A1',
    borderRadius: 3,
  },
  faceGuidance: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  poseIndicator: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
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
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: '#57C0A1',
    transform: [{ scale: 1.2 }],
  },
  stepDotCompleted: {
    backgroundColor: '#57C0A1',
  },
  captureSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButton: {
    padding: 8,
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
  processingState: {
    alignItems: 'center',
  },
  processingText: {
    color: '#57C0A1',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  helperText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});