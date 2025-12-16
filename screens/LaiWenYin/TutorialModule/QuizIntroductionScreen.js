// screens/QuizIntroductionScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QuizIntroductionScreen({ route, navigation }) {
  const { userId, forceShow = false } = route.params;
  const [isChecking, setIsChecking] = useState(true);

  React.useEffect(() => {
    const checkOnboarding = async () => {
      const hasCompleted = await AsyncStorage.getItem(`hasCompletedOnboarding_${userId}`);
      if (hasCompleted && !forceShow) {
        navigation.replace("MainApp");
        return;
      }
      setIsChecking(false);
    };
    checkOnboarding();
  }, [userId, navigation, forceShow]);

  const handleGetStarted = async () => {
    navigation.replace('DailyQuiz', { userId, fromOnboarding: true });
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(`hasCompletedOnboarding_${userId}`, 'true');
    navigation.replace('MainApp');
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#57C0A1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image 
          source={require('../../../assets/quiz_intro.jpg')}
          style={styles.image}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Daily Financial Quiz</Text>
        <Text style={styles.subtitle}>
          Build confidence in budgeting, saving, and smart money habits — one question a day!
        </Text>
        
        <View style={styles.features}>
          {/* Feature 1 */}
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🎯</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Test Your Knowledge</Text>
              <Text style={styles.featureDescription}>
                Strengthen your understanding of financial concepts through short daily questions.
              </Text>
            </View>
          </View>
          
          {/* Feature 2 - Removed points */}
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>📘</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Learn with Explanations</Text>
              <Text style={styles.featureDescription}>
                Each question includes simple explanations to help you learn immediately.
              </Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>📈</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Personalized Difficulty</Text>
              <Text style={styles.featureDescription}>
                Questions adapt to your experience level — Beginner or Experienced.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>Start Today's Quiz</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          You can enable or disable the daily quiz anytime in Settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#57C0A1', fontSize: 16 },
  scrollContent: { flexGrow: 1, padding: 20, alignItems: 'center' },
  image: { width: 200, height: 200, marginTop: 20, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#2c3e50' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#6b7280', marginBottom: 40, lineHeight: 22 },
  features: { width: '100%' },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 25, paddingHorizontal: 10 },
  featureIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureIconText: { fontSize: 20 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  featureDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  buttons: { padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  primaryButton: { backgroundColor: '#57C0A1', borderRadius: 12, padding: 16, marginBottom: 12 },
  primaryButtonText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: '#57C0A1', borderRadius: 12, padding: 16, marginBottom: 16 },
  secondaryButtonText: { color: '#57C0A1', textAlign: 'center', fontWeight: '600', fontSize: 16 },
  note: { textAlign: 'center', color: '#9ca3af', fontSize: 12 },
});
