// FinancialTipBanner.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const FinancialTipBanner = ({ 
  message, 
  isVisible, 
  onClose, 
  userLevel = 'beginner',
  duration = 8000
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      // Reset progress animation
      progressAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        })
      ]).start();

      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible && fadeAnim._value === 0) return null;

  const getLevelConfig = () => {
    if (userLevel === "experienced") {
      return {
        label: "Pro Tip",
        icon: "⚡",
        backgroundColor: '#667eea',
        secondaryColor: '#764ba2',
        iconColor: '#FFD700'
      };
    } else {
      return {
        label: "Smart Tip",
        icon: "💡",
        backgroundColor: '#57C0A1',
        secondaryColor: '#4CAF50',
        iconColor: '#FFEB3B'
      };
    }
  };

  const levelConfig = getLevelConfig();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim, 
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ],
          backgroundColor: levelConfig.backgroundColor,
        }
      ]}
    >
      {/* Background Effects */}
      <View style={[styles.backgroundEffect, { backgroundColor: levelConfig.secondaryColor }]} />
      <View style={styles.patternOverlay} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Header with Icon and Label */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: levelConfig.iconColor }]}>
              {levelConfig.icon}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.tagText}>{levelConfig.label}</Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{message}</Text>
        </View>

        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  transform: [{
                    scaleX: progressAnim
                  }],
                  backgroundColor: 'rgba(255,255,255,0.6)'
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    borderRadius: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 2000,
    overflow: 'hidden',
  },
  backgroundEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.3,
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 20,
    position: 'relative',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  messageContainer: {
    marginBottom: 15,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    width: '100%',
    transformOrigin: 'left center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 3,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});

export default FinancialTipBanner;