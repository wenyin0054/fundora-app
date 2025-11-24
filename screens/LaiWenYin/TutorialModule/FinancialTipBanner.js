// FinancialTipBanner.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const FinancialTipBanner = ({ 
  message, 
  isVisible, 
  onClose, 
  userLevel = 'beginner',
  duration = 8000
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!isVisible && fadeAnim._value === 0) return null;

  const getLevelLabel = () => userLevel === "experienced" ? "Pro Tip" : "Tip";

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Label tag */}
      <View style={styles.tag}>
        <Text style={styles.tagText}>{getLevelLabel()}</Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    padding: 18,
    borderRadius: 16,

    // Modern glass effect
    backgroundColor: 'rgba(194, 242, 190, 0.92)',
    backdropFilter: 'blur(12px)', // (iOS only, safe fallback)

    // Shadow
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    zIndex: 2000,
  },

  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#88b5e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },

  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  message: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1A1A1A',
    fontWeight: '500',
    marginRight: 30,
  },

  closeButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 5,
  },

  closeText: {
    fontSize: 18,
    color: '#444',
    opacity: 0.7,
  }
});

export default FinancialTipBanner;
