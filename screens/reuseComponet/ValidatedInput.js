import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { View, Text, TextInput, Animated, StyleSheet } from "react-native";

const ValidatedInput = forwardRef(({
  label,
  value,
  onChangeText,
  placeholder = "",
  keyboardType = "default",
  validate = () => true,
  errorMessage = "Invalid input",
  icon = null, // ⭐ ONLY show when passed
}, ref) => {

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [hasError, setHasError] = useState(false);

  // Shake animation
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // External API
  useImperativeHandle(ref, () => ({
    shake: triggerShake,
    setError: (v) => setHasError(v),
    validate: () => {
      const ok = validate(value);
      if (!ok) {
        setHasError(true);
        triggerShake();
        return false;
      }
      setHasError(false);
      return true;
    },
  }));

  const handleInput = (text) => {
    onChangeText(text);
    if (!validate(text)) {
      setHasError(true);
    } else {
      setHasError(false);
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputWrapper,
          { transform: [{ translateX: shakeAnim }] },
          hasError && styles.inputWrapperError,
        ]}
      >
        {/* ⭐ Conditional icon */}
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={[styles.input, hasError && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={"#c5c5c5ff"}
          value={value}
          keyboardType={keyboardType}
          onChangeText={handleInput}
        />
      </Animated.View>

      {hasError && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
});

export default ValidatedInput;

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  // ⭐ Wrapper for icon + input together
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
  },

  inputWrapperError: {
    borderColor: "#ff6b6b",
    borderWidth: 2,
  },

  iconContainer: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },

  inputError: {
    color: "#e63946",
  },

  errorText: {
    color: "#e63946",
    marginTop: 4,
    fontSize: 12,
  },
});
