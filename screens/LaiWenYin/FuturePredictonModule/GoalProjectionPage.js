import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { getGoalsLocal } from "../../../database/SQLite"
import { useTipManager } from '../TutorialModule/TipManager';
import FinancialTipBanner from '../TutorialModule/FinancialTipBanner';
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useUser } from '../../reuseComponet/UserContext';

export default function GoalProjectionScreen() {
  const { userId, userLevel } = useUser();
  const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);
  const [goals, setGoals] = useState([]);

  // ---- All Tip Handlers ----
  const showFutureValueTip = () => showTip('goalProjection', 'futureValue');
  const showTodayValueTip = () => showTip('goalProjection', 'todayValue');
  const showInflationAdjustedTargetTip = () => showTip('goalProjection', 'inflationAdjustedTarget');
  const showProgressBarTip = () => showTip('goalProjection', 'progressBar');
  const showGapAnalysisTip = () => showTip('goalProjection', 'gapAnalysis');
  const showStatusBadgeTip = () => showTip('goalProjection', 'statusBadge');
  const showTimelineTip = () => showTip('goalProjection', 'timeline');
  const showMonthlySavingsTip = () => showTip('goalProjection', 'monthlySavings');
  const showReturnRateTip = () => showTip('goalProjection', 'returnRate');
  const showInflationRateTip = () => showTip('goalProjection', 'inflationRate');
  const showRecommendationsTip = () => showTip('goalProjection', 'recommendations');
  const showGoalProgressTip = () => showTip('goalProjection', 'goalProgress');

  // Load goals from SQLite DB
  const loadGoals = async () => {
    try {
      const results = await getGoalsLocal(userId);
      const mapped = results.map((g) => ({
        id: g.id.toString(),
        name: g.goalName,
        targetAmount: parseFloat(g.targetAmount),
        currentAmount: parseFloat(g.currentAmount),
        monthlySave: parseFloat(g.monthlySaving || 0),
        years: calculateYearsFromDeadline(g.deadline),
        returnRate: 4,
        inflation: 3,
      }));
      setGoals(mapped);
    } catch (error) {
      console.error("❌ Error loading goals:", error);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const calculateYearsFromDeadline = (deadline) => {
    const now = new Date();
    const goalDate = new Date(deadline);
    const diff = goalDate - now;
    const years = diff / (1000 * 60 * 60 * 24 * 365);
    return years > 0 ? parseFloat(years.toFixed(1)) : 0;
  };

  const calculateProjection = (goal) => {
    const monthlyRate = goal.returnRate / 100 / 12;
    const months = goal.years * 12;

    let futureValue = goal.currentAmount * Math.pow(1 + monthlyRate, months);
    futureValue += goal.monthlySave * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    const inflationFactor = Math.pow(1 + goal.inflation / 100, goal.years);
    const realValue = futureValue / inflationFactor;

    return {
      futureValue: Math.round(futureValue),
      realValue: Math.round(realValue),
      adjustedTarget: Math.round(goal.targetAmount * inflationFactor),
      gap: Math.round(goal.targetAmount * inflationFactor - futureValue),
    };
  };

  // Enhanced Progress Bar
  const ProgressBar = ({ progress, color = '#4CAF50' }) => {
    const displayProgress = Math.min(progress, 1);
    const isOverTarget = progress > 1;
    const progressPercentage = Math.round(displayProgress * 100);
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <TouchableOpacity onPress={showGoalProgressTip} style={styles.progressLabelContainer}>
            <Text style={styles.progressLabel}>Goal Progress</Text>
            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showProgressBarTip} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { 
                  width: `${displayProgress * 100}%`, 
                  backgroundColor: isOverTarget ? '#F59E0B' : color 
                },
              ]}
            />
          </View>
        </View>
        
        {isOverTarget && (
          <View style={styles.successIndicator}>
            <Ionicons name="trophy" size={16} color="#F59E0B" />
            <Text style={styles.successText}>
              Exceeded target by {Math.round((progress - 1) * 100)}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Enhanced Projection Card
  const PredictionCard = ({ goal }) => {
    const projection = calculateProjection(goal);
    const currentProgress = goal.currentAmount / goal.targetAmount;
    const isOnTrack = projection.gap <= 0;

    return (
      <View style={styles.card}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Ionicons name="flag" size={20} color="#4CAF50" />
              <Text style={styles.goalName}>{goal.name}</Text>
            </View>
            <TouchableOpacity 
              onPress={showStatusBadgeTip} 
              style={[
                styles.statusBadge,
                isOnTrack ? styles.onTrackBadge : styles.offTrackBadge
              ]}
            >
              <Ionicons 
                name={isOnTrack ? "checkmark-circle" : "warning"} 
                size={14} 
                color={isOnTrack ? "#059669" : "#DC2626"} 
              />
              <Text style={styles.statusText}>
                {isOnTrack ? 'On Track' : 'Needs Attention'}
              </Text>
              <Ionicons name="information-circle-outline" size={12} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.targetContainer}>
            <Text style={styles.targetLabel}>Target Amount</Text>
            <Text style={styles.targetAmount}>RM {goal.targetAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Timeline Info */}
        <View style={styles.timelineContainer}>
          <TouchableOpacity onPress={showTimelineTip} style={styles.timelineItem}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <View style={styles.timelineTextContainer}>
              <Text style={styles.timelineLabel}>Timeline</Text>
              <Text style={styles.timelineValue}>{goal.years} years</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.timelineDivider} />
          <TouchableOpacity onPress={showMonthlySavingsTip} style={styles.timelineItem}>
            <Ionicons name="cash" size={16} color="#6B7280" />
            <View style={styles.timelineTextContainer}>
              <Text style={styles.timelineLabel}>Monthly Save</Text>
              <Text style={styles.timelineValue}>RM {goal.monthlySave.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <ProgressBar progress={currentProgress} />

        {/* Projection Section */}
        <View style={styles.projectionSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Financial Projection</Text>
              <Text style={styles.sectionSubtitle}>Accounting for inflation and returns</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard
              label="Future Value"
              value={`RM ${projection.futureValue.toLocaleString()}`}
              description={`With ${goal.returnRate}% returns`}
              onPress={showFutureValueTip}
              icon="trending-up"
              showInfoIcon={true}
            />
            <MetricCard
              label="Today's Value"
              value={`RM ${projection.realValue.toLocaleString()}`}
              description="After inflation"
              onPress={showTodayValueTip}
              icon="today"
              showInfoIcon={true}
            />
            <MetricCard
              label="Adjusted Target"
              value={`RM ${projection.adjustedTarget.toLocaleString()}`}
              description="Future cost"
              onPress={showInflationAdjustedTargetTip}
              icon="target"
              showInfoIcon={true}
            />
            <MetricCard
              label="Gap Analysis"
              value={`RM ${Math.abs(projection.gap).toLocaleString()}`}
              description={isOnTrack ? 'Surplus' : 'Shortfall'}
              onPress={showGapAnalysisTip}
              icon="analytics"
              isOnTrack={isOnTrack}
              showInfoIcon={true}
            />
          </View>

          {/* Return Rate and Inflation Info */}
          <View style={styles.assumptionsContainer}>
            <TouchableOpacity onPress={showReturnRateTip} style={styles.assumptionItem}>
              <Ionicons name="trending-up" size={14} color="#6B7280" />
              <Text style={styles.assumptionText}>Assumed return: {goal.returnRate}% annually</Text>
              <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={showInflationRateTip} style={styles.assumptionItem}>
              <Ionicons name="trending-down" size={14} color="#6B7280" />
              <Text style={styles.assumptionText}>Assumed inflation: {goal.inflation}% annually</Text>
              <Ionicons name="information-circle-outline" size={12} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationBox}>
          <TouchableOpacity onPress={showRecommendationsTip} style={styles.recommendationHeader}>
            <View style={styles.recommendationIcon}>
              <Ionicons name="bulb" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.recommendationTitle}>Recommendations</Text>
            <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {projection.gap > 0 ? (
            <View style={styles.recommendationList}>
              <RecommendationItem 
                text={`Increase monthly savings by RM ${Math.round(projection.gap / (goal.years * 12))}`}
                icon="add-circle"
              />
              <RecommendationItem 
                text={`Explore investment options with ${goal.returnRate + 2}% potential returns`}
                icon="analytics"
              />
              <RecommendationItem 
                text={`Consider extending timeline by ${Math.ceil(projection.gap / (goal.monthlySave * 12))} year(s)`}
                icon="time"
              />
            </View>
          ) : (
            <View style={styles.successMessage}>
              <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
              <View style={styles.successTextContainer}>
                <Text style={styles.successTitle}>Excellent Progress!</Text>
                <Text style={styles.successText}>You're on track to achieve your goal</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Reusable Metric Card Component
  const MetricCard = ({ label, value, description, onPress, icon, isOnTrack, showInfoIcon = true }) => (
    <View style={styles.metricItem}>
      <TouchableOpacity onPress={onPress} style={styles.metricHeader}>
        <Ionicons name={icon} size={16} color="#6B7280" />
        <Text style={styles.metricLabel}>{label}</Text>
        {showInfoIcon && <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />}
      </TouchableOpacity>
      <Text style={[
        styles.metricValue,
        label === "Gap Analysis" && (isOnTrack ? styles.positiveGap : styles.negativeGap)
      ]}>
        {value}
      </Text>
      <Text style={styles.metricDescription}>{description}</Text>
    </View>
  );

  // Reusable Recommendation Item Component
  const RecommendationItem = ({ text, icon }) => (
    <View style={styles.recommendationItem}>
      <Ionicons name={icon} size={16} color="#4CAF50" />
      <Text style={styles.recommendationText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="flag-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateTitle}>No Goals Found</Text>
            <Text style={styles.emptyStateText}>
              Create financial goals to see detailed projections and track your progress
            </Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <PredictionCard key={goal.id} goal={goal} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    margin: 24,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  goalsList: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerSection: {
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  goalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  onTrackBadge: {
    backgroundColor: '#F0FDF4',
  },
  offTrackBadge: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  targetLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  targetAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  timelineContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  timelineItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressContainer: {
    marginBottom: 28,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  infoButton: {
    padding: 4,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
  },
  successText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  projectionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricItem: {
    width: '50%',
    padding: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: '#94A3B8',
  },
  assumptionsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 8,
  },
  assumptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assumptionText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  positiveGap: {
    color: '#059669',
  },
  negativeGap: {
    color: '#DC2626',
  },
  recommendationBox: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  recommendationList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    flex: 1,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  successText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
});