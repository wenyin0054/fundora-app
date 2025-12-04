import Constants from "expo-constants";

export const getApiBase = () => {
  const ip = Constants.expoConfig.hostUri.split(":")[0];
  return `http://${ip}:5000`;
};
