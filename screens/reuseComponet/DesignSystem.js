// =====================================
// FUNDORA DESIGN SYSTEM (FDS)
// =====================================
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useImperativeHandle, forwardRef, useRef, useState } from "react";

// -----------------------------
// 1. COLOR SYSTEM
// -----------------------------
export const FDSColors = {
  primary: "#8AD0AB",       // Fundora 主色调 (柔和绿色)
  primaryDark: "#6FB896",
  textDark: "#1F2937",
  textGray: "#6B7280",
  border: "#E5E7EB",
  bgLight: "#F3F6FA",
  white: "#FFFFFF",
};

// -----------------------------
// 2. TYPOGRAPHY
// -----------------------------
export const FDSText = {
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: FDSColors.textDark,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    fontSize: 15,
    color: FDSColors.textDark,
  },
};

// -----------------------------
// 3. CARD COMPONENT
// -----------------------------
export const FDSCard = ({ children }) => {
  return <View style={styles.card}>{children}</View>;
};

// -----------------------------
// 4. Label Component
// -----------------------------
export const FDSLabel = ({ children }) => {
  return <Text style={FDSText.label}>{children}</Text>;
};

// -----------------------------
// 5. INPUT COMPONENT
// -----------------------------
export const FDSInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}) => {
  return (
    <View style={styles.inputContainer}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}

      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor="#c5c5c5"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
};

// -----------------------------
// 6. BUTTON COMPONENT
// -----------------------------
export const FDSButton = ({
  title,
  onPress,
  icon,
  bgColor,
  textColor,
  mode = "solid", // solid | outline | danger
  disabled = false,
}) => {
  // Determine background color
  let backgroundColor = bgColor || FDSColors.primary;

  if (mode === "danger" && !bgColor) {
    backgroundColor = "#E53935"; // default red
  }

  if (mode === "outline") {
    backgroundColor = "transparent";
  }

  // Determine text color
  let labelColor = textColor || "#FFFFFF";

  if (mode === "outline") {
    labelColor = FDSColors.primary;
  }
  if (mode === "danger" && !textColor) {
    labelColor = "#FFFFFF";
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: backgroundColor, opacity: disabled ? 0.6 : 1 },
        mode === "outline"
          ? { borderWidth: 2, borderColor: FDSColors.primary }
          : null,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={labelColor}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.buttonText, { color: labelColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};


export const FDSValidatedInput = forwardRef(({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
  validate = null,         // function: (value) => boolean
  errorMessage = "Invalid",
  style,                   // optional extra style for container
  inputStyle,              // optional style for text input
}, ref) => {

  // internal state
  const [error, setError] = useState(false);
  const [touched, setTouched] = useState(false);
  const [msg, setMsg] = useState(errorMessage);

  // animated shake value
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    validate: () => {
      if (typeof validate === "function") {
        const ok = validate(value);
        setError(!ok);
        setTouched(true);
        if (!ok) triggerShake();
        return ok;
      }
      return true; // no validate function => always valid
    },
    setError: (flag, message) => {
      setError(flag);
      setTouched(true);
      if (message) setMsg(message);
      if (flag) triggerShake();
    },
    clearError: () => {
      setError(false);
      setTouched(false);
      setMsg(errorMessage);
    },
    shake: () => {
      triggerShake();
    }
  }));

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animatedStyle = {
    transform: [{
      translateX: shakeAnim
    }]
  };

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={FDSText.label}>{label}</Text> : null}

      <Animated.View style={[styles.inputContainer, animatedStyle, error ? styles.inputErrorBorder : null]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <TextInput
          value={value}
          onChangeText={(t) => {
            if (error) {
              // typing clears error visual (可选)
              setError(false);
            }
            setTouched(true);
            onChangeText && onChangeText(t);
          }}
          placeholder={placeholder}
          placeholderTextColor="#c5c5c5"
          style={[styles.input, inputStyle]}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </Animated.View>

      {error && touched ? <Text style={styles.errorText}>{msg}</Text> : null}
    </View>
  );
});

// -----------------------------
// 7. VALIDATED PICKER (Tag, Category, Payment Type, Event Tag, etc.)
// -----------------------------
export const FDSValidatedPicker = forwardRef(
  (
    {
      label,
      value,
      placeholder = "Select...",
      icon,
      children,
      validate = null,
      errorMessage = "This field is required",
      style,
    },
    ref
  ) => {
    const [error, setError] = useState(false);
    const [touched, setTouched] = useState(false);
    const [msg, setMsg] = useState(errorMessage);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
      validate: () => {
        if (typeof validate === "function") {
          const ok = validate(value);
          setTouched(true);
          setError(!ok);
          if (!ok) triggerShake();
          return ok;
        }
        return true;
      },
      setError: (flag, message) => {
        setTouched(true);
        setError(flag);
        if (message) setMsg(message);
        if (flag) triggerShake();
      },
      clearError: () => {
        setError(false);
        setTouched(false);
        setMsg(errorMessage);
      },
      shake: () => triggerShake(),
    }));

    const triggerShake = () => {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    };

    return (
      <View style={[{ marginBottom: 12 }, style]}>
        {label ? <Text style={FDSText.label}>{label}</Text> : null}

        <Animated.View
          style={[
            styles.inputContainer, // 使用正常 input container 样式
            { transform: [{ translateX: shakeAnim }] },
            error ? styles.inputErrorBorder : null, // 使用现有 error 样式
          ]}
        >
          {icon ? <View style={styles.inputIcon}>{icon}</View> : null}

          <Text
            style={{
              flex: 1,
              fontSize: 15,
              color: value ? FDSColors.textDark : FDSColors.textGray,
              paddingVertical: 4,
            }}
          >
            {value || placeholder}
          </Text>

          {/* Invisible Picker */}
          {children}
        </Animated.View>

        {error && touched ? (
          <Text style={styles.errorText}>{msg}</Text>
        ) : null}
      </View>
    );
  }
);


// =====================================
// STYLES
// =====================================
const styles = StyleSheet.create({
  // CARD
  card: {
    backgroundColor: FDSColors.white,
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  // Input Container
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FDSColors.bgLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: FDSColors.border,
    marginBottom: 12,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: FDSColors.textDark,
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
  },

  // Button
  button: {
    backgroundColor: FDSColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FDSColors.bgLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: FDSColors.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: FDSColors.textDark,
  },
  inputErrorBorder: {
    borderColor: "#E11D48", // red-600
    backgroundColor: "#fff6f6",
  },
  errorText: {
    color: "#E11D48",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  }
});

