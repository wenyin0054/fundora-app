import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  Easing,
} from "react-native";
import {
  getExperienceLevel,
  insertQuizResult,
  getTodayQuizStatus,
} from "../../../database/userAuth";
import quizData from "../../../assets/financial_quiz.json";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get("window");

export default function DailyQuiz({ route, navigation }) {
  const { userId, fromOnboarding = false } = route.params;
  const [quiz, setQuiz] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userLevel, setUserLevel] = useState("beginner");
  const [isLoading, setIsLoading] = useState(true);
  const [dailyDone, setDailyDone] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const correctScale = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    loadUserLevelAndQuiz();
  }, [userId]);

  useEffect(() => {
    if (quiz) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [quiz]);

  const animateCorrect = () => {
    Animated.sequence([
      Animated.timing(correctScale, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(correctScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const showResultModalAnimation = () => {
    setShowResultModal(true);

    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 400,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideResultModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowResultModal(false);
      navigation.replace("MainApp");
    });
  };

  const getQuizByLevel = (levels) => {
    try {
      const normalized = levels?.toLowerCase() || "beginner";
      const levelQuizzes = quizData.levels?.[normalized];

      if (!levelQuizzes || !Array.isArray(levelQuizzes) || levelQuizzes.length === 0) {
        return quizData.levels["beginner"][0];
      }

      const randomIndex = Math.floor(Math.random() * levelQuizzes.length);
      const quiz = levelQuizzes[randomIndex];

      return {
        ...quiz,
        correct_answer: quiz.correct_answer_index + 1,
      };
    } catch (err) {
      console.error("Error loading quiz:", err);
      return null;
    }
  };

  const loadUserLevelAndQuiz = async () => {
    try {
      setIsLoading(true);

      if (!fromOnboarding) {
        const todayDone = await getTodayQuizStatus(userId);
        if (todayDone) {
          setDailyDone(true);
          setIsLoading(false);
          return;
        }
      }

      const levels = await getExperienceLevel(userId);
      if (levels) setUserLevel(levels);

      const quiz = getQuizByLevel(levels);
      setQuiz(quiz);
    } catch (error) {
      console.error("Error loading quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (selectedOption === null) {
      // Show a nicer alert for no selection
      showCustomAlert(
        "Select an Answer",
        "Please choose an option before submitting to test your financial knowledge! 💡",
        "Got it"
      );
      return;
    }

    const correct = selectedOption === quiz.correct_answer;
    setIsCorrect(correct);
    setShowResult(true);
    setHasAnswered(true);
    setShowExplanation(!correct); // explicitly show explanation on wrong answer


    correct ? animateCorrect() : animateWrong();

    const quizResult = {
      userId,
      question: quiz.question,
      selectedOption,
      correctAnswer: quiz.correct_answer,
      isCorrect: correct ? 1 : 0,
      date: new Date().toLocaleDateString('sv-SE'),
    };

    await insertQuizResult(quizResult);

    // Mark onboarding as completed
    await AsyncStorage.setItem(`hasCompletedOnboarding_${userId}`, 'true');

    // Set last quiz date
    await AsyncStorage.setItem(`lastQuizDate_${userId}`, new Date().toDateString());

    // Show the beautiful result modal
    setTimeout(() => {
      showResultModalAnimation();
    }, 800);
  };

  const showCustomAlert = (title, message, buttonText) => {
    setShowResultModal(true);
    // Simple alert modal implementation
    // You could enhance this further with custom modal
  };

  const ConfettiParticle = ({ delay, color, size, duration }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const startAnimation = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 500,
            duration: duration || 2000,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: Math.random() * 100 - 50,
            duration: duration || 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              delay: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, delay);

      return () => clearTimeout(startAnimation);
    }, []);

    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: [{ translateX }, { translateY }],
          opacity,
        }}
      >
        <Ionicons
          name="star"
          size={size || 16}
          color={color || "#FFD700"}
        />
      </Animated.View>
    );
  };

  if (isLoading)
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading your daily quiz...</Text>
      </View>
    );

  if (dailyDone)
    return (
      <View style={styles.center}>
        <Ionicons name="trophy" size={80} color="#FFD700" style={styles.trophyIcon} />
        <Text style={styles.completedTitle}>🎉 Quiz Completed!</Text>
        <Text style={styles.completedSubtitle}>
          Great job completing today's financial quiz!{'\n'}
          Come back tomorrow for a new challenge.
        </Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.replace("MainApp")}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );

  if (!quiz)
    return (
      <View style={styles.center}>
        <Ionicons name="sad-outline" size={60} color="#6b7280" />
        <Text style={styles.errorText}>Unable to load quiz</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Financial Quiz</Text>
          <View style={styles.levelBadge}>
            <Ionicons name="ribbon" size={16} color="#fff" />
            <Text style={styles.levelText}>{userLevel}</Text>
          </View>
        </View>

        <Text style={styles.question}>{quiz.question}</Text>

        {quiz.options.map((option, i) => {
          const isThisCorrect = quiz.correct_answer === i + 1;
          const isThisSelected = selectedOption === i + 1;

          return (
            <Animated.View
              key={i}
              style={{
                transform: [
                  isThisSelected && !isCorrect
                    ? { translateX: shakeAnim }
                    : isThisCorrect && isCorrect
                      ? { scale: correctScale }
                      : { scale: 1 },
                ],
              }}
            >
              <TouchableOpacity
                onPress={() => !hasAnswered && setSelectedOption(i + 1)}
                disabled={hasAnswered}
                style={[
                  styles.option,
                  selectedOption === i + 1 && styles.selectedOption,
                  showResult && isThisCorrect && styles.correctOption,
                  showResult &&
                  isThisSelected &&
                  !isThisCorrect &&
                  styles.incorrectOption,
                ]}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIndicator,
                    selectedOption === i + 1 && styles.selectedIndicator,
                    showResult && isThisCorrect && styles.correctIndicator,
                    showResult && isThisSelected && !isThisCorrect && styles.incorrectIndicator,
                  ]}>
                    <Text style={styles.optionLetter}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      showResult && isThisCorrect && styles.correctOptionText,
                      showResult &&
                      isThisSelected &&
                      !isThisCorrect &&
                      styles.incorrectOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {hasAnswered && !isCorrect && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Correct Answer:</Text>
            <Text style={styles.correctAnswer}>
              {quiz.options[quiz.correct_answer - 1]}
            </Text>
            <Text style={styles.explanationText}>
              {quiz.explanation}
            </Text>
          </View>
        )}


        {!hasAnswered ? (
          <TouchableOpacity
            onPress={submitAnswer}
            style={[
              styles.submitButton,
              selectedOption === null && styles.disabledButton,
            ]}
            disabled={selectedOption === null}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.replace("MainApp")}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>Continue to Home</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Beautiful Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }]
              }
            ]}
          >
            {/* Confetti Effect */}
            {isCorrect && (
              <>
                {[...Array(15)].map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 100}
                    color={i % 3 === 0 ? "#FF6B6B" : i % 3 === 1 ? "#4ECDC4" : "#FFD166"}
                    size={12 + Math.random() * 8}
                    duration={1800 + Math.random() * 800}
                  />
                ))}
              </>
            )}

            <View style={[
              styles.resultIconContainer,
              isCorrect ? styles.correctIconContainer : styles.incorrectIconContainer
            ]}>
              <Ionicons
                name={isCorrect ? "trophy" : "bulb"}
                size={60}
                color="#fff"
              />
            </View>

            <Text style={styles.resultTitle}>
              {isCorrect ? "🎉 Brilliant!" : "💡 Learning Opportunity"}
            </Text>

            <Text style={styles.resultMessage}>
              {isCorrect
                ? "You nailed it! Your financial knowledge is impressive!"
                : "Don't worry, every expert was once a beginner!"
              }
            </Text>

            {showExplanation && (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>Correct Answer:</Text>
                <Text style={styles.correctAnswer}>
                  {quiz.options[quiz.correct_answer - 1]}
                </Text>
                <Text style={styles.explanationText}>
                  {quiz.explanation}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  isCorrect ? styles.modalButtonSuccess : styles.modalButtonLearn
                ]}
                onPress={hideResultModal}
              >
                <Ionicons
                  name="home"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.modalButtonText}>
                  {isCorrect ? "Celebrate!" : "Continue Learning"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.encouragementText}>
              {isCorrect
                ? "Keep up the great work! 🚀"
                : "Every mistake is a step toward mastery! 📈"
              }
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F7FA" },
  content: { padding: 20, flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#6b7280",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2A4D69",
    flex: 1,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#57C0A1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  levelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  subtitle: { fontSize: 16, color: "#4F6D7A", marginBottom: 20 },
  question: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2A4D69",
    marginBottom: 25,
    lineHeight: 28,
  },
  option: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    backgroundColor: '#57C0A1',
    borderColor: '#57C0A1',
  },
  correctIndicator: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  incorrectIndicator: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  optionLetter: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
    lineHeight: 22,
  },
  selectedOption: {
    backgroundColor: "#f0fdf4",
    borderColor: "#57C0A1",
  },
  correctOption: {
    backgroundColor: "#f0fdf4",
    borderColor: "#10b981",
  },
  correctOptionText: { color: "#065f46", fontWeight: "600" },
  incorrectOption: {
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
  },
  incorrectOptionText: { color: "#991b1b", fontWeight: "600" },
  submitButton: {
    marginTop: 25,
    backgroundColor: "#57C0A1",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: "#57C0A1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: "#374151",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  // Completed Screen Styles
  trophyIcon: {
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2A4D69',
    textAlign: 'center',
    marginBottom: 12,
  },
  completedSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  homeButton: {
    backgroundColor: '#57C0A1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  homeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  resultIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  correctIconContainer: {
    backgroundColor: '#10b981',
  },
  incorrectIconContainer: {
    backgroundColor: '#f59e0b',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  explanationBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#57C0A1',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  correctAnswer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 12,
    lineHeight: 22,
  },
  explanationText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 8,
  },
  modalButtonSuccess: {
    backgroundColor: '#10b981',
  },
  modalButtonLearn: {
    backgroundColor: '#f59e0b',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  encouragementText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});