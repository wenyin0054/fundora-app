// FaceLoginScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkOnboardingStatus, hasRegisteredFace, getUserById } from "../../../database/userAuth";
import { getApiBase } from "./apiConfig";

const API_URL = getApiBase();
console.log("🔗 Using API URL:", API_URL);

const FaceLoginScreen = ({ navigation, route }) => {
  const { onSuccess, onCancel } = route.params || {};

  // camera permission
  const [permission, requestPermission] = useCameraPermissions();

  // detection & processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [instruction, setInstruction] = useState("Center your face in the frame");
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");
  const [detectionProgress, setDetectionProgress] = useState(0);

  // refs for timers & stability
  const cameraRef = useRef(null);
  const faceStableRef = useRef(false);
  const faceAppearTimeRef = useRef(0);
  const detectionIntervalRef = useRef(null);
  const captureTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // run pulsing animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      // cleanup timers and abort controllers
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch { }
      }
    };
  }, []);

  useEffect(() => {
    // helper to reset progress animation value whenever detectionProgress changes
    Animated.timing(progressAnim, {
      toValue: detectionProgress / 100,
      duration: 150,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start();
  }, [detectionProgress]);

  // request permission immediately
  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Clean base64 and call server endpoint
  const recognizeFaceWithMTCNN = async (base64Image) => {
    try {
      let cleanBase64 = base64Image;
      if (cleanBase64.includes(",")) cleanBase64 = cleanBase64.split(",")[1];

      // abort controller for timeout
      abortControllerRef.current = new AbortController();
      const ctrl = abortControllerRef.current;
      const timeout = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${API_URL}/recognize-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: cleanBase64 }),
        signal: ctrl.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      return json;
    } catch (err) {
      console.error("recognizeFaceWithMTCNN error:", err);
      if (err.name === "AbortError") return { success: false, error: "timeout" };
      return { success: false, error: err.message || "network" };
    }
  };

  const handleFaceRecognized = async (result) => {
    try {
      // get full user
      const user = await getUserById(result.user_id);
      if (!user) {
        setFailedMessage(
          typeof result.error === "string"
            ? `Not recognized (${result.error})`
            : "Face not recognized"
        );

        setShowRetryModal(true);
        return;
      }

      // store session
      await AsyncStorage.setItem(
        "currentUser",
        JSON.stringify({ userId: user.userId, username: user.username, email: user.email })
      );

      // slight haptic feedback on success
      if (Platform.OS !== "web") Vibration.vibrate(60);

      setInstruction(`Welcome ${user.username}!`);
      setIsProcessing(false);

      // call callback or navigate accordingly
      if (onSuccess) {
        onSuccess(user);
      } else {
        const done = await checkOnboardingStatus(user.userId);
        const hasFace = await hasRegisteredFace(user.userId);
        if (!done) navigation.replace("OnboardingScreen");
        else if (!hasFace) navigation.replace("FaceRegistration", { showSkipOption: true, fromLogin: true });
        else navigation.replace("MainApp");
      }
    } catch (err) {
      console.error("handleFaceRecognized error:", err);
      setFailedMessage("Login failed. Try again.");
      setShowRetryModal(true);
      setIsProcessing(false);
    }
  };

  const handleFaceDetected = async (base64) => {
    if (isProcessing) return;
    setIsProcessing(true);
    stopDetectionProgress();
    setInstruction("Processing your face...");
    setFaceDetected(true);

    // small UI delay so the user sees the "processing" state
    await new Promise((r) => setTimeout(r, 350));

    const result = await recognizeFaceWithMTCNN(base64);

    if (result.success && result.recognized) {
      await handleFaceRecognized(result);
    } else {
      // fail flow
      setShowRetryModal(true);
      setFailedMessage(result.error ? `Not recognized (${result.error})` : "Face not recognized");
      setIsProcessing(false);
      setFaceDetected(false);
      setInstruction("Center your face in the frame");
    }
  };

  // face detector callback (CameraView)
  const handleFacesDetected = ({ faces }) => {
    const now = Date.now();

    // no face
    if (!faces || faces.length === 0) {
      if (faceDetected) setFaceDetected(false);
      faceStableRef.current = false;
      startDetectionProgress(false);
      return;
    }

    const face = faces[0];
    if (!face || !face.bounds) return;

    // show immediate detected state
    if (!faceDetected && !isProcessing) {
      setFaceDetected(true);
      setInstruction("Face detected — hold still");
      faceAppearTimeRef.current = now;
      startDetectionProgress(true);
    }

    // once stable, capture after small delay
    if (!faceStableRef.current && !isProcessing && now - faceAppearTimeRef.current > 700) {
      faceStableRef.current = true;

      // short delay for better UX
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = setTimeout(() => {
        // trigger capture
        takePhotoForRecognition();
      }, 900);
    }
  };

  const takePhotoForRecognition = async () => {
    if (!cameraRef.current || isProcessing) return;

    // small vibration to indicate capture
    if (Platform.OS !== "web") Vibration.vibrate(20);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
      });

      await handleFaceDetected(photo.base64);
    } catch (err) {
      console.error("takePhotoForRecognition error:", err);
      setInstruction("Capture failed. Try again.");
      setIsProcessing(false);
      setFaceDetected(false);
      stopDetectionProgress();
    }
  };

  // progress helpers (visual only)
  const startDetectionProgress = (active = true) => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (!active) {
      setDetectionProgress(0);
      return;
    }
    let val = 10;
    setDetectionProgress(val);
    detectionIntervalRef.current = setInterval(() => {
      val = Math.min(80, val + Math.floor(Math.random() * 12) + 6);
      setDetectionProgress(val);
      if (val >= 80) clearInterval(detectionIntervalRef.current);
    }, 220);
  };

  const stopDetectionProgress = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setDetectionProgress(0);
  };

  // close/back handling
  const handleBackPress = () => {
    console.log("Close button pressed");
    if (onCancel) {
      try { onCancel({ disableAuto: true }); } catch { }
    }
    navigation.navigate("Login", { disableAuto: true });
  };

  const handleManualLogin = () => {
    setShowRetryModal(false);
    if (onCancel) {
      try { onCancel({ disableAuto: true }); } catch { }
    }
    navigation.navigate("Login", { disableAuto: true });
  };

  // UI animations
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const rotateInterpolate = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const progressScale = progressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] });

  // permission fallback UI
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera permission required for face login</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={handleManualLogin}>
          <Text style={styles.secondaryBtnText}>Login manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal transparent visible={showRetryModal} animationType="fade" onRequestClose={() => setShowRetryModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>Face Detection Failed</Text>
            <Text style={modalStyles.msg}>
              {typeof failedMessage === "string"
                ? failedMessage
                : "Face not recognized. Retake or login manually?"}
            </Text>

            <View style={modalStyles.row}>
              <TouchableOpacity
                style={modalStyles.btn}
                onPress={() => {
                  setShowRetryModal(false);
                  setFaceDetected(false);
                  setIsProcessing(false);
                  setInstruction("Center your face in the frame");
                  stopDetectionProgress();
                }}
              >
                <Text style={modalStyles.btnText}>🔄 Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={modalStyles.btn} onPress={handleManualLogin}>
                <Text style={modalStyles.btnText}>✋ Manual</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: 1,
          detectLandmarks: 2,
          runClassifications: 1,
          minDetectionInterval: 100,
          tracking: true,
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleBackPress} accessibilityLabel="Close">
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Face Login</Text>
            {isProcessing ? <Text style={styles.headerSubtitle}>Verifying…</Text> : null}
          </View>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.centerArea}>
          <Animated.View
            style={[
              styles.pulseOuter,
              {
                transform: [{ scale: pulseScale }],
                opacity: faceDetected ? 0.9 : 0.65,
              },
            ]}
          >
            <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: rotateInterpolate }] }]} />

            <View style={styles.dashedRing}>
              <View style={styles.faceHole} />
            </View>
          </Animated.View>

          <View style={styles.statusRow}>
            <Ionicons
              name={faceDetected ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={faceDetected ? "#57C0A1" : "rgba(255,255,255,0.7)"}
            />
            <Text style={styles.statusText}>
              {isProcessing ? "Processing…" : faceDetected ? "Face detected" : "Align your face"}
            </Text>
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <Text style={styles.instructionLabel}>Instruction</Text>
          <Text style={styles.instruction}>{instruction}</Text>

          <View style={styles.captureRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.captureButtonWrapper}
              onPress={() => {
                if (!isProcessing) takePhotoForRecognition();
              }}
            >
              <View style={[styles.captureOuter, isProcessing && { opacity: 0.5 }]}>
                <View style={styles.captureInner} />
              </View>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.processingText}>Verifying identity…</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

/* ----------------- Styles ----------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, justifyContent: "space-between" },

  header: {
    flexDirection: "row",
    paddingTop: Platform.OS === "ios" ? 52 : 36,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },

  centerArea: { alignItems: "center", justifyContent: "center", flex: 1 },
  pulseOuter: {
    width: 300,
    height: 300,
    borderRadius: 150,
    alignItems: "center",
    justifyContent: "center",
  },

  rotatingRing: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
  },

  dashedRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  faceHole: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  statusText: { color: "#fff", marginLeft: 10, fontSize: 14 },

  bottomPanel: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingHorizontal: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: 220,
  },

  instructionLabel: { color: "#9CA3AF", textAlign: "center", fontSize: 13 },
  instruction: { color: "#fff", textAlign: "center", fontSize: 18, marginTop: 8, marginBottom: 12 },

  captureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },

  captureButtonWrapper: { alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 4 },

  captureOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
  },

  processingRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 12 
  },
  processingText: { color: "#fff", marginLeft: 8, fontSize: 13 },

  permissionContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#000",
    padding: 20,
  },
  permissionText: { 
    color: "#fff", 
    fontSize: 16, 
    textAlign: "center", 
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  primaryBtn: { 
    backgroundColor: "#57C0A1", 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    minWidth: 180,
  },
  primaryBtnText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16,
    textAlign: "center",
  },
  secondaryBtn: { 
    borderColor: "#57C0A1", 
    borderWidth: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    minWidth: 180,
  },
  secondaryBtnText: { 
    color: "#57C0A1",
    fontSize: 16,
    textAlign: "center",
  },
});

/* Modal styles */
const modalStyles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  box: { 
    width: "80%", 
    backgroundColor: "#fff", 
    padding: 20, 
    borderRadius: 14, 
    alignItems: "center" 
  },
  title: { 
    fontWeight: "700", 
    fontSize: 18, 
    marginBottom: 8 
  },
  msg: { 
    textAlign: "center", 
    marginBottom: 18, 
    color: "#333",
    fontSize: 15,
    lineHeight: 22,
  },
  row: { 
    flexDirection: "row",
    marginTop: 10,
  },
  btn: { 
    backgroundColor: "#57C0A1", 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 8, 
    marginHorizontal: 8 
  },
  btnText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: 15,
  },
});

export default FaceLoginScreen;