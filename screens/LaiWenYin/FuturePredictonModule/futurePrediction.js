import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import * as Progress from "react-native-progress";

const screenWidth = Dimensions.get("window").width - 40;

export default function FuturePredictionScreen() {
  const [data, setData] = useState({
    savings: 50000,
    expenses: 3000,
    incomeGrowth: 5,
    inflation: 3,
    years: 10,
  });

  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("projection");

  const calculateProjection = () => {
    const { savings, expenses, incomeGrowth, inflation, years } = data;

    if (!savings || !years) {
      Alert.alert("Missing Data", "Please enter your savings and timeline");
      return;
    }

    // NEW FORMULA: Future Savings = (Current Income − Current Expenses) × (1 + Income Growth Rate)^t 
    // − (Expected Future Expenses × (1 + Inflation Rate)^t)
    
    // For this implementation, we'll use savings as "current income - current expenses"
    // So: currentIncome - currentExpenses = savings (simplified assumption)
    const currentNetSavings = savings; // This represents (Income - Expenses)
    
    const yearlyData = [];
    const inflationAdjustedData = [];
    
    for (let i = 1; i <= years; i++) {
      // Apply the new formula
      const futureIncomeComponent = currentNetSavings * Math.pow(1 + incomeGrowth/100, i);
      const futureExpenseComponent = expenses * Math.pow(1 + inflation/100, i);
      const futureNetSavings = futureIncomeComponent - futureExpenseComponent;
      
      yearlyData.push(parseFloat(futureNetSavings.toFixed(2)));
      
      // For inflation adjusted data (purchasing power)
      const inflationAdjustedValue = futureNetSavings / Math.pow(1 + inflation/100, i);
      inflationAdjustedData.push(parseFloat(inflationAdjustedValue.toFixed(2)));
    }

    const futureSavings = yearlyData[years - 1];
    const inflationLoss = futureSavings - inflationAdjustedData[years - 1];

    // Calculate financial health metrics
    const monthsOfExpenses = savings / expenses;
    const targetEmergencyFund = expenses * 6;
    const currentEmergencyFund = Math.min(savings, targetEmergencyFund);
    const realGrowthRate = (incomeGrowth - inflation) / 100;

    setResult({
      futureSavings: parseFloat(futureSavings.toFixed(2)),
      yearlyData,
      inflationAdjustedData,
      emergencyGoal: parseFloat(currentEmergencyFund.toFixed(2)),
      emergencyTarget: parseFloat(targetEmergencyFund.toFixed(2)),
      monthsOfExpenses: parseFloat((monthsOfExpenses).toFixed(2)),
      inflationLoss: parseFloat(inflationLoss.toFixed(2)),
      financialHealth: calculateFinancialHealth(monthsOfExpenses, realGrowthRate),
      recommendation: generateRecommendation(monthsOfExpenses, realGrowthRate, inflationLoss),
    });
  };
const calculateFinancialHealth = (monthsOfExpenses, growthRate) => {
  let score = 0;
  
  // Emergency fund score (max 50 points)
  score += Math.min(50, (monthsOfExpenses / 6) * 50);
  
  // Growth rate score (max 30 points)
  if (growthRate > 0.02) score += 30;
  else if (growthRate > 0) score += 20;
  else if (growthRate > -0.02) score += 10;
  
  // Savings amount score (max 20 points)
  if (data.savings > data.expenses * 12) score += 20;
  else if (data.savings > data.expenses * 6) score += 15;
  else if (data.savings > data.expenses * 3) score += 10;
  
  return Math.round(Math.min(100, score)); // Added Math.round() here
};
  const generateRecommendation = (monthsOfExpenses, growthRate, inflationLoss) => {
    const recommendations = [];
    
    if (monthsOfExpenses < 3) {
      recommendations.push("🚨 Build emergency fund to cover 3-6 months of expenses");
    } else if (monthsOfExpenses < 6) {
      recommendations.push("📈 Continue building emergency fund to 6 months coverage");
    }
    
    if (growthRate < 0.02) {
      recommendations.push("💡 Consider investments with returns above inflation rate");
    }
    
    if (inflationLoss > data.savings * 0.1) {
      recommendations.push("🛡️ Protect savings from inflation with diversified investments");
    }
    
    if (data.incomeGrowth - data.inflation < 2) {
      recommendations.push("🎯 Focus on increasing income growth above inflation");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ Excellent financial health! Maintain your current strategy");
    }
    
    return recommendations;
  };

  const FinancialHealthMeter = ({ score }) => {
    let color, label;
    
    if (score >= 80) { color = "#27ae60"; label = "Excellent"; }
    else if (score >= 60) { color = "#3498db"; label = "Good"; }
    else if (score >= 40) { color = "#f39c12"; label = "Fair"; }
    else { color = "#e74c3c"; label = "Needs Improvement"; }
    
    return (
      <View style={styles.healthMeter}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthLabel}>Financial Health Score</Text>
          <Text style={[styles.healthScore, { color }]}>{score}/100</Text>
        </View>
        <Progress.Bar
          progress={score / 100}
          width={null}
          height={12}
          color={color}
          unfilledColor="#ecf0f1"
          borderWidth={0}
          borderRadius={6}
        />
        <Text style={[styles.healthStatus, { color }]}>{label}</Text>
      </View>
    );
  };

  const InflationImpactCard = () => {
    const inflationLoss = result?.inflationLoss || 0;
    const purchasingPower = ((result?.futureSavings - inflationLoss) / result?.futureSavings) * 100;
    
    return (
      <View style={styles.card}>
        <Text style={styles.subtitle}>🪙 Inflation Impact Analysis</Text>
        
        <View style={styles.inflationGrid}>
          <View style={styles.inflationItem}>
            <Text style={styles.inflationLabel}>Future Value</Text>
            <Text style={styles.inflationValue}>RM {result?.futureSavings?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
          </View>
          
          <View style={styles.inflationItem}>
            <Text style={styles.inflationLabel}>Value Lost to Inflation</Text>
            <Text style={[styles.inflationValue, styles.lossValue]}>
              -RM {inflationLoss?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </Text>
          </View>
          
          <View style={styles.inflationItem}>
            <Text style={styles.inflationLabel}>Future Purchasing Power</Text>
            <Text style={styles.inflationValue}>
              RM {(result?.futureSavings - inflationLoss)?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </Text>
          </View>
          
          <View style={styles.inflationItem}>
            <Text style={styles.inflationLabel}>Power Remaining</Text>
            <Text style={styles.inflationValue}>
              {purchasingPower.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const RiskAssessmentCard = () => {
    const riskFactors = [
      { label: "Emergency Coverage", value: result?.monthsOfExpenses || 0, optimal: 6 },
      { label: "Real Growth Rate", value: (data.incomeGrowth - data.inflation).toFixed(2) + "%", optimal: ">2%" },
      { label: "Inflation Impact", value: result?.inflationLoss ? "High" : "Low", optimal: "Low" },
    ];
    
    return (
      <View style={styles.card}>
        <Text style={styles.subtitle}>📊 Risk Assessment</Text>
        
        {riskFactors.map((factor, index) => (
          <View key={index} style={styles.riskFactor}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskLabel}>{factor.label}</Text>
              <Text style={styles.riskValue}>{factor.value}</Text>
            </View>
            <Text style={styles.riskOptimal}>Optimal: {factor.optimal}</Text>
            {factor.label === "Emergency Coverage" && (
              <Progress.Bar
                progress={Math.min(1, factor.value / factor.optimal)}
                width={null}
                height={6}
                color={factor.value >= factor.optimal ? "#27ae60" : "#f39c12"}
                unfilledColor="#ecf0f1"
                borderWidth={0}
                borderRadius={3}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Financial Future Projection</Text>
      <Text style={styles.subtitle}>Plan your financial journey </Text>

      {/* Calculator Card */}
      <View style={styles.card}>
        <Text style={styles.title}>📈 Projection Calculator</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputColumn}>
            <Text style={styles.label}>Current Savings (RM)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={data.savings.toString()}
              onChangeText={(t) => setData({ ...data, savings: parseFloat(t) || 0 })}
            />
          </View>
          
          <View style={styles.inputColumn}>
            <Text style={styles.label}>Monthly Expenses (RM)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={data.expenses.toString()}
              onChangeText={(t) => setData({ ...data, expenses: parseFloat(t) || 0 })}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputColumn}>
            <Text style={styles.label}>Income Growth (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={data.incomeGrowth.toString()}
              onChangeText={(t) => setData({ ...data, incomeGrowth: parseFloat(t) || 0 })}
            />
          </View>
          
          <View style={styles.inputColumn}>
            <Text style={styles.label}>Inflation Rate (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={data.inflation.toString()}
              onChangeText={(t) => setData({ ...data, inflation: parseFloat(t) || 0 })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Projection Timeline (Years)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={data.years.toString()}
            onChangeText={(t) => setData({ ...data, years: parseInt(t) || 0 })}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={calculateProjection}>
          <Text style={styles.buttonText}>Generate Projection</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <>
          {/* Financial Health Overview */}
          <FinancialHealthMeter score={result.financialHealth} />

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "projection" && styles.activeTab]}
              onPress={() => setActiveTab("projection")}
            >
              <Text style={[styles.tabText, activeTab === "projection" && styles.activeTabText]}>
                Growth Projection
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "analysis" && styles.activeTab]}
              onPress={() => setActiveTab("analysis")}
            >
              <Text style={[styles.tabText, activeTab === "analysis" && styles.activeTabText]}>
                Risk Analysis
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "projection" ? (
            <>
              {/* Savings Growth Projection */}
              <View style={styles.card}>
                <Text style={styles.subtitle}>Future Value Projection</Text>
                
                <LineChart
                  data={{
                    labels: result.yearlyData.map((_, i) => 
                      i === 0 || i === Math.floor(data.years/2) || i === data.years - 1 ? `Y${i+1}` : ''
                    ),
                    datasets: [
                      {
                        data: result.yearlyData,
                        color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                        strokeWidth: 3,
                      },
                      {
                        data: result.inflationAdjustedData,
                        color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={screenWidth}
                  height={240}
                  yAxisLabel="RM"
                  chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#f8f9fa",
                    backgroundGradientTo: "#f8f9fa",
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "4", strokeWidth: "2" },
                  }}
                  bezier
                  style={styles.chart}
                />

                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#2ecc71" }]} />
                    <Text style={styles.legendText}>Projected Growth</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: "#e74c3c" }]} />
                    <Text style={styles.legendText}>Inflation Adjusted</Text>
                  </View>
                </View>

                <View style={styles.resultBox}>
                  <Text style={styles.resultText}>In {data.years} years, you'll have:</Text>
                  <Text style={styles.resultValue}>
                    RM{result.futureSavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </Text>
                  <Text style={styles.resultNote}>
                    {result.futureSavings > data.savings * 2 ? "🚀 Strong growth trajectory" : 
                     "📊 Moderate growth - consider optimization"}
                  </Text>
                </View>
              </View>

              {/* Emergency Fund Progress */}
              <View style={styles.card}>
                <View style={styles.progressHeader}>
                  <Text style={styles.subtitle}>🛡️ Emergency Fund</Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round((result.emergencyGoal / result.emergencyTarget) * 100)}%
                  </Text>
                </View>
                
                <Text style={styles.goalValue}>
                  RM{result.emergencyGoal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / RM{result.emergencyTarget.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </Text>
                
                <Progress.Bar
                  progress={result.emergencyGoal / result.emergencyTarget}
                  width={null}
                  height={16}
                  color={result.emergencyGoal >= result.emergencyTarget ? "#27ae60" : "#3498db"}
                  unfilledColor="#ecf0f1"
                  borderWidth={0}
                  borderRadius={8}
                />
                
                <Text style={styles.coverageText}>
                  Covers {result.monthsOfExpenses} months of expenses
                  {result.monthsOfExpenses >= 6 ? " ✅" : " ⚠️"}
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Risk Analysis View */}
              <InflationImpactCard />
              <RiskAssessmentCard />
            </>
          )}

          {/* AI Recommendations */}
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>💡 Smart Recommendations</Text>
            {result.recommendation.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* Key Metrics Summary */}
          <View style={styles.metricsCard}>
            <Text style={styles.subtitle}>📋 Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{result.monthsOfExpenses}</Text>
                <Text style={styles.metricLabel}>Months Covered</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {(data.incomeGrowth - data.inflation).toFixed(2)}%
                </Text>
                <Text style={styles.metricLabel}>Real Growth</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {Math.round((result.emergencyGoal / result.emergencyTarget) * 100)}%
                </Text>
                <Text style={styles.metricLabel}>Emergency Fund</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {result.financialHealth}
                </Text>
                <Text style={styles.metricLabel}>Health Score</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#2c3e50", 
    marginBottom: 16 
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inputColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputGroup: { 
    marginBottom: 16 
  },
  label: { 
    color: "#2c3e50", 
    fontSize: 13,  
    fontWeight: "600",
    marginBottom: 6 
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f8f9fa",
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#27ae60",
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: "center",
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },
  chart: { 
    marginVertical: 10, 
    borderRadius: 12 
  },
  healthMeter: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  healthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  healthScore: {
    fontSize: 18,
    fontWeight: "700",
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ecf0f1",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  activeTabText: {
    color: "#2c3e50",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  resultBox: { 
    alignItems: "center", 
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  resultText: { 
    color: "#7f8c8d", 
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#27ae60",
    marginBottom: 4,
  },
  resultNote: {
    fontSize: 12,
    color: "#95a5a6",
    fontStyle: "italic",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27ae60",
  },
  goalValue: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  coverageText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 8,
    fontWeight: "500",
  },
  inflationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  inflationItem: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  inflationLabel: {
    fontSize: 11,
    color: "#7f8c8d",
    fontWeight: "500",
    marginBottom: 4,
  },
  inflationValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
  },
  lossValue: {
    color: "#e74c3c",
  },
  riskFactor: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",
  },
  riskValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#27ae60",
  },
  riskOptimal: {
    fontSize: 11,
    color: "#7f8c8d",
    marginBottom: 6,
  },
  recommendationCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1976d2",
    marginBottom: 12,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: "#2c3e50",
    lineHeight: 18,
    fontWeight: "500",
  },
  metricsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  metricItem: {
    width: "48%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "#7f8c8d",
    fontWeight: "600",
    textAlign: "center",
  },
});