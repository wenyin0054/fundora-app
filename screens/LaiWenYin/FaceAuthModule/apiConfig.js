import Constants from "expo-constants";
import { Platform } from "react-native";

export const getApiBase = () => {

  const hostUri = Constants.expoConfig?.hostUri;

  // 1. Expo LAN mode → real device on same WiFi
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:5000`;
  }

  // 2. Android Emulator → use 10.0.2.2 to access PC localhost
  if (Platform.OS === "android") {
    console.log("Android Emulator fallback → 10.0.2.2");
    return "http://10.0.2.2:5000";
  }

  // 3. iOS Simulator → localhost works
  if (Platform.OS === "ios") {
    console.log("iOS simulator fallback → localhost");
    return "http://127.0.0.1:5000";
  }

  // 4. Final fallback → you can set your PC WiFi IP manually
  console.log("⚠️ Final fallback → Set your PC WiFi IP here");
   return "http://10.0.2.51:5000";
};
