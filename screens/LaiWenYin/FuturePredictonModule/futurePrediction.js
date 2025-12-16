import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as Progress from "react-native-progress";
import { useUser } from "../../reuseComponet/UserContext";
import { useTipManager } from "../TutorialModule/TipManager";
import FinancialTipBanner from "../TutorialModule/FinancialTipBanner";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { Ionicons } from '@expo/vector-icons';
import { getCurrentMonthlyIncome, getIncomeGrowthRate, getExpensesLocal } from "../../../database/SQLite"
import { LineChart } from "react-native-chart-kit";
import { expandPeriodicExpenses } from "../ExpenseAnalysisModule/expandPeriodic"

const screenWidth = Dimensions.get("window").width;

// Validation limits
const VALIDATION_LIMITS = {
  INCOME: {
    MIN: 0,
    MAX: 100000,
  },
  EXPENSES: {
    MIN: 0,
    MAX: 100000,
  },
  YEARS: {
    MIN: 1,
    MAX: 50,
  },
  INCOME_GROWTH: {
    MIN: 0,
    MAX: 50,
  },
  INFLATION: {
    MIN: 0,
    MAX: 30,
  }
};


export default function FuturePredictionScreen() {
  const [result, setResult] = useState(null);
  const { userLevel, userId } = useUser();
  const [data, setData] = useState({
    currentIncome: "",
    currentExpenses: "",
    incomeGrowth: 10,
    inflation: 2.5,
    years: 5,
  });

  // Auto values and sources
  const [autoIncomeGrowth, setAutoIncomeGrowth] = useState(10);
  const [autoInflation, setAutoInflation] = useState(2.5);
  const [incomeGrowthSource, setIncomeGrowthSource] = useState("auto");
  const [inflationSource, setInflationSource] = useState("auto");
  const [incomeGrowthCustom, setIncomeGrowthCustom] = useState(false);
  const [inflationCustom, setInflationCustom] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  //String() makes input editable
  const loadData = async () => {
    try {
      /** ---------------------------
       * 1. Load Current Monthly Income
       * -------------------------- */
      const income = await getCurrentMonthlyIncome(userId);

      setData(prev => ({
        ...prev,
        currentIncome: income ? String(Number(income)) : "0",
      }));


      /** ---------------------------
       * 2. Load ALL Expenses
       * -------------------------- */
      /** ----- FINAL Monthly Expense Extraction ----- */
      let rawExpenses = await getExpensesLocal(userId);

      // convert transaction → expenses
      rawExpenses = rawExpenses.map(exp => {
        if (exp.tag === "transaction") {
          return { ...exp, typeLabel: "expense" };
        }
        return exp;
      });

      // split periodic expenses
      let expanded = expandPeriodicExpenses(rawExpenses);

      // filter current month only
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      expanded = expanded.filter(exp => {
        const d = new Date(exp.date);
        const isExpense = exp.typeLabel !== "income";
        return isExpense && d.getFullYear() === y && d.getMonth() === m;
      });

      // sum & ensure non-zero
      const monthlyExpense = Math.max(
        expanded.reduce((s, e) => s + Number(e.amount), 0),
        1
      );

      setData(prev => ({
        ...prev,
        currentExpenses: String(monthlyExpense.toFixed(2)),
      }));



      /** ---------------------------
       * 3. Auto Income Growth using snapshots
       * -------------------------- */

      try {
        const growthObj = await getIncomeGrowthRate(userId);

        if (growthObj && typeof growthObj.rate === "number") {
          const autoGrowth = Number((growthObj.rate * 100).toFixed(1));
          setAutoIncomeGrowth(autoGrowth);
          setData(prev => ({
            ...prev,
            incomeGrowth: autoGrowth,
          }));
          setIncomeGrowthSource("auto");
        } else {
          // fallback (Malaysia avg)
          setAutoIncomeGrowth(10);
          setData(prev => ({
            ...prev,
            incomeGrowth: 10,
          }));
          setIncomeGrowthSource("auto");
        }

      } catch (e) {
        console.log("Income growth auto-load failed:", e);
        setAutoIncomeGrowth(10);
        setData(prev => ({
          ...prev,
          incomeGrowth: 10,
        }));
        setIncomeGrowthSource("auto");
      }



      /** ---------------------------
       * 4. Auto Inflation Baseline (Malaysia CPI)
       * -------------------------- */
      setData(prev => ({
        ...prev,
        inflation: 2.5
      }));
      setAutoInflation(2.5);
      setInflationSource("auto");

    } catch (err) {
      console.log("Failed loading data:", err);
    }
  };


  const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);
  const showFuturePredictionCalculatorTips = () => {
    showTip('futurePrediction', 'calculator');
  };
  const showKeyMetricsTips = () => {
    showTip('futurePrediction', 'keyMetrics');
  };
  const showFinancialHealthTips = () => {
    showTip('futurePrediction', 'financialHealth');
  };
  const showSavingsComparisonTips = () => {
    showTip('futurePrediction', 'SavingsComparison');
  };
  const showYearlyBreakdownTips = () => {
    showTip('futurePrediction', 'YearlyBreakdown');
  };
  const showProjectionDiagramTips = () => {
    showTip('futurePrediction', 'projectionChartExplanation');
  };

  const [calculationLoading, setCalculationLoading] = useState(false);
  const [incomeError, setIncomeError] = useState('');
  const [expensesError, setExpensesError] = useState('');
  const [yearsError, setYearsError] = useState('');
  const [incomeGrowthError, setIncomeGrowthError] = useState('');
  const [inflationError, setInflationError] = useState('');

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const toastTimeoutRef = useRef(null);
  const cardShakeAnim = useRef(new Animated.Value(0)).current;

  // Dropdown modals
  const [incomeGrowthModalVisible, setIncomeGrowthModalVisible] = useState(false);
  const [inflationModalVisible, setInflationModalVisible] = useState(false);

  // Professional presets - based on Malaysia context
  const incomeGrowthPresets = [
    { id: 'auto', label: "Auto (System Calculated)", value: "auto" },
    { id: '1', label: "Conservative (5%)", value: 5 },
    { id: '2', label: "Malaysia Average (10%)", value: 10 },
    { id: '3', label: "Aggressive (15%)", value: 15 },
    { id: '4', label: "High Growth (20%)", value: 20 },
    { id: '5', label: "Custom", value: "custom" },
  ];

  const inflationRatePresets = [
    { id: 'auto', label: "Auto (System Calculated)", value: "auto" },
    { id: '1', label: "Low Inflation (1.5%)", value: 1.5 },
    { id: '2', label: "Malaysia Average (2.5%)", value: 2.5 },
    { id: '3', label: "High Inflation (4%)", value: 4 },
    { id: '4', label: "Very High Inflation (6%)", value: 6 },
    { id: '5', label: "Custom", value: "custom" },
  ];

  // Toast function
  const showToast = (message, type = 'error', duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, duration);
  };

  // Shake animation
  const runShake = (animRef) => {
    animRef.setValue(0);
    Animated.sequence([
      Animated.timing(animRef, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(animRef, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Validation functions
  const validateIncome = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < VALIDATION_LIMITS.INCOME.MIN) return `Income cannot be less than RM${VALIDATION_LIMITS.INCOME.MIN}`;
    if (numValue > VALIDATION_LIMITS.INCOME.MAX) return `Income cannot exceed RM${VALIDATION_LIMITS.INCOME.MAX.toLocaleString()}`;
    return null;
  };

  const validateExpenses = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < VALIDATION_LIMITS.EXPENSES.MIN) return `Expenses cannot be less than RM${VALIDATION_LIMITS.EXPENSES.MIN}`;
    if (numValue > VALIDATION_LIMITS.EXPENSES.MAX) return `Expenses cannot exceed RM${VALIDATION_LIMITS.EXPENSES.MAX.toLocaleString()}`;
    return null;
  };

  const validateYears = (value) => {
    const numValue = parseInt(value) || 0;
    if (numValue < VALIDATION_LIMITS.YEARS.MIN) return `Years cannot be less than ${VALIDATION_LIMITS.YEARS.MIN}`;
    if (numValue > VALIDATION_LIMITS.YEARS.MAX) return `Years cannot exceed ${VALIDATION_LIMITS.YEARS.MAX}`;
    return null;
  };

  const validateIncomeGrowth = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < VALIDATION_LIMITS.INCOME_GROWTH.MIN) return `Growth rate cannot be less than ${VALIDATION_LIMITS.INCOME_GROWTH.MIN}%`;
    if (numValue > VALIDATION_LIMITS.INCOME_GROWTH.MAX) return `Growth rate cannot exceed ${VALIDATION_LIMITS.INCOME_GROWTH.MAX}%`;
    return null;
  };

  const validateInflation = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < VALIDATION_LIMITS.INFLATION.MIN) return `Inflation rate cannot be less than ${VALIDATION_LIMITS.INFLATION.MIN}%`;
    if (numValue > VALIDATION_LIMITS.INFLATION.MAX) return `Inflation rate cannot exceed ${VALIDATION_LIMITS.INFLATION.MAX}%`;
    return null;
  };

  // Dropdown selection functions
  const selectIncomeGrowth = (item) => {
    if (item.value === "auto") {
      setData(prev => ({ ...prev, incomeGrowth: autoIncomeGrowth }));
      setIncomeGrowthSource("auto");
      setIncomeGrowthCustom(false);
    } else if (item.value === "custom") {
      setIncomeGrowthCustom(true);
      setIncomeGrowthSource("manual");
      setData(prev => ({ ...prev, incomeGrowth: 0 }));
    } else {
      setData(prev => ({ ...prev, incomeGrowth: item.value }));
      setIncomeGrowthSource("manual");
      setIncomeGrowthCustom(false);
    }
    setIncomeGrowthModalVisible(false);
  };

  const selectInflation = (item) => {
    if (item.value === "auto") {
      setData(prev => ({ ...prev, inflation: autoInflation }));
      setInflationSource("auto");
      setInflationCustom(false);
    } else if (item.value === "custom") {
      setInflationCustom(true);
      setInflationSource("manual");
      setData(prev => ({ ...prev, inflation: 0 }));
    } else {
      setData(prev => ({ ...prev, inflation: item.value }));
      setInflationSource("manual");
      setInflationCustom(false);
    }
    setInflationModalVisible(false);
  };

  // Update functions
  const updateCurrentIncome = (value) => {
    // allow user to clear input
    if (value === "") {
      setData(prev => ({ ...prev, currentIncome: "" }));
      setIncomeError("");
      return;
    }

    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setData(prev => ({ ...prev, currentIncome: value })); // keep raw string
      if (incomeError) setIncomeError("");
    }
  };

  const updateCurrentExpenses = (value) => {
    if (value === "") {
      setData(prev => ({ ...prev, currentExpenses: "" }));
      setExpensesError("");
      return;
    }

    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setData(prev => ({ ...prev, currentExpenses: value }));
      if (expensesError) setExpensesError("");
    }
  };


  const updateYears = (value) => {
    if (value === "") {
      setData({ ...data, years: "" });
      setYearsError('');
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setData({ ...data, years: numValue });
        if (yearsError) setYearsError('');
      }
    }
  };


  // Core calculation function - implements your original formula
  const calculateProjection = async () => {
    // Validate inputs
    const incomeError = validateIncome(data.currentIncome);
    const expensesError = validateExpenses(data.currentExpenses);
    const yearsError = validateYears(data.years);
    const incomeGrowthError = validateIncomeGrowth(data.incomeGrowth);
    const inflationError = validateInflation(data.inflation);

    setIncomeError(incomeError);
    setExpensesError(expensesError);
    setYearsError(yearsError);
    setIncomeGrowthError(incomeGrowthError);
    setInflationError(inflationError);


    const errors = [incomeError, expensesError, yearsError, incomeGrowthError, inflationError]
      .filter(e => e !== null);

    if (errors.length > 0) {
      runShake(cardShakeAnim);
      showToast("Please fix the errors before generating projection", "error");
      return;
    }

    setCalculationLoading(true);
    await new Promise(r => setTimeout(r, 600));

    try {
      const income = Number(data.currentIncome);
      const expenses = Number(data.currentExpenses);
      const growth = Number(data.incomeGrowth) / 100;
      const inflation = Number(data.inflation) / 100;
      const years = Number(data.years);

      let yearlyBreakdown = [];

      for (let year = 1; year <= years; year++) {

        const currentNetSavings = income - expenses; // monthly net savings

        // future net savings based on your FYP formula
        const futureNetSavings =
          currentNetSavings * Math.pow(1 + growth, year) -
          expenses * Math.pow(1 + inflation, year);

        const futureIncome =
          income * Math.pow(1 + growth, year); // still used for display

        const futureExpenses =
          expenses * Math.pow(1 + inflation, year);

        yearlyBreakdown.push({
          year,
          futureIncome: Number(futureIncome.toFixed(2)),
          futureExpenses: Number(futureExpenses.toFixed(2)),
          futureSavings: Number(futureNetSavings.toFixed(2)),
        });
      }


      /** FINAL YEAR RESULT */
      const last = yearlyBreakdown[yearlyBreakdown.length - 1];

      /** REAL (INFLATION-ADJUSTED) VALUE LOSS */
      const inflationLoss =
        last.futureExpenses - expenses; // cost increase due to inflation


      /** MONTHS OF COVERAGE (Realistic emergency approximation) */
      const monthlySurplus = Math.max(income - expenses, 0);
      const monthsOfExpenses =
        monthlySurplus === 0 ? 0 : Number((monthlySurplus / expenses).toFixed(1));

      /** EMERGENCY FUND GOAL */
      // emergency fund target (6 months expenses)
      const emergencyTarget = expenses * 6;

      // how many months needed to build full emergency fund
      let monthsToEmergencyFund = 0;
      if (monthlySurplus > 0) {
        monthsToEmergencyFund = emergencyTarget / monthlySurplus;
      } else {
        monthsToEmergencyFund = Infinity; // cannot build emergency fund
      }


      /** NET GROWTH RATE */
      const netGrowthRate = Number(((data.incomeGrowth - data.inflation)).toFixed(1));

      setResult({
        yearlyBreakdown,
        futureSavings: last.futureSavings,
        inflationLoss: Number(inflationLoss.toFixed(2)),
        monthsOfExpenses,
        emergencyTarget: Math.round(emergencyTarget),
        monthsToEmergencyFund: monthsToEmergencyFund.toFixed(1),
        netGrowthRate,
        currentNetSavings: Math.round(income - expenses),
        financialHealth: calculateFinancialHealth(monthsOfExpenses, netGrowthRate, income, expenses),
        recommendation: generateRecommendation(monthsOfExpenses, netGrowthRate, inflationLoss, income, expenses),
      });


      showToast("Projection generated successfully!", "success");

    } catch (err) {
      console.log("Calculation error:", err);
      showToast("Error generating projection.", "error");
    } finally {
      setCalculationLoading(false);
    }
  };


  const calculateFinancialHealth = (monthsOfExpenses, growthRate, income, expenses) => {
    let score = 0;

    // Savings rate component (max 40 points)
    const savingsRate = (income - expenses) / income;
    score += Math.min(40, savingsRate * 100);

    // Growth rate component (max 30 points)
    if (growthRate > 2) score += 30;
    else if (growthRate > 0) score += 20;
    else if (growthRate > -2) score += 10;

    // Emergency fund component (max 30 points)
    if (monthsOfExpenses >= 6) score += 30;
    else if (monthsOfExpenses >= 3) score += 20;
    else if (monthsOfExpenses >= 1) score += 10;

    return Math.round(Math.min(100, score));
  };

  const generateRecommendation = (monthsOfExpenses, growthRate, inflationLoss, income, expenses) => {
    const recommendations = [];
    const savingsRate = (income - expenses) / income;

    if (monthsOfExpenses < 3) {
      recommendations.push("🚨 Build emergency fund to cover 3-6 months of expenses");
    } else if (monthsOfExpenses < 6) {
      recommendations.push("📈 Continue building emergency fund to 6 months coverage");
    }

    if (growthRate < 2) {
      recommendations.push("💡 Consider investments with returns above inflation rate");
    }

    if (inflationLoss > (income - expenses) * 0.1) {
      recommendations.push("🛡️ Protect savings from inflation with diversified investments");
    }

    if (data.incomeGrowth - data.inflation < 2) {
      recommendations.push("🎯 Focus on increasing income growth above inflation");
    }

    if (savingsRate < 0.2) {
      recommendations.push("💰 Improve savings rate by reducing expenses or increasing income");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Excellent financial health! Maintain your current strategy");
    }

    return recommendations;
  };

  // Professional components to replace charts

  // 1. Yearly Breakdown Table
  const YearlyBreakdownTable = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subtitle}>📊 Yearly Breakdown</Text>
        <TouchableOpacity onPress={showYearlyBreakdownTips} style={styles.infoIconTouchable}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Year</Text>
        <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>
          Future Monthly Income (+Growth)
        </Text>

        <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>
          Future Monthly Expenses (+Inflation)
        </Text>

        <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>
          Future Savings
        </Text>

      </View>

      <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
        {result.yearlyBreakdown.map((item, index) => (
          <View key={`year-${item.year}`} style={[
            styles.tableRow,
            index % 2 === 0 && styles.tableRowEven
          ]}>
            <Text style={[styles.tableCell, { flex: 1 }]}>Year {item.year}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>RM{item.futureIncome.toLocaleString()}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>RM{item.futureExpenses.toLocaleString()}</Text>
            <Text style={[
              styles.tableCell,
              { flex: 2, color: item.futureSavings >= 0 ? '#27ae60' : '#e74c3c' }
            ]}>
              RM{Math.abs(item.futureSavings).toLocaleString()}
              {item.futureSavings < 0 && " (Deficit)"}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // 2. Financial Health Meter
  const FinancialHealthMeter = ({ score }) => {
    let color, label;

    if (score >= 80) { color = "#27ae60"; label = "Excellent"; }
    else if (score >= 60) { color = "#3498db"; label = "Good"; }
    else if (score >= 40) { color = "#f39c12"; label = "Fair"; }
    else { color = "#e74c3c"; label = "Needs Improvement"; }

    return (
      <View style={styles.card}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthLabel}>Financial Health Score</Text>
          <TouchableOpacity onPress={showFinancialHealthTips} style={styles.infoIconTouchable}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
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
        <View style={styles.healthScoreRow}>
          <Text style={[styles.healthStatus, { color }]}>{label}</Text>
          <Text style={styles.healthScore}>{score}/100</Text>
        </View>
      </View>
    );
  };

  // 3. Key Metrics Card
  const KeyMetricsCard = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subtitle}>📈 Key Metrics</Text>
        <TouchableOpacity onPress={showKeyMetricsTips} style={styles.infoIconTouchable}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {result.netGrowthRate.toFixed(1)}%
          </Text>
          <Text style={styles.metricLabel}>Net Growth Rate</Text>
          <Text style={styles.metricDescription}>Income growth minus inflation</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {result.monthsOfExpenses}
          </Text>
          <Text style={styles.metricLabel}>Months Coverage</Text>
          <Text style={styles.metricDescription}>Emergency fund duration</Text>
        </View>
      </View>
    </View>
  );

  // 4. Savings Comparison Card
  const SavingsComparisonCard = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.subtitle}>💰 Savings Comparison</Text>
        <TouchableOpacity onPress={showSavingsComparisonTips} style={styles.infoIconTouchable}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Current Monthly Savings</Text>
          <Text style={styles.comparisonValue}>RM{result.currentNetSavings.toLocaleString()}</Text>
        </View>

        <View style={styles.comparisonArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>

        <View style={styles.comparisonItem}>
          <Text style={styles.comparisonLabel}>Future Monthly Savings</Text>
          <Text style={[
            styles.comparisonValue,
            result.futureSavings >= result.currentNetSavings ? styles.positiveValue : styles.negativeValue
          ]}>
            RM{Math.abs(result.futureSavings).toLocaleString()}
            {result.futureSavings < 0 && " (Deficit)"}
          </Text>
        </View>
      </View>

      <View style={styles.changeIndicator}>
        <Text style={[
          styles.changeText,
          result.futureSavings >= result.currentNetSavings ? styles.positiveValue : styles.negativeValue
        ]}>
          {result.futureSavings >= result.currentNetSavings ? '📈 Increase' : '📉 Decrease'}:
          RM{Math.abs(result.futureSavings - result.currentNetSavings).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  // 6. Formula Explanation Card (Short & Attractive)
  const FormulaExplanation = () => {
    if (!result || !result.yearlyBreakdown || result.yearlyBreakdown.length === 0) return null;

    const firstYear = result.yearlyBreakdown[0];
    const currentIncome = parseFloat(data.currentIncome) || 0;
    const currentExpenses = parseFloat(data.currentExpenses) || 0;

    return (
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.subtitle}>🧮 How Your Projection Is Calculated</Text>
        </View>

        <Text style={styles.formulaTitle}>📈 1. Future Income</Text>
        <Text style={styles.formulaText}>
          Monthly Income × (1 + Growth Rate)ⁿ
        </Text>
        <Text style={styles.formulaExample}>
          RM{currentIncome.toLocaleString()} → Year 1 at {data.incomeGrowth}% = RM{firstYear.futureIncome.toLocaleString()}
        </Text>

        <Text style={styles.formulaTitle}>💸 2. Future Expenses</Text>
        <Text style={styles.formulaText}>
          Monthly Expenses × (1 + Inflation Rate)ⁿ
        </Text>
        <Text style={styles.formulaExample}>
          RM{currentExpenses.toLocaleString()} → Year 1 at {data.inflation}% = RM{firstYear.futureExpenses.toLocaleString()}
        </Text>

        <Text style={styles.formulaTitle}>💰 3. Future Savings</Text>
        <Text style={styles.formulaText}>
          Future Income − Future Expenses
        </Text>
        <Text style={styles.formulaExample}>
          RM{firstYear.futureIncome.toLocaleString()} − RM{firstYear.futureExpenses.toLocaleString()} = RM{firstYear.futureSavings.toLocaleString()}
        </Text>

        <Text style={styles.formulaTitle}>🛡 4. Emergency Coverage</Text>
        <Text style={styles.formulaText}>
          (Income − Expenses) ÷ Expenses
        </Text>
        <Text style={styles.formulaFootnote}>
          Note: n represents the number of years into the future.
          {"\n"}For example:
          {"\n"}• Year 1 → n = 1
          {"\n"}• Year 5 → n = 5
          {"\n"}The table shows yearly compounding step by step, which is
          mathematically equivalent to applying (1 + rate)ⁿ directly.
        </Text>
      </View>
    );
  };

  // 7. Recommendations Card
  const RecommendationsCard = () => {
    if (!result) return null;   // prevent crash

    return (
      <View style={styles.recommendationCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.recommendationTitle}>💡 Recommendations</Text>
        </View>
        {result.recommendation.map((rec, index) => (
          <View key={`rec-${index}`} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>{rec}</Text>
          </View>
        ))}
      </View>
    );
  };

  // 8. Formula Diagram (Line Chart)
  const FormulaDiagram = () => {
    if (!result) return null;

    const labels = result.yearlyBreakdown.map(item => `Y${item.year}`);

      const sparseLabels = labels.map((l, i) =>
    i === 0 || i === labels.length - 1 || i % 2 === 0 ? l : ""
  );

    const incomeData = result.yearlyBreakdown.map(item => item.futureIncome);
    const expensesData = result.yearlyBreakdown.map(item => item.futureExpenses);
    const savingsData = result.yearlyBreakdown.map(item => item.futureSavings);
    const chartWidth = Math.max(
      screenWidth - 40,
      labels.length * 80
    );

    return (
      <View style={styles.card}>
        {/* Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.subtitle}>📉 Projection Diagram</Text>
          <TouchableOpacity onPress={showProjectionDiagramTips} style={styles.infoIconTouchable}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          {/* Line Chart */}
          <LineChart
            data={{
              labels: sparseLabels,
              datasets: [
                {
                  data: incomeData,
                  color: () => "#22c55e", // green
                  strokeWidth: 3,
                },
                {
                  data: expensesData,
                  color: () => "#ef4444", // red
                  strokeWidth: 3,
                },
                {
                  data: savingsData,
                  color: () => "#3b82f6", // blue
                  strokeWidth: 2,
                },
              ],
              legend: ["Income", "Expenses", "Savings"],
            }}
            width={chartWidth}
            height={260}
            withDots={true}
            withShadow={false}
            withInnerLines={false}
            fromZero={true}
            segments={4}
            showDataPointLabel={false}
            chartConfig={{
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: () => "#374151",
              labelColor: () => "#6b7280",
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#ffffff",
              },
            }}
            style={{
              borderRadius: 16,
              alignSelf: "center",
            }}
          />
        </ScrollView>


        {/* Explanation */}
        <Text style={styles.chartExplanation}>
          {"\n"}• <Text style={{ color: "#22c55e", fontWeight: "700" }}>Income</Text> grows each year
          {"\n"}• <Text style={{ color: "#ef4444", fontWeight: "700" }}>Expenses</Text> rise due to inflation
          {"\n"}• <Text style={{ color: "#3b82f6", fontWeight: "700" }}>Savings</Text> show if you're improving or falling
        </Text>
      </View>
    );
  };



  return (
    <View style={styles.container}>
      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Calculator Card */}
        <Animated.View style={{ transform: [{ translateX: cardShakeAnim }] }}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.title}>📈 Future Prediction Calculator</Text>
              <TouchableOpacity onPress={showFuturePredictionCalculatorTips} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputColumn}>
                <Text style={styles.label}>
                  Current Monthly Income (RM)
                </Text>
                <TextInput
                  style={[styles.input, incomeError ? styles.inputError : null]}
                  keyboardType="numeric"
                  value={data.currentIncome === "" ? "" : String(data.currentIncome)}
                  onChangeText={updateCurrentIncome}
                  placeholder={data.currentIncome ? String(data.currentIncome) : "0"}
                  placeholderTextColor={"#c5c5c5ff"}
                  editable={!calculationLoading}
                />
                {incomeError ? <Text style={styles.errorText}>{incomeError}</Text> : null}
              </View>

              <View style={styles.inputColumn}>
                <Text style={styles.label}>
                  Current Monthly Expenses (RM)
                </Text>
                <TextInput
                  style={[styles.input, expensesError ? styles.inputError : null]}
                  keyboardType="numeric"
                  value={data.currentExpenses}
                  onChangeText={updateCurrentExpenses}
                  placeholder={data.currentExpenses ? String(data.currentExpenses) : "0"}
                  placeholderTextColor={"#c5c5c5ff"}
                  editable={!calculationLoading}
                />

                {expensesError ? <Text style={styles.errorText}>{expensesError}</Text> : null}
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputColumn}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Income Growth Rate ({incomeGrowthSource === "auto" ? "Auto - System" : "Manual"})</Text>
                </View>

                {incomeGrowthCustom ? (
                  <TextInput
                    style={[styles.input, incomeGrowthError ? styles.inputError : null]}
                    keyboardType="numeric"
                    value={data.incomeGrowth === "" ? "" : String(data.incomeGrowth)}
                    onChangeText={(value) => {
                      const num = parseFloat(value);
                      setData(prev => ({ ...prev, incomeGrowth: isNaN(num) ? 0 : num }));
                      if (incomeGrowthError) setIncomeGrowthError('');
                    }}
                    placeholder="Enter custom rate (%)"
                    placeholderTextColor={"#c5c5c5ff"}
                    editable={!calculationLoading}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setIncomeGrowthModalVisible(true)}
                    disabled={calculationLoading}
                  >
                    <Text style={styles.dropdownButtonText}>{data.incomeGrowth}%</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                )}
                {incomeGrowthError ? <Text style={styles.errorText}>{incomeGrowthError}</Text> : null}
              </View>

              <View style={styles.inputColumn}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Inflation Rate ({inflationSource === "auto" ? "Auto - System" : "Manual"})</Text>
                </View>

                {inflationCustom ? (
                  <TextInput
                    style={[styles.input, inflationError ? styles.inputError : null]}
                    keyboardType="numeric"
                    value={data.inflation === "" ? "" : String(data.inflation)}
                    onChangeText={(value) => {
                      const num = parseFloat(value);
                      setData(prev => ({ ...prev, inflation: isNaN(num) ? 0 : num }));
                      if (inflationError) setInflationError('');
                    }}
                    placeholder="Enter custom rate (%)"
                    placeholderTextColor={"#c5c5c5ff"}
                    editable={!calculationLoading}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setInflationModalVisible(true)}
                    disabled={calculationLoading}
                  >
                    <Text style={styles.dropdownButtonText}>{data.inflation}%</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                )}
                {inflationError ? <Text style={styles.errorText}>{inflationError}</Text> : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Projection Timeline (Years)
              </Text>
              <TextInput
                style={[styles.input, yearsError ? styles.inputError : null]}
                keyboardType="numeric"
                value={data.years === "" ? "" : String(data.years)}
                onChangeText={updateYears}
                placeholder="Enter number of years"
                placeholderTextColor={"#c5c5c5ff"}
                editable={!calculationLoading}
              />
              {yearsError ? <Text style={styles.errorText}>{yearsError}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.button, calculationLoading && styles.buttonDisabled]}
              onPress={calculateProjection}
              disabled={calculationLoading}
            >
              {calculationLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Generate Projection</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {result && (
          <>
            {/* Key Metrics */}
            <KeyMetricsCard />

            {/* Financial Health Overview */}
            <FinancialHealthMeter score={result.financialHealth} />

            <>
              {/* Savings Comparison */}
              <SavingsComparisonCard />
              <FormulaDiagram />
              {/* Yearly Breakdown */}
              <YearlyBreakdownTable />
            </>
            {/* AI Recommendations */}
            <FormulaExplanation />

          </>
        )}
        <RecommendationsCard />
      </ScrollView>

      {/* Loading Overlay */}
      {calculationLoading && (
        <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color="#8AD0AB" />
            <Text style={styles.loadingText}>Calculating your financial future...</Text>
          </MotiView>
        </BlurView>
      )}

      {/* Toast */}
      {toastVisible && (
        <MotiView
          from={{ opacity: 0, translateY: 80 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[
            styles.toastContainer,
            toastType === 'error' ? styles.toastError : styles.toastSuccess
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastVisible(false)}>
            <Text style={styles.toastClose}>✕</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* Income Growth Dropdown Modal */}
      <Modal
        visible={incomeGrowthModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIncomeGrowthModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownList}>
            <FlatList
              data={incomeGrowthPresets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => selectIncomeGrowth(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Inflation Dropdown Modal */}
      <Modal
        visible={inflationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInflationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownList}>
            <FlatList
              data={inflationRatePresets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => selectInflation(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontWeight: "600",
    fontSize: 14,
  },
  toastClose: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Validation Styles
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
    backgroundColor: '#FEF3F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  // Loading Overlay
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  loadingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#8AD0AB",
  },
  // Button disabled state
  buttonDisabled: {
    opacity: 0.6,
  },
  // Input styles
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  infoIconTouchable: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  infoIcon: {
    fontSize: 18,
    color: "#8AD0AB",
    fontWeight: "bold",
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  dropdownButtonText: {
    fontSize: 14,
    color: "#2c3e50",
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '80%',
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#a2ddbdff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  dropdownItemTextActive: {
    color: "#007938ff",
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inputColumn: {
    flex: 1,
    marginHorizontal: 3,
  },
  inputGroup: {
    marginBottom: 16,
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
    backgroundColor: "#8AD0AB",
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
    alignItems: "center",
    shadowColor: "#8AD0AB",
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
  // Metrics styles
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4CAF50",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#2c3e50",
    fontWeight: "600",
    textAlign: "center",
  },
  metricDescription: {
    fontSize: 10,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 2,
  },
  // Health meter styles
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
  healthScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  healthScore: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ecf0f1",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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
  // Comparison styles
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comparisonItem: {
    flex: 1,
    alignItems: "center",
  },
  comparisonArrow: {
    paddingHorizontal: 10,
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
  },
  arrowText: {
    fontSize: 20,
    color: "#7f8c8d",
  },
  changeIndicator: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    alignItems: "center",
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  positiveValue: {
    color: "#27ae60",
  },
  negativeValue: {
    color: "#e74c3c",
  },
  // Table styles
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderText: {
    fontWeight: "700",
    color: "#2c3e50",
  },
  tableScroll: {
    maxHeight: 200,
  },
  tableRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  tableRowEven: {
    backgroundColor: "#f8f9fa",
  },
  tableCell: {
    fontSize: 12,
    color: "#2c3e50",
    textAlign: "center",
  },
  // Risk assessment styles
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
  },
  riskOptimal: {
    fontSize: 11,
    color: "#7f8c8d",
  },
  // Recommendation styles
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
  formulaTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    color: "#2c3e50",
  },

  formulaText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#34495e",
    marginTop: 4,
  },

  formulaExample: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
  },

  formulaFootnote: {
    fontSize: 11,
    color: "#7f8c8d",
    marginTop: 12,
    fontStyle: "italic",
  },
});