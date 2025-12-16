// ExpenseAnalysis.js - Fix month display issue
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import AppHeader from "../../reuseComponet/header.js";
import { getExpensesLocal } from "../../../database/SQLite.js";
import { useUser } from "../../reuseComponet/UserContext.js";
import { expandPeriodicExpenses } from "./expandPeriodic.js"
import { useTipManager } from "../TutorialModule/TipManager";
import FinancialTipBanner from "../TutorialModule/FinancialTipBanner";
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.4,
        marginRight: 8,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
      },
      active
        ? { backgroundColor: "#10B98120", borderColor: "#10B981" }
        : { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" }
    ]}
  >
    <Text
      style={[
        {
          fontSize: 13,
          fontWeight: "600",
        },
        active ? { color: "#059669" } : { color: "#374151" }
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);


// round to 2 decimals
const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// color palette generator (cycles)
const generateColor = (index) => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA500", "#6A5ACD",
    "#FF9F1C", "#2EC4B6", "#E71D36", "#011627", "#9B5DE5",
    "#00BBF9", "#00F5D4", "#F15BB5", "#FEE440", "#333533"
  ];
  return colors[index % colors.length];
};

// stable color mapping

const CATEGORY_COLORS = {};
const getStableColor = (category) => {
  if (!CATEGORY_COLORS[category]) {
    const keys = Object.keys(CATEGORY_COLORS);
    CATEGORY_COLORS[category] = generateColor(keys.length);
  }
  return CATEGORY_COLORS[category];
};


// basic detection to treat some categories as income
const isIncomeCategory = (category) => {
  if (!category) return false;
  const incomeKeywords = ['income', 'salary', 'revenue', 'earnings', 'paycheck', 'wage'];
  return incomeKeywords.some(keyword =>
    category.toLowerCase().includes(keyword.toLowerCase())
  );
};

const getAvailableYears = (expenses) => {
  const years = new Set();
  expenses.forEach(exp => {
    if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;
    const y = new Date(exp.date).getFullYear();
    years.add(y);
  });
  return Array.from(years).sort();
};

// Display helpers for UI
const getDisplayMonth = (month) => {
  if (month === "THIS_MONTH") return "This Month";
  if (month === "LAST_MONTH") return "Last Month";
  if (month === "LAST_3") return "Last 3 Months";
  if (month === null || month === undefined || month === "All") return "All Months";
  return month; // for actual month names like "May 2025"
};

const getDisplayCategory = (category) => {
  if (category === "All") return "All Categories";
  return category;
};


const computeNiceYAxis = (maxValue) => {
  if (!maxValue || maxValue <= 0) {
    return { yMax: 100, ticks: [0, 20, 40, 60, 80, 100] };
  }

  // Common financial chart intervals
  const steps = [20, 50, 100, 200, 250, 500, 1000];

  let step = 20;

  // Find a scale interval that allows us to divide maxValue into <=5 segments
  for (let s of steps) {
    if (maxValue / s <= 5) {
      step = s;
      break;
    }
  }

  // **Always round up, never down**
  const yMax = Math.ceil(maxValue / step) * step;

  // 6 yTicks (0 to yMax)
  const ticks = [];
  for (let i = 0; i <= 5; i++) {
    ticks.push(Math.round((yMax / 5) * i));
  }

  return { yMax, ticks };
};


const groupExpensesByMonth = (expenses, selectedMonth = null) => {
  const grouped = {};

  expenses.forEach(exp => {
    // skip incomes
    if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;

    const dateObj = new Date(exp.date);
    if (isNaN(dateObj)) return;

    const monthKey = dateObj.toLocaleString("en-US", { month: "short" }) + " " + dateObj.getFullYear();

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        year: dateObj.getFullYear(),
        monthIndex: dateObj.getMonth(),
        dateObj: dateObj,
        data: {}
      };
    }

    const category = exp.tag || "Other";
    grouped[monthKey].data[category] = (grouped[monthKey].data[category] || 0) + exp.amount;
  });

  // if selectedMonth provided and not "All", filter down
  if (selectedMonth && selectedMonth !== "All") {
    const [monthName, yearStr] = selectedMonth.split(" ");
    const date = new Date(`${monthName} 1, ${yearStr}`);
    const monthKey = date.toLocaleString("en-US", { month: "short" }) + " " + date.getFullYear();
    if (grouped[monthKey]) {
      return { [monthKey]: grouped[monthKey] };
    }
    // if no data for that month, return a zero entry for consistency
    const empty = {
      month: monthKey,
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      dateObj: date,
      data: {}
    };
    return { [monthKey]: empty };
  }

  // Return all months with data, sorted by date
  const keys = Object.keys(grouped).sort((a, b) => new Date(grouped[a].dateObj) - new Date(grouped[b].dateObj));
  const result = {};
  keys.forEach(k => { result[k] = grouped[k]; });
  return result;
};

// Generate last 12 months including current month
const generateLast12Months = () => {
  const months = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear();
    months.push({ key: label, dateObj: d });
  }
  return months.reverse(); // oldest → newest
};


/* -------------------------
   Financial data helpers
   ------------------------- */
const getIncomeExpenseData = (expenses) => {
  let totalIncome = 0;
  let totalExpenses = 0;

  expenses.forEach(exp => {
    if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) totalIncome += exp.amount;
    else totalExpenses += exp.amount;
  });

  return [
    { name: "Income", population: roundToTwo(totalIncome), color: "#57C0A1", legendFontColor: "#374151", legendFontSize: 12 },
    { name: "Expenses", population: roundToTwo(totalExpenses), color: "#E5E7EB", legendFontColor: "#374151", legendFontSize: 12 },
  ];
};

const getCategoryFinancialData = (filteredExpenses, selectedCategory) => {
  // CASE 1: All Categories → show full breakdown
  if (selectedCategory === "All") {
    const map = {};

    filteredExpenses.forEach(exp => {
      const cat = exp.tag || "Other";
      map[cat] = (map[cat] || 0) + exp.amount;
    });

    return Object.keys(map)
      .map(cat => ({
        name: cat,
        population: roundToTwo(map[cat]),
        color: getStableColor(cat),   // ✅ FIXED
        legendFontColor: "#374151",
        legendFontSize: 12,
      }))
      .filter(item => item.population > 0)
      .sort((a, b) => b.population - a.population);  // ✅ sorted
  }

  // CASE 2: One Category → selected vs others
  let selectedTotal = 0;

  filteredExpenses.forEach(exp => {
    if (exp.tag === selectedCategory) selectedTotal += exp.amount;
  });

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const other = total - selectedTotal;

  return [
    {
      name: selectedCategory,
      population: roundToTwo(selectedTotal),
      color: getStableColor(selectedCategory),
      legendFontColor: "#374151",
      legendFontSize: 12,
    },
    {
      name: "Other Expenses",
      population: roundToTwo(other),
      color: "#E5E7EB",
      legendFontColor: "#374151",
      legendFontSize: 12,
    }
  ];
};

const getFinancialHealthInsight = (trendData) => {
  if (!trendData || !trendData.datasets || trendData.datasets.length < 2) {
    return null;
  }

  const incomeArr = trendData.datasets[0].data.map(v => v || 0);
  const expenseArr = trendData.datasets[1].data.map(v => v || 0);

  const totalIncome = incomeArr.reduce((s, v) => s + v, 0);
  const totalExpense = expenseArr.reduce((s, v) => s + v, 0);

  // No activity
  if (totalIncome === 0 && totalExpense === 0) {
    return {
      label: "No Activity",
      message: "No income or expense records were found for the selected period.",
      color: "#6B7280",
    };
  }

  const netBalance = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Recent trend (last 3 months)
  const recentIncome = incomeArr.slice(-3).reduce((s, v) => s + v, 0);
  const recentExpense = expenseArr.slice(-3).reduce((s, v) => s + v, 0);
  const recentNet = recentIncome - recentExpense;

  // ---------- Insight logic ----------

  // Strong & stable
  if (netBalance > 0 && savingsRate >= 20 && recentNet >= 0) {
    return {
      label: "Healthy",
      message: `Your yearly income exceeded expenses by RM${netBalance.toFixed(0)}, with a savings rate of ${savingsRate.toFixed(
        1
      )}%. Recent spending remains stable.`,
      color: "#10B981",
    };
  }

  // Positive but thin margin
  if (netBalance > 0 && savingsRate >= 5) {
    return {
      label: "Moderate",
      message: `You maintained a positive yearly balance of RM${netBalance.toFixed(
        0
      )}, but the savings rate (${savingsRate.toFixed(
        1
      )}%) is relatively small.`,
      color: "#F59E0B",
    };
  }

  // Break-even
  if (Math.abs(netBalance) < totalIncome * 0.05) {
    return {
      label: "Break-even",
      message: `Income and expenses are nearly balanced for the year (difference ≈ RM${netBalance.toFixed(
        0
      )}), leaving limited room for savings.`,
      color: "#F59E0B",
    };
  }

  // Overspending
  if (netBalance < 0) {
    return {
      label: "Overspending",
      message: `Expenses exceeded income by RM${Math.abs(
        netBalance
      ).toFixed(0)} over the year, which may affect long-term financial stability.`,
      color: "#EF4444",
    };
  }

  // Fallback
  return {
    label: "Uncertain",
    message:
      "The financial pattern shows fluctuations that require closer monitoring.",
    color: "#6B7280",
  };
};


const getRecentTransactions = (expenses) => {
  const today = new Date();

  // 1. get ALL installments (including future)
  const allInstallments = expenses.filter(exp =>
    exp.isExpanded === true &&
    !(exp.typeLabel === "income" || isIncomeCategory(exp.tag))
  );

  // 2. group by originalId
  const groups = {};
  allInstallments.forEach(exp => {
    const id = exp.originalId || exp.id;
    if (!groups[id]) groups[id] = [];
    groups[id].push(exp);
  });

  // 3. build summaries
  const summaries = Object.values(groups).map(list => {
    const sorted = list.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalMonths = sorted.length;
    const pastMonths = sorted.filter(e => new Date(e.date) <= today).length;
    const remaining = totalMonths - pastMonths;

    const first = sorted[0];

    const nextDate =
      remaining > 0
        ? new Date(sorted[pastMonths]?.date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
        : "Completed";

    return {
      name: first.payee || first.tag,
      monthlyAmount: roundToTwo(first.amount),
      totalMonths,
      remaining,
      nextDate,
      startDate: new Date(first.date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
      })
    };

  });

  return summaries;
};

const refreshMonthsForYear = (expenses, selectedYear) => {
  if (selectedYear === "All") return getAvailableMonths(expenses);

  const list = [];
  expenses.forEach(exp => {
    if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;

    const d = new Date(exp.date);
    if (d.getFullYear() !== selectedYear) return;

    const key = d.toLocaleString("en-US", { month: "long" }) + " " + selectedYear;
    if (!list.includes(key)) list.push(key);
  });

  return list.sort((a, b) => new Date(a) - new Date(b));
};


const getAvailableMonths = (expenses) => {
  const set = new Set();
  expenses.forEach(exp => {
    const d = new Date(exp.date);
    if (isNaN(d)) return;
    const month = d.toLocaleString("en-US", { month: "long" });
    set.add(`${month} ${d.getFullYear()}`);
  });
  return Array.from(set).sort((a, b) => new Date(a) - new Date(b));
};

// get expense categories sorted by total amount
const getExpenseCategories = (expenses) => {
  const map = {};
  expenses.forEach(exp => {
    if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;
    const cat = exp.tag || "Other";
    map[cat] = (map[cat] || 0) + exp.amount;
  });
  return Object.keys(map).map(k => ({ category: k, amount: map[k] })).sort((a, b) => b.amount - a.amount);
};


/* -------------------------
   Spend insights helper
   ------------------------- */
const calculateSpendingInsights = (barData, totalPerMonth) => {
  if (!barData || !barData.datasets || !totalPerMonth) return null;

  const categoryTotals = barData.datasets.map((ds, index) => ({
    category: barData.legend[index],
    total: roundToTwo(ds.data.reduce((s, v) => s + v, 0)),
    color: ds.color ? ds.color(1) : '#CCCCCC'
  })).sort((a, b) => b.total - a.total);

  const totalSpending = roundToTwo(categoryTotals.reduce((s, it) => s + it.total, 0));

  let trendInsight = null;
  if (totalPerMonth.length > 1) {
    const latest = totalPerMonth[totalPerMonth.length - 1];
    const prev = totalPerMonth[totalPerMonth.length - 2];
    const absChange = roundToTwo(latest - prev);

    if (prev > 0 && prev >= 20) {
      const changePct = roundToTwo((absChange / prev) * 100);
      const capped = Math.min(Math.max(changePct, -100), 200);
      if (Math.abs(capped) > 5) {
        trendInsight = { change: capped, absoluteChange: absChange, isIncrease: capped > 0, latestMonth: barData.labels[barData.labels.length - 1], previousMonth: barData.labels[barData.labels.length - 2], type: 'percentage' };
      }
    } else if (Math.abs(absChange) >= 10) {
      trendInsight = { absoluteChange: absChange, isIncrease: absChange > 0, latestMonth: barData.labels[barData.labels.length - 1], previousMonth: barData.labels[barData.labels.length - 2], type: 'absolute' };
    }
  }

  return { topCategory: categoryTotals[0], totalSpending, trendInsight, categoryTotals };
};

/* -------------------------
   React component
   ------------------------- */
export default function AnalysisDashboard({ navigation }) {
  // state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [barData, setBarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState({
    essential: [],
    nonessential: [],
    others: []
  });

  const [availableMonths, setAvailableMonths] = useState([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [categoryInsights, setCategoryInsights] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [lineTrendData, setLineTrendData] = useState(null);

  // Collapsible sections
  const [yearExpanded, setYearExpanded] = useState(true);
  const [monthExpanded, setMonthExpanded] = useState(true);
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  // Category show more/less
  const [showAllCategories, setShowAllCategories] = useState(false);


  const { userId, userLevel } = useUser();
  const { currentTip, isTipVisible, showTip, hideTip } = useTipManager(userLevel);

  // refs for synchronized scrolling
  const monthScrollRef = useRef(null);
  const chartScrollRef = useRef(null);
  const isSyncingRef = useRef(false);
  useEffect(() => {
    if (allExpenses.length > 0) {
      const months = refreshMonthsForYear(allExpenses, selectedYear);
      setAvailableMonths(months);

      const currentYear = new Date().getFullYear();

      if (selectedYear === currentYear) {
        setSelectedMonth("THIS_MONTH");
      } else {
        setSelectedMonth(null); // force user to choose month
      }
    }
  }, [selectedYear, allExpenses]);


  // load expenses once
  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      try {
        let expenses = await getExpensesLocal(userId);
        if (!expenses) expenses = [];

        expenses = expandPeriodicExpenses(expenses);

        setAllExpenses(expenses);

        if (!expenses || expenses.length === 0) {
          setBarData(null);
          setIncomeExpenseData([]);
          setRecentTransactions([]);
          setAvailableMonths([]);
          setAllCategories([]);
          setLoading(false);
          return;
        }

        // Group categories based on essentialityLabel from DB
        const essential = new Set();
        const nonessential = new Set();
        const others = new Set();

        expenses.forEach(exp => {
          if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) return;

          const cat = exp.tag || "Other";

          if (exp.essentialityLabel === 1) essential.add(cat);
          else if (exp.essentialityLabel === 0) nonessential.add(cat);
          else others.add(cat);
        });

        setAllCategories({
          essential: Array.from(essential),
          nonessential: Array.from(nonessential),
          others: Array.from(others)
        });


        const years = getAvailableYears(expenses);
        setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
        const months = getAvailableMonths(expenses);
        setAvailableMonths(months);

        processData(expenses, "All", "All");
      } catch (err) {
        console.error("Error loading expenses:", err);
        setBarData(null);
        setIncomeExpenseData([]);
        setRecentTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, [userId]);

  // re-process when filters change
  useEffect(() => {
    if (allExpenses && allExpenses.length > 0) {
      processData(allExpenses, selectedCategory, selectedMonth);
    }
  }, [selectedCategory, selectedMonth, selectedYear, allExpenses]);


  // processData: builds barData, pie, legend, insights
  const processData = (expenses, category, month) => {
    // Filter for bar chart (all months in selected year, by category)
    const filteredForBar = getFilteredExpenses(expenses, category, "All", selectedYear);

    // Filter for pie chart and insights (selected period)
    const filtered = getFilteredExpenses(expenses, category, month, selectedYear);

    // ---------------------------
    // 2. Always build last 12 months range (for the bar chart)
    // ---------------------------
    const monthRange = generateLast12Months();
    const labels = monthRange.map(m => m.key);

    // Group all expenses by month for lookup (only expenses, not incomes)
    const grouped = groupExpensesByMonth(filtered);

    // ---------------------------
    // 3. Compute totals for each of the 12 months (safe)
    // ---------------------------
    const monthlyTotals = monthRange.map(m => {
      const monthObj = grouped[m.key];
      if (!monthObj || !monthObj.data) return 0;
      const vals = Object.values(monthObj.data ?? {});
      return roundToTwo(vals.reduce((s, v) => s + v, 0));
    });

    // ---------------------------
    // 4. Compute nice Y-axis values
    // ---------------------------
    const maxMonthlyValue = Math.max(...monthlyTotals, 0);
    const { yMax, ticks } = computeNiceYAxis(maxMonthlyValue);

    // ---------------------------
    // 5. Build BarChart dataset (single dataset: monthly totals)
    // ---------------------------
    const datasets = [
      {
        data: monthlyTotals,
        color: () => "#000",
      }
    ];

    const barDataObj = {
      labels,
      datasets,
      monthlyTotals,
      maxTotal: yMax,
      yTicks: ticks,
      segments: 5,
      yAxisInterval: Math.round(yMax / 5),
      legend: ["Total Spending"],
      colors: ["#000"],
    };

    const trend = getMonthlyIncomeExpenseTrend(expenses);

    const lineData = {
      labels: trend.map(t => t.label),
      datasets: [
        {
          data: trend.map(t => t.income),
          color: () => "#10B981", // green → income
          strokeWidth: 3,
        },
        {
          data: trend.map(t => t.expense),
          color: () => "#EF4444", // red → expense
          strokeWidth: 3,
        },
      ],
      legend: ["Income", "Expenses"],
    };

    setLineTrendData(lineData);


    // ---------------------------
    // 6. Pie Chart — must use BOTH selected month AND selected year
    //    (Pie should show exactly the filtered records for the chosen Year/Month/Category)
    // ---------------------------
    const filteredForPie = getFilteredExpenses(expenses, "All", month, selectedYear);
    const pie = getCategoryFinancialData(filteredForPie, category);
    setIncomeExpenseData(pie);

    // Recent transactions: show from full (unfiltered) expenses or you can restrict — keep original behaviour (all)
    const recent = getRecentTransactions(expenses);
    setRecentTransactions(recent);

    // categoryInsights: only when a specific category is selected
    const cInsights = getCategoryInsights(expenses, category);
    setCategoryInsights(cInsights);

    // finally set barData
    setBarData(barDataObj);
  };



  // small helper used by UI when specific category selected
  const getCategoryInsights = (expenses, selectedCategory) => {
    if (selectedCategory === "All") return null;
    const items = expenses.filter(e => (e.typeLabel !== "income" && !isIncomeCategory(e.tag) && e.tag === selectedCategory));
    const total = items.reduce((s, it) => s + it.amount, 0);
    const count = items.length;
    const avg = count > 0 ? total / count : 0;
    const top = items.sort((a, b) => b.amount - a.amount).slice(0, 3);
    return { totalSpent: roundToTwo(total), transactionCount: count, averageTransaction: roundToTwo(avg), topTransactions: top.map(t => ({ ...t, amount: roundToTwo(t.amount) })) };
  };

  const getMonthlyIncomeExpenseTrend = (expenses) => {
    const months = generateLast12Months();

    return months.map(m => {
      let income = 0;
      let expense = 0;

      expenses.forEach(exp => {
        const d = new Date(exp.date);
        if (
          d.getMonth() === m.dateObj.getMonth() &&
          d.getFullYear() === m.dateObj.getFullYear()
        ) {
          if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) {
            income += exp.amount;
          } else {
            expense += exp.amount;
          }
        }
      });

      return {
        label: m.key,
        income: roundToTwo(income),
        expense: roundToTwo(expense),
      };
    });
  };



  // Filter expenses by category, month (incl. shortcuts) and year (safe and stable)
  const getFilteredExpenses = (expenses, selectedCategory, selectedMonth, selectedYear) => {
    return expenses.filter(exp => {
      // Skip income records when building expense charts
      if (exp.typeLabel === "income" || isIncomeCategory(exp.tag)) {
        return false;
      }

      // Year filter (if provided)
      if (selectedYear) {
        const expYear = new Date(exp.date).getFullYear();
        if (expYear !== selectedYear) return false;
      }

      // Category filter
      if (selectedCategory !== "All" && exp.tag !== selectedCategory) {
        return false;
      }

      // Month filter with shortcuts (applies AFTER year filter)
      if (selectedMonth && selectedMonth !== "All") {
        const expDate = new Date(exp.date);
        const expKey = expDate.toLocaleString("en-US", { month: "long" }) + " " + expDate.getFullYear();

        const now = new Date();

        if (selectedMonth === "THIS_MONTH") {
          const thisKey = now.toLocaleString("en-US", { month: "long" }) + " " + now.getFullYear();
          if (expKey !== thisKey) return false;
        } else if (selectedMonth === "LAST_MONTH") {
          const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastKey = last.toLocaleString("en-US", { month: "long" }) + " " + last.getFullYear();
          if (expKey !== lastKey) return false;
        } else if (selectedMonth === "LAST_3") {
          const keys = [];
          for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const k = d.toLocaleString("en-US", { month: "long" }) + " " + d.getFullYear();
            keys.push(k);
          }
          if (!keys.includes(expKey)) return false;
        } else {
          // normal month selection string like "May 2024"
          if (expKey !== selectedMonth) return false;
        }
      }

      return true;
    });
  };


  /* -------------------------
     Sync scroll handlers:
     When user scrolls month summary, scroll chart; and vice versa.
     We avoid infinite loops via isSyncingRef flag.
     ------------------------- */
  const onMonthScroll = useCallback((e) => {
    if (isSyncingRef.current) return;
    const x = e.nativeEvent.contentOffset.x;
    isSyncingRef.current = true;
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollTo({ x, animated: false });
    }
    // small debounce to release
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  }, []);

  const onChartScroll = useCallback((e) => {
    if (isSyncingRef.current) return;
    const x = e.nativeEvent.contentOffset.x;
    isSyncingRef.current = true;
    if (monthScrollRef.current) {
      monthScrollRef.current.scrollTo({ x, animated: false });
    }
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  }, []);

  /* -------------------------
     UI Render
     ------------------------- */
  const totalPerMonth = barData?.monthlyTotals || [];

  const spendingInsights = calculateSpendingInsights(barData, totalPerMonth);

  return (
    <View style={styles.container}>
      <FinancialTipBanner
        message={currentTip}
        isVisible={isTipVisible}
        onClose={hideTip}
        userLevel={userLevel}
      />

      <AppHeader title="Financial Analysis" showLeftButton={true} onLeftPress={() => navigation.goBack()} showBell={false} showProfile={false} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Filter Section */}
        <View style={styles.filterSection}>
          {/* Active Filter Summary */}
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Filters: {(() => {
                const filters = [];
                if (selectedYear !== new Date().getFullYear()) filters.push(selectedYear.toString());
                if (selectedMonth !== null && selectedMonth !== "All") filters.push(getDisplayMonth(selectedMonth));
                if (selectedCategory !== "All") filters.push(getDisplayCategory(selectedCategory));
                return filters.length > 0 ? filters.join(" • ") : "All Data";
              })()}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Filters</Text>

          {/* SECTION: Year */}
          <View style={styles.filterBlock}>
            <TouchableOpacity
              style={styles.filterHeader}
              onPress={() => setYearExpanded(!yearExpanded)}
            >
              <Text style={styles.blockLabel}>Year</Text>
              <Text style={styles.expandIcon}>{yearExpanded ? "▼" : "▶"}</Text>
            </TouchableOpacity>
            {yearExpanded && (
              <View style={styles.dropdownContainer}>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={styles.dropdown}
                >
                  {availableYears.map((y, i) => (
                    <Picker.Item key={i} label={y.toString()} value={y} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* SECTION: Month */}
          <View style={styles.filterBlock}>
            <TouchableOpacity
              style={styles.filterHeader}
              onPress={() => setMonthExpanded(!monthExpanded)}
            >
              <Text style={styles.blockLabel}>Month</Text>
              <Text style={styles.expandIcon}>{monthExpanded ? "▼" : "▶"}</Text>
            </TouchableOpacity>
            {monthExpanded && (
              <>
                {/* CHIP ROW */}
                <View style={styles.chipRow}>
                  {/* SHORTCUT CHIPS */}
                  <Chip
                    label="This Month"
                    active={selectedMonth === "THIS_MONTH"}
                    onPress={() =>
                      setSelectedMonth(selectedMonth === "THIS_MONTH" ? null : "THIS_MONTH")
                    }
                  />

                  <Chip
                    label="Last Month"
                    active={selectedMonth === "LAST_MONTH"}
                    onPress={() =>
                      setSelectedMonth(selectedMonth === "LAST_MONTH" ? null : "LAST_MONTH")
                    }
                  />

                  <Chip
                    label="Last 3 Months"
                    active={selectedMonth === "LAST_3"}
                    onPress={() =>
                      setSelectedMonth(selectedMonth === "LAST_3" ? null : "LAST_3")
                    }
                  />

                  {/* MONTH DROPDOWN - only show if no shortcut active */}
                  {selectedMonth !== "THIS_MONTH" && selectedMonth !== "LAST_MONTH" && selectedMonth !== "LAST_3" && (
                    <View style={[styles.dropdownContainer, { marginTop: 8, width: '100%' }]}>
                      <Picker
                        selectedValue={selectedMonth}
                        onValueChange={(value) => setSelectedMonth(value)}
                        style={styles.dropdown}
                      >
                        <Picker.Item label="All Months" value={null} />
                        {availableMonths.map((m, i) => (
                          <Picker.Item key={i} label={m} value={m} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>


          {/* SECTION: Category */}
          <View style={styles.filterBlock}>
            <TouchableOpacity
              style={styles.filterHeader}
              onPress={() => setCategoryExpanded(!categoryExpanded)}
            >
              <Text style={styles.blockLabel}>Category</Text>
              <Text style={styles.expandIcon}>{categoryExpanded ? "▼" : "▶"}</Text>
            </TouchableOpacity>
            {categoryExpanded && (
              <>
                {/* Essential */}
                {allCategories.essential.length > 0 && (
                  <Text style={styles.chipGroupLabel}>Essential</Text>
                )}
                <View style={styles.chipRow}>
                  {allCategories.essential.slice(0, showAllCategories ? allCategories.essential.length : 5).map((cat, i) => (
                    <Chip
                      key={`e-${i}`}
                      label={cat}
                      active={selectedCategory === cat}
                      onPress={() =>
                        setSelectedCategory(selectedCategory === cat ? "All" : cat)
                      }
                    />
                  ))}
                </View>

                {/* Non-essential */}
                {allCategories.nonessential.length > 0 && (
                  <Text style={styles.chipGroupLabel}>Non-essential</Text>
                )}
                <View style={styles.chipRow}>
                  {allCategories.nonessential.slice(0, showAllCategories ? allCategories.nonessential.length : 5).map((cat, i) => (
                    <Chip
                      key={`n-${i}`}
                      label={cat}
                      active={selectedCategory === cat}
                      onPress={() =>
                        setSelectedCategory(selectedCategory === cat ? "All" : cat)
                      }
                    />
                  ))}
                </View>

                {/* Others */}
                {allCategories.others.length > 0 && (
                  <Text style={styles.chipGroupLabel}>Others</Text>
                )}
                <View style={styles.chipRow}>
                  {allCategories.others.slice(0, showAllCategories ? allCategories.others.length : 5).map((cat, i) => (
                    <Chip
                      key={`o-${i}`}
                      label={cat}
                      active={selectedCategory === cat}
                      onPress={() =>
                        setSelectedCategory(selectedCategory === cat ? "All" : cat)
                      }
                    />
                  ))}
                </View>

                {/* Show More/Less Toggle */}
                {(allCategories.essential.length > 5 || allCategories.nonessential.length > 5 || allCategories.others.length > 5) && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setShowAllCategories(!showAllCategories)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllCategories ? "Show Less" : "Show More"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>


          {/* Reset Filters - only show when filters differ from defaults */}
          {(selectedCategory !== "All" || selectedYear !== new Date().getFullYear() || selectedMonth !== null) && (
            <TouchableOpacity
              style={styles.resetFiltersButton}
              onPress={() => {
                const currentYear = new Date().getFullYear();
                setSelectedCategory("All");
                setSelectedYear(currentYear);
                setSelectedMonth(null);
              }}
            >
              <Text style={styles.resetFiltersText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Financial Overview (Pie + legend) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{selectedCategory === "All" ? "Financial Overview" : `${selectedCategory} Analysis`}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {selectedCategory === "All" ? `${getDisplayMonth(selectedMonth)} • ${selectedYear}` : `Deep dive into ${selectedCategory}`}
            </Text>
          </View>

          {loading ? <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
            : incomeExpenseData.length > 0 ? (
              <View style={styles.enhancedPieContainer}>
                <PieChart
                  data={incomeExpenseData}
                  width={Math.min(screenWidth - 60, 320)}
                  height={220}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="65"
                  center={[0, 0]}
                  absolute
                  hasLegend={false}
                  chartConfig={{
                    color: () => `rgba(0,0,0, 0.8)`,
                  }}
                  style={{}}
                />

                <View style={styles.pieLegendContainer}>
                  {incomeExpenseData.map((item, idx) => {
                    const total = incomeExpenseData.reduce((s, d) => s + d.population, 0);
                    const pct = total > 0 ? ((item.population / total) * 100).toFixed(1) : 0;
                    return (
                      <View key={idx} style={styles.pieLegendRow}>
                        <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                        <View style={styles.pieLegendInfo}>
                          <Text style={styles.pieLegendLabel}>{item.name}</Text>
                          <View style={styles.pieLegendDetails}>
                            <Text style={styles.pieLegendAmount}>RM{item.population.toLocaleString()}</Text>
                            <Text style={styles.pieLegendPercentage}>({pct}%)</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {selectedCategory === "All" && (
                    <View style={styles.totalSpendingContainer}>
                      <Text style={styles.totalSpendingLabel}>Total Expenses</Text>
                      <Text style={styles.totalSpendingValue}>
                        RM{incomeExpenseData.filter(i => i.name !== "Income").reduce((s, it) => s + it.population, 0).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : <Text style={styles.noDataText}>No financial data available</Text>}
        </View>

        {/* Monthly Spend Analysis */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{selectedCategory === "All" ? "Monthly Spending" : `${selectedCategory} Trend`}</Text>
              <TouchableOpacity onPress={() => showTip('expenseAnalysis', 'monthlySpending')} style={styles.infoIconTouchable}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>{selectedCategory === "All" ? "Last months overview" : `${selectedCategory} monthly trend`}</Text>
          </View>

          {loading ? <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
            : barData && barData.datasets && barData.datasets.length > 0 ? (
              <>
                {/* If single month, show simplified breakdown */}
                {barData.labels.length === 1 ? (
                  <View style={styles.singleMonthContainer}>
                    <Text style={styles.singleMonthValue}>RM{barData.monthlyTotals[0]?.toFixed(2)}</Text>
                    <Text style={styles.singleMonthLabel}>Total for {barData.labels[0]}</Text>
                    {selectedCategory === "All" && (
                      <View style={styles.categoryBreakdown}>
                        <View style={styles.breakdownHeader}>
                          <Text style={styles.breakdownTitle}>Spending Breakdown:</Text>
                          <TouchableOpacity onPress={() => showTip('expenseAnalysis', 'spendingBreakdown')} style={styles.infoIconTouchable}>
                            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                        {barData.legend.map((category, idx) => {
                          const value = barData.datasets[idx]?.data[0] || 0;
                          const color = barData.datasets[idx]?.color ? barData.datasets[idx].color(1) : generateColor(idx);
                          if (value > 0) {
                            const pct = barData.monthlyTotals[0] > 0 ? ((value / barData.monthlyTotals[0]) * 100).toFixed(1) : 0;
                            return (
                              <View key={idx} style={styles.categoryItem}>
                                <View style={[styles.categoryDot, { backgroundColor: color }]} />
                                <Text style={styles.categoryText} numberOfLines={1}>{category.length > 12 ? category.substring(0, 12) + '...' : category}</Text>
                                <View style={styles.categoryValueContainer}>
                                  <Text style={styles.categoryValue}>RM{value.toFixed(2)}</Text>
                                  <Text style={styles.categoryPercentage}>({pct}%)</Text>
                                </View>
                              </View>
                            );
                          }
                          return null;
                        })}
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    {/* Month summary horizontal - this scroll syncs with the chart below */}
                    <ScrollView
                      horizontal
                      ref={monthScrollRef}
                      showsHorizontalScrollIndicator={false}
                      style={styles.monthlySummaryScroll}
                      contentContainerStyle={styles.monthlySummaryContent}
                      onScroll={onMonthScroll}
                      scrollEventThrottle={16}
                    >
                      {barData.labels.map((m, i) => {
                        const currentTotal = barData.monthlyTotals[i];
                        const prevTotal = i > 0 ? barData.monthlyTotals[i - 1] : null;
                        let trendDisplay = null;

                        // ---- Improved trend logic ----
                        // 1) detect single-month mode → no trend
                        const isSingleMonthMode =
                          selectedMonth === "THIS_MONTH" ||
                          selectedMonth === "LAST_MONTH" ||
                          (
                            selectedMonth &&
                            selectedMonth !== "LAST_3" &&
                            selectedMonth !== "All" &&
                            !selectedMonth.startsWith("LAST_")
                          );

                        // If single month mode: ONLY show month + amount (NO trend)
                        if (isSingleMonthMode) {
                          return (
                            <View key={i} style={styles.monthSummaryItem}>
                              <Text style={styles.monthLabel}>{m}</Text>
                              <Text style={styles.monthTotal}>
                                RM{barData.monthlyTotals[i]?.toFixed(0)}
                              </Text>
                              {/* No trend */}
                            </View>
                          );
                        }

                        // 2) multi-month comparison mode → compute trend

                        // no trend if both zero
                        if (prevTotal === 0 && currentTotal === 0) {
                          trendDisplay = null;
                        } else if (prevTotal !== null) {
                          const diff = currentTotal - prevTotal;
                          const absDiff = Math.abs(diff);

                          // case A: percent-based trend (when prev ≥ 20)
                          if (prevTotal >= 20) {
                            let pct = (diff / prevTotal) * 100;
                            pct = Math.max(-100, Math.min(200, pct)); // clamp

                            if (Math.abs(pct) >= 5) {
                              const arrow = diff > 0 ? "↑" : "↓";
                              const color = diff > 0 ? "#EF4444" : "#10B981";
                              trendDisplay = (
                                <Text style={[styles.trendText, { color }]}>
                                  {arrow}{Math.abs(pct).toFixed(0)}%
                                </Text>
                              );
                            }
                          } else {
                            // case B: prev small → show RM absolute difference only if meaningful
                            if (absDiff >= 10) {
                              const arrow = diff > 0 ? "↑" : "↓";
                              const color = diff > 0 ? "#EF4444" : "#10B981";
                              trendDisplay = (
                                <Text style={[styles.trendText, { color }]}>
                                  {arrow}RM{absDiff.toFixed(0)}
                                </Text>
                              );
                            }
                          }
                        }

                        // render item with trend
                        return (
                          <View key={i} style={styles.monthSummaryItem}>
                            <Text style={styles.monthLabel}>{m}</Text>
                            <Text style={styles.monthTotal}>
                              RM{currentTotal.toFixed(0)}
                            </Text>
                            {trendDisplay}
                          </View>
                        );

                        // -------------------------------

                        return (
                          <View key={i} style={styles.monthSummaryItem}>
                            <Text style={styles.monthLabel}>{m}</Text>
                            <Text style={styles.monthTotal}>RM{barData.monthlyTotals[i]?.toFixed(0)}</Text>
                            {trendDisplay}
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Chart area: horizontal scroll synchronized with month summary */}
                    <View style={styles.chartScrollContainer}>
                      <View style={{ flexDirection: "row" }}>

                        {/* RIGHT: Scrollable chart */}
                        <ScrollView
                          horizontal
                          ref={chartScrollRef}
                          showsHorizontalScrollIndicator={true}
                          style={styles.chartScrollView}
                          onScroll={onChartScroll}
                          scrollEventThrottle={16}
                        >
                          <View style={[styles.chartInnerContainer, { minWidth: Math.max(screenWidth - 40, barData.labels.length * 80) }]}>
                            <BarChart
                              data={barData}
                              width={Math.max(screenWidth - 40, barData.labels.length * 80)}
                              height={260}
                              fromZero={true}
                              yAxisLabel=""
                              withInnerLines={true}
                              withHorizontalLabels={true}   // ← we KEEP this OFF
                              withVerticalLabels={true}
                              segments={5}
                              chartConfig={{
                                backgroundColor: "#ffffff",
                                backgroundGradientFrom: "#ffffff",
                                backgroundGradientTo: "#ffffff",
                                decimalPlaces: 0,
                                color: () => "#000",
                                labelColor: () => "#6B7280",
                                propsForBackgroundLines: { stroke: "#E5E7EB", strokeDasharray: "4" },
                                barRadius: 6,
                              }}
                              style={styles.barStyle}
                            />
                          </View>
                        </ScrollView>

                      </View>
                    </View>

                  </>
                )}
              </>
            ) : <Text style={styles.noDataText}>No spending data available yet</Text>}
        </View>

        {/* Top Category Transactions (if viewing a specific category) */}
        {selectedCategory !== "All" && categoryInsights && categoryInsights.topTransactions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Transactions</Text>
              <Text style={styles.cardSubtitle}>{selectedMonth === "All" ? `${barData?.labels?.length || 0} months overview` : `Selected month comparison`}</Text>
            </View>
            {categoryInsights.topTransactions.map((t, idx) => (
              <View key={idx} style={styles.largeTransactionRow}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionName} numberOfLines={1}>{t.payee}</Text>
                  <Text style={styles.transactionDate}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
                <Text style={styles.largeTransactionAmount}>RM{t.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {lineTrendData && (
          <View style={[styles.card, { paddingTop: 16 }]}>

            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Income vs Expenses</Text>
                <TouchableOpacity onPress={() => showTip('expenseAnalysis', 'incomeVsExpenses')} style={styles.infoIconTouchable}>
                  <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardSubtitle}>
                Monthly financial health overview
              </Text>
            </View>

            {/* Chart */}
            <View style={styles.chartScrollContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.chartScrollView}
              >
                <View
                  style={[
                    styles.chartInnerContainer,
                    { minWidth: Math.max(screenWidth - 40, lineTrendData.labels.length * 80) }
                  ]}
                >
                  <LineChart
                    data={lineTrendData}
                    width={Math.max(screenWidth - 40, lineTrendData.labels.length * 80)}
                    height={220}
                    fromZero
                    withDots
                    bezier
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: () => "#374151",
                      labelColor: () => "#6B7280",
                      propsForDots: { r: "4" },
                    }}
                    style={{ borderRadius: 12, marginTop: 8 }}
                  />
                </View>
              </ScrollView>
            </View>

            {/* Feedback text (next section) */}
            {(() => {
              const insight = getFinancialHealthInsight(lineTrendData);
              if (!insight) return null;

              return (
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: insight.color }}>
                    Financial Status: {insight.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#4B5563", marginTop: 4 }}>
                    {insight.message}
                  </Text>
                </View>
              );
            })()}

          </View>
        )}




        {/* Recent Transactions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{selectedCategory === "All" ? "Installment Overview" : `Recent ${selectedCategory}`}</Text>
            <Text style={styles.cardSubtitle}>Your ongoing monthly commitments</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#57C0A1" style={styles.loader} />
          ) : recentTransactions.length > 0 ? (
            recentTransactions.map((item, idx) => (
              <View key={idx} style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB"
              }}>

                {/* Name */}
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1F2937" }}>
                  {item.name}
                </Text>

                {/* Monthly Amount */}
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#EF4444", marginTop: 4 }}>
                  RM{item.monthlyAmount}
                </Text>

                {/* Summary Row */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Total: {item.totalMonths} months
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Remaining: {item.remaining}
                  </Text>
                </View>

                {/* Start Date */}
                <Text style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>
                  Start date: {item.startDate}
                </Text>

                {/* Next deduction */}
                <Text style={{ fontSize: 12, color: "#374151", marginTop: 8 }}>
                  Next prorated month: {item.nextDate}
                </Text>

              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No installment commitments</Text>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------
   Styles (kept mostly same but cleaned)
   ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  filterSection: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  filterGroup: { flex: 1 },
  filterLabel: { fontSize: 14, fontWeight: "600", color: "#4B5563", marginBottom: 8 },
  dropdownContainer: { backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  dropdown: {
    height: 52,
    paddingHorizontal: 12,
    color: "#111827",
    fontSize: 15,
  },
  clearFilterButton: { backgroundColor: "#EF4444", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginTop: 12 },
  clearFilterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  filterTip: { fontSize: 12, color: "#6B7280", marginTop: 4, fontStyle: 'italic' },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2, marginTop: 16 },
  cardHeader: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  cardSubtitle: { color: "#6B7280", fontSize: 13, fontWeight: '500' },
  loader: { marginVertical: 20 },

  enhancedPieContainer: { backgroundColor: "#ffffff", paddingVertical: 10, borderRadius: 16, alignItems: "center", marginVertical: 10, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },

  pieLegendContainer: { marginTop: 10, width: "90%", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12 },
  pieLegendRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  pieLegendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  pieLegendLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  pieLegendDetails: { flexDirection: 'row', alignItems: 'center' },
  pieLegendAmount: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  pieLegendPercentage: { fontSize: 12, color: '#6B7280', marginLeft: 4 },

  singleMonthContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  singleMonthValue: { fontSize: 32, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  singleMonthLabel: { fontSize: 16, color: '#6B7280', fontWeight: '500' },

  monthlySummaryScroll: { marginBottom: 16 },
  monthlySummaryContent: { paddingHorizontal: 8, minWidth: '100%' },
  monthSummaryItem: { alignItems: 'center', paddingHorizontal: 12, minWidth: 80 },
  monthLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  monthTotal: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  trendText: { fontSize: 10, fontWeight: '700' },

  chartScrollContainer: { marginTop: 10, backgroundColor: "#ffffff", borderRadius: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, alignItems: "flex-start" },
  chartScrollView: { width: '100%' },
  chartInnerContainer: { minWidth: '100%' },
  barStyle: { borderRadius: 12, marginTop: 8 },

  barLegendContainer: { width: "95%", marginTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  barLegendItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F9FAFB', borderRadius: 8, marginRight: 8, minWidth: 120 },
  barLegendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  barLegendText: { fontSize: 12, fontWeight: "600", color: "#4B5563", marginRight: 6, flexShrink: 1 },
  barLegendValue: { fontSize: 11, fontWeight: '700', color: '#1F2937' },

  transactionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  largeTransactionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  transactionLeft: { flex: 1, marginRight: 12 },
  transactionName: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  transactionDate: { fontSize: 12, color: "#6B7280" },
  transactionAmount: { fontSize: 14, fontWeight: "700", minWidth: 85, textAlign: 'right' },
  largeTransactionAmount: { fontSize: 15, fontWeight: "700", color: "#EF4444", minWidth: 85, textAlign: 'right' },

  categoryBreakdown: { width: '100%', maxWidth: 280, marginTop: 16 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 8 },
  categoryDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  categoryText: { flex: 1, fontSize: 14, color: '#4B5563', fontWeight: '500', marginRight: 10 },
  categoryValue: { fontSize: 14, fontWeight: '600', color: '#1F2937', minWidth: 80, textAlign: 'right' },
  categoryPercentage: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  noDataText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, paddingVertical: 24, fontStyle: "italic" },

  totalSpendingContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalSpendingLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  totalSpendingValue: { fontSize: 16, fontWeight: '700', color: '#EF4444' },

  breakdownTitle: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 12, textAlign: 'center' },
  categoryValueContainer: { alignItems: 'flex-end' },

  filterBlock: {
    marginBottom: 18,
  },

  blockLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",   // darker for emphasis
    marginBottom: 0,
  },

  dropdownContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",  // slightly darker for better contrast
    overflow: "hidden",
    marginTop: 4,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  chipGroupLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },

  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  showMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },

  showMoreText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },

  resetFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  resetFiltersText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  infoIconTouchable: {
    padding: 4,
  },

  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

});