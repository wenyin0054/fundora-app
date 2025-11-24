import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const GoalProjectionScreen = ({navigation}) => {
  const [goals, setGoals] = useState([
    {
      id: 1,
      name: '🏠 Dream House Down Payment',
      targetAmount: 100000,
      currentAmount: 45000,
      monthlySave: 1500,
      years: 5,
      returnRate: 4,
      inflation: 3,
    },
    {
      id: 2,
      name: '🚗 Car Down Payment',
      targetAmount: 50000,
      currentAmount: 10000,
      monthlySave: 500,
      years: 5,
      returnRate: 4,
      inflation: 3,
    },
  ]);

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    monthlySave: '',
    years: '',
  });

  const calculateProjection = (goal) => {
    const monthlyRate = goal.returnRate / 100 / 12;
    const months = goal.years * 12;
    
    // Future value calculation
    let futureValue = goal.currentAmount * Math.pow(1 + monthlyRate, months);
    futureValue += goal.monthlySave * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    
    // Adjust for inflation
    const inflationFactor = Math.pow(1 + goal.inflation / 100, goal.years);
    const realValue = futureValue / inflationFactor;
    
    return {
      futureValue: Math.round(futureValue),
      realValue: Math.round(realValue),
      adjustedTarget: Math.round(goal.targetAmount * inflationFactor),
      gap: Math.round(goal.targetAmount * inflationFactor - futureValue),
    };
  };

  const ProgressBar = ({ progress, color = '#4CAF50' }) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
    </View>
  );

  const PredictionCard = ({ goal }) => {
    const projection = calculateProjection(goal);
    const currentProgress = goal.currentAmount / goal.targetAmount;

    return (
      <View style={styles.card}>
        <Text style={styles.goalName}>{goal.name}</Text>
        <Text style={styles.goalTarget}>
          Target: RM {goal.targetAmount.toLocaleString()} (in {goal.years} years)
        </Text>
        
        <ProgressBar progress={currentProgress} />
        
        <View style={styles.predictionSection}>
          <Text style={styles.sectionTitle}>📊 Prediction Results</Text>
          
          <View style={styles.predictionItem}>
            <Text style={styles.predictionLabel}>• Current Progress:</Text>
            <Text style={styles.predictionValue}>
              RM {projection.futureValue.toLocaleString()} in {goal.years} years
            </Text>
          </View>
          
          <View style={styles.predictionItem}>
            <Text style={styles.predictionLabel}>• After Inflation:</Text>
            <Text style={styles.predictionValue}>
              RM {projection.realValue.toLocaleString()} (today's value)
            </Text>
          </View>
          
          <View style={styles.predictionItem}>
            <Text style={styles.predictionLabel}>• Adjusted Target Needed:</Text>
            <Text style={styles.predictionValue}>
              RM {projection.adjustedTarget.toLocaleString()}
            </Text>
          </View>

          <View style={[
            styles.gapIndicator,
            projection.gap > 0 ? styles.gapNegative : styles.gapPositive
          ]}>
            <Text style={styles.gapText}>
              {projection.gap > 0 ? 'Shortfall: ' : 'Surplus: '}
              RM {Math.abs(projection.gap).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>💡 Recommended Actions:</Text>
          {projection.gap > 0 ? (
            <>
              <Text style={styles.recommendationItem}>
                • Increase monthly savings by RM {Math.round(projection.gap / (goal.years * 12))}
              </Text>
              <Text style={styles.recommendationItem}>
                • Improve investment return to {Math.round(goal.returnRate + 2)}%
              </Text>
              <Text style={styles.recommendationItem}>
                • Extend timeline by 1-2 years
              </Text>
            </>
          ) : (
            <Text style={styles.recommendationItem}>
              ✅ You're on track! Consider increasing your target or timeline.
            </Text>
          )}
        </View>
      </View>
    );
  };

  const addNewGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.currentAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const goal = {
      id: goals.length + 1,
      name: newGoal.name,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: parseFloat(newGoal.currentAmount),
      monthlySave: parseFloat(newGoal.monthlySave) || 0,
      years: parseFloat(newGoal.years) || 5,
      returnRate: 4,
      inflation: 3,
    };

    setGoals([...goals, goal]);
    setNewGoal({ name: '', targetAmount: '', currentAmount: '', monthlySave: '', years: '' });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🎯 Goal Projection</Text>
      <Text style={styles.subtitle}>
        Your financial GPS - see if you're on track to reach your goals!
      </Text>

      {/* Add New Goal Form */}
      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>Add New Goal</Text>
        <TextInput
          style={styles.input}
          placeholder="Goal Name (e.g., Vacation Fund)"
          value={newGoal.name}
          onChangeText={(text) => setNewGoal({...newGoal, name: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Target Amount (RM)"
          keyboardType="numeric"
          value={newGoal.targetAmount}
          onChangeText={(text) => setNewGoal({...newGoal, targetAmount: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Current Savings (RM)"
          keyboardType="numeric"
          value={newGoal.currentAmount}
          onChangeText={(text) => setNewGoal({...newGoal, currentAmount: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Monthly Savings (RM)"
          keyboardType="numeric"
          value={newGoal.monthlySave}
          onChangeText={(text) => setNewGoal({...newGoal, monthlySave: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Timeline (Years)"
          keyboardType="numeric"
          value={newGoal.years}
          onChangeText={(text) => setNewGoal({...newGoal, years: text})}
        />
        <TouchableOpacity style={styles.addButton} onPress={addNewGoal}>
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Goals List */}
      {goals.map(goal => (
        <PredictionCard key={goal.id} goal={goal} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7f8c8d',
    minWidth: 30,
  },
  predictionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  predictionLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  gapIndicator: {
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  gapNegative: {
    backgroundColor: '#ffebee',
  },
  gapPositive: {
    backgroundColor: '#e8f5e8',
  },
  gapText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recommendationBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#2c3e50',
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GoalProjectionScreen;